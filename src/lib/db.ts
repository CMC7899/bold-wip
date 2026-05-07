// IndexedDB Data Layer
// All data models and CRUD operations

export type WeatherType = 'Sunny' | 'Rainy' | 'Cloudy' | 'Windy' | 'Fog'
export type SyncStatus = 'pending' | 'synced' | 'failed'
export type ProjectStatus = 'active' | 'completed' | 'on_hold'
export type ZoneType = 'BIPV' | 'STANDARD'

export interface ActivityTemplate {
  id: string
  zoneType: ZoneType
  sequence: number
  name: string
  msTaskId: string
}

export interface ZoneConfig {
  id: string
  projectId: string
  zoneCode: string
  zoneType: ZoneType
  msTaskId: string
  activities: ActivityTemplate[]
}

export interface ResourceTemplate {
  id: string
  projectId: string
  type: 'MANPOWER' | 'MACHINERY'
  roleName: string
  msResourceId: string
}

export interface Project {
  id: string
  name: string
  client: string
  contractor: string
  siteLocation: string
  msProjectId: string
  msProjectUrl: string
  startDate: string
  expectedEndDate: string
  zones: ZoneConfig[]
  resourceTemplates: ResourceTemplate[]
  status: ProjectStatus
  createdAt: string
}

export interface ManpowerLog {
  resourceTemplateId: string
  roleName: string
  quantity: number
}

export interface MachineryLog {
  resourceTemplateId: string
  equipmentName: string
  quantity: number
}

export interface ActivityProgress {
  activityId: string
  activityName: string
  percentComplete: number
}

export interface ZoneProgress {
  zoneConfigId: string
  zoneCode: string
  activities: ActivityProgress[]
}

export interface DailyReport {
  id: string
  projectId: string
  reportDate: string
  reportNo: string
  weatherAm: WeatherType
  weatherPm: WeatherType
  workStart: string
  workEnd: string
  stopWorkTime?: string
  resumeWorkTime?: string
  manpowerLog: ManpowerLog[]
  machineryLog: MachineryLog[]
  zoneProgress: ZoneProgress[]
  remarks: string
  plannedActivities: string
  exceptions: string
  preparedBy: string
  submittedAt: string
  syncStatus: SyncStatus
  photos?: ReportPhoto[]
  isDraft?: boolean
}

export interface ReportPhoto {
  id: string
  reportId: string
  dataUrl: string
  caption: string
  takenAt: string
}

const DB_NAME = 'BoltIndustriesDB'
const DB_VERSION = 2

let dbInstance: IDBDatabase | null = null
let _upgraded = false

export async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Projects store
      if (!db.objectStoreNames.contains('projects')) {
        const projectStore = db.createObjectStore('projects', { keyPath: 'id' })
        projectStore.createIndex('status', 'status', { unique: false })
        projectStore.createIndex('createdAt', 'createdAt', { unique: false })
      }

      // Daily reports store
      if (!db.objectStoreNames.contains('dailyReports')) {
        const reportStore = db.createObjectStore('dailyReports', { keyPath: 'id' })
        reportStore.createIndex('projectId', 'projectId', { unique: false })
        reportStore.createIndex('reportDate', 'reportDate', { unique: false })
        reportStore.createIndex('syncStatus', 'syncStatus', { unique: false })
        reportStore.createIndex('projectDate', ['projectId', 'reportDate'], { unique: false })
      }

      // Draft reports store
      if (!db.objectStoreNames.contains('drafts')) {
        const draftStore = db.createObjectStore('drafts', { keyPath: 'id' })
        draftStore.createIndex('projectId', 'projectId', { unique: false })
      }

      // Photos store
      if (!db.objectStoreNames.contains('photos')) {
        const photoStore = db.createObjectStore('photos', { keyPath: 'id' })
        photoStore.createIndex('reportId', 'reportId', { unique: false })
      }

      // Migration: backfill remarks/plannedActivities/exceptions for existing reports
      if (!_upgraded) {
        _upgraded = true
        request.onsuccess = (ev) => {
          const db2 = (ev.target as IDBOpenDBRequest).result
          try {
            const store = txStore(db2, 'dailyReports', 'readonly')
            const allReq = store.getAll()
            allReq.onsuccess = () => {
              const allReports: DailyReport[] = allReq.result || []
              if (!allReports.length) return
              const migrateTx = db2.transaction('dailyReports', 'readwrite')
              const migrateStore = migrateTx.objectStore('dailyReports')
              for (const r of allReports) {
                migrateStore.put({
                  ...r,
                  remarks:           r.remarks           || '',
                  plannedActivities: r.plannedActivities  || '',
                  exceptions:        r.exceptions         || '',
                })
              }
            }
          } catch { /* ignore migration errors */ }
        }
      }
    }

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result
      resolve(dbInstance)
    }

    request.onerror = () => reject(request.error)
  })
}

// Generic helpers
function txStore(db: IDBDatabase, storeName: string, mode: IDBTransactionMode) {
  return db.transaction(storeName, mode).objectStore(storeName)
}

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ─── Project CRUD ─────────────────────────────────────────────────────────────

export async function createProject(project: Project): Promise<void> {
  const db = await getDB()
  await promisify(txStore(db, 'projects', 'readwrite').put(project))
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await getDB()
  return promisify(txStore(db, 'projects', 'readonly').get(id))
}

export async function getAllProjects(): Promise<Project[]> {
  const db = await getDB()
  return promisify(txStore(db, 'projects', 'readonly').getAll())
}

export async function updateProject(project: Project): Promise<void> {
  const db = await getDB()
  await promisify(txStore(db, 'projects', 'readwrite').put(project))
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB()
  await promisify(txStore(db, 'projects', 'readwrite').delete(id))
}

// ─── Daily Report CRUD ────────────────────────────────────────────────────────

export async function saveReport(report: DailyReport): Promise<void> {
  const db = await getDB()
  await promisify(txStore(db, 'dailyReports', 'readwrite').put(report))
}

export async function getReport(id: string): Promise<DailyReport | undefined> {
  const db = await getDB()
  return promisify(txStore(db, 'dailyReports', 'readonly').get(id))
}

export async function getReportsByProject(projectId: string): Promise<DailyReport[]> {
  const db = await getDB()
  const store = txStore(db, 'dailyReports', 'readonly')
  const index = store.index('projectId')
  const results: DailyReport[] = await promisify(index.getAll(projectId))
  return results.sort((a, b) => a.reportDate.localeCompare(b.reportDate))
}

export async function getReportsByProjectDesc(projectId: string): Promise<DailyReport[]> {
  const db = await getDB()
  const store = txStore(db, 'dailyReports', 'readonly')
  const index = store.index('projectId')
  const results: DailyReport[] = await promisify(index.getAll(projectId))
  return results.sort((a, b) => b.reportDate.localeCompare(a.reportDate))
}

export async function getAllReports(): Promise<DailyReport[]> {
  const db = await getDB()
  return promisify(txStore(db, 'dailyReports', 'readonly').getAll())
}

export async function deleteReport(id: string): Promise<void> {
  const db = await getDB()
  await promisify(txStore(db, 'dailyReports', 'readwrite').delete(id))
}

// ─── Draft CRUD ───────────────────────────────────────────────────────────────

export async function saveDraft(draft: Partial<DailyReport> & { id: string }): Promise<void> {
  const db = await getDB()
  await promisify(txStore(db, 'drafts', 'readwrite').put({ ...draft, isDraft: true }))
}

export async function getDraft(id: string): Promise<Partial<DailyReport> | undefined> {
  const db = await getDB()
  return promisify(txStore(db, 'drafts', 'readonly').get(id))
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await getDB()
  await promisify(txStore(db, 'drafts', 'readwrite').delete(id))
}

// ─── Photos CRUD ──────────────────────────────────────────────────────────────

export async function savePhoto(photo: ReportPhoto): Promise<void> {
  const db = await getDB()
  await promisify(txStore(db, 'photos', 'readwrite').put(photo))
}

export async function getPhotosByReport(reportId: string): Promise<ReportPhoto[]> {
  const db = await getDB()
  const store = txStore(db, 'photos', 'readonly')
  const index = store.index('reportId')
  return promisify(index.getAll(reportId))
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await getDB()
  await promisify(txStore(db, 'photos', 'readwrite').delete(id))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export async function generateReportNo(projectId: string, date: string): Promise<string> {
  const db = await getDB()
  const store = txStore(db, 'dailyReports', 'readonly')
  const index = store.index('projectId')
  const results: DailyReport[] = await promisify(index.getAll(projectId))
  const sameDay = results.filter(r => r.reportDate === date && !r.isDraft)
  const seq = (sameDay.length + 1).toString().padStart(3, '0')
  return `DR-${date.replace(/-/g, '')}-${seq}`
}

// ─── Predefined Activities ────────────────────────────────────────────────────

export const BIPV_ACTIVITIES: Omit<ActivityTemplate, 'id' | 'msTaskId'>[] = [
  { zoneType: 'BIPV', sequence: 1,  name: 'Removal Lamp Post' },
  { zoneType: 'BIPV', sequence: 2,  name: 'BIPV Footing Marking' },
  { zoneType: 'BIPV', sequence: 3,  name: 'Bar Reinforcement' },
  { zoneType: 'BIPV', sequence: 4,  name: 'Concreting' },
  { zoneType: 'BIPV', sequence: 5,  name: 'Carport Structure' },
  { zoneType: 'BIPV', sequence: 6,  name: 'Mounting Structure' },
  { zoneType: 'BIPV', sequence: 7,  name: 'PV Modules' },
  { zoneType: 'BIPV', sequence: 8,  name: 'Laying DC Cables' },
  { zoneType: 'BIPV', sequence: 9,  name: 'Inverter Installation' },
  { zoneType: 'BIPV', sequence: 10, name: 'Parking Lights' },
  { zoneType: 'BIPV', sequence: 11, name: 'Drainage' },
  { zoneType: 'BIPV', sequence: 12, name: 'Curb' },
  { zoneType: 'BIPV', sequence: 13, name: 'Gutter / RWDP' },
]

export const STANDARD_ACTIVITIES: Omit<ActivityTemplate, 'id' | 'msTaskId'>[] = [
  { zoneType: 'STANDARD', sequence: 1, name: 'Removal Lamp Post/Trees' },
  { zoneType: 'STANDARD', sequence: 2, name: 'Footing Marking' },
  { zoneType: 'STANDARD', sequence: 3, name: 'Bar Reinforcement' },
  { zoneType: 'STANDARD', sequence: 4, name: 'Concreting' },
  { zoneType: 'STANDARD', sequence: 5, name: 'Carport Structure' },
  { zoneType: 'STANDARD', sequence: 6, name: 'Roofing' },
  { zoneType: 'STANDARD', sequence: 7, name: 'Parking Lights' },
  { zoneType: 'STANDARD', sequence: 8, name: 'Curb / Premix' },
  { zoneType: 'STANDARD', sequence: 9, name: 'Gutter / RWDP' },
]

export function getActivitiesForZoneType(zoneType: ZoneType): ActivityTemplate[] {
  const list = zoneType === 'BIPV' ? BIPV_ACTIVITIES : STANDARD_ACTIVITIES
  return list.map(a => ({ ...a, id: generateId(), msTaskId: '' }))
}

// ─── Compute project overall progress ─────────────────────────────────────────

export interface CumulativeProgressMap {
  [zoneConfigId: string]: {
    [activityId: string]: number
  }
}

export function computeCumulativeProgressMap(reports: DailyReport[]): CumulativeProgressMap {
  const submitted = reports.filter(r => !r.isDraft)
  const map: CumulativeProgressMap = {}
  for (const r of submitted) {
    for (const zp of (r.zoneProgress || [])) {
      if (!map[zp.zoneConfigId]) map[zp.zoneConfigId] = {}
      for (const act of (zp.activities || [])) {
        const key = act.activityId
        const pct = act.percentComplete || 0
        if (!map[zp.zoneConfigId][key] || pct > map[zp.zoneConfigId][key]) {
          map[zp.zoneConfigId][key] = pct
        }
      }
    }
  }
  return map
}

export async function computeProjectProgress(projectId: string): Promise<number> {
  const reports = await getReportsByProject(projectId)
  if (reports.length === 0) return 0
  const cumulative = computeCumulativeProgressMap(reports)
  let total = 0, count = 0
  for (const zoneActs of Object.values(cumulative)) {
    for (const pct of Object.values(zoneActs)) {
      total += pct; count++
    }
  }
  return count === 0 ? 0 : Math.round(total / count)
}
