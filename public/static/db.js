// ============================================================
// IndexedDB wrapper + helpers + predefined data
// ============================================================

const DB_NAME = 'BoltIndustriesDB'
const DB_VERSION = 2

export const DB = {
  _db: null,

  async init() {
    if (this._db) return this._db
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = (e) => {
        const db = e.target.result
        if (!db.objectStoreNames.contains('projects')) {
          const ps = db.createObjectStore('projects', { keyPath: 'id' })
          ps.createIndex('status', 'status', { unique: false })
          ps.createIndex('createdAt', 'createdAt', { unique: false })
        }
        if (!db.objectStoreNames.contains('dailyReports')) {
          const rs = db.createObjectStore('dailyReports', { keyPath: 'id' })
          rs.createIndex('projectId', 'projectId', { unique: false })
          rs.createIndex('reportDate', 'reportDate', { unique: false })
          rs.createIndex('syncStatus', 'syncStatus', { unique: false })
        }
        if (!db.objectStoreNames.contains('drafts')) {
          const ds = db.createObjectStore('drafts', { keyPath: 'id' })
          ds.createIndex('projectId', 'projectId', { unique: false })
        }
        if (!db.objectStoreNames.contains('photos')) {
          const phs = db.createObjectStore('photos', { keyPath: 'id' })
          phs.createIndex('reportId', 'reportId', { unique: false })
        }
      }
      req.onsuccess = (e) => { this._db = e.target.result; resolve(this._db) }
      req.onerror = () => reject(req.error)
    })
  },

  _p(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  },

  _store(name, mode = 'readonly') {
    return this._db.transaction(name, mode).objectStore(name)
  },

  // ── Projects ──────────────────────────────────────────────
  async putProject(p)      { return this._p(this._store('projects','readwrite').put(p)) },
  async getProject(id)     { return this._p(this._store('projects').get(id)) },
  async getAllProjects()    { return this._p(this._store('projects').getAll()) },
  async deleteProject(id)  { return this._p(this._store('projects','readwrite').delete(id)) },

  // ── Reports ───────────────────────────────────────────────
  async putReport(r)       { return this._p(this._store('dailyReports','readwrite').put(r)) },
  async getReport(id)      { return this._p(this._store('dailyReports').get(id)) },
  async getAllReports()     { return this._p(this._store('dailyReports').getAll()) },
  async getReportsByProject(pid) {
    const all = await this._p(this._store('dailyReports').index('projectId').getAll(pid))
    return all.sort((a, b) => a.reportDate.localeCompare(b.reportDate))
  },

  async getReportsByProjectDesc(pid) {
    const all = await this._p(this._store('dailyReports').index('projectId').getAll(pid))
    return all.sort((a, b) => b.reportDate.localeCompare(a.reportDate))
  },
  async deleteReport(id)   { return this._p(this._store('dailyReports','readwrite').delete(id)) },

  // ── Drafts ────────────────────────────────────────────────
  async putDraft(d)        { return this._p(this._store('drafts','readwrite').put(d)) },
  async getDraft(id)       { return this._p(this._store('drafts').get(id)) },
  async getAllDrafts()      { return this._p(this._store('drafts').getAll()) },
  async deleteDraft(id)    { return this._p(this._store('drafts','readwrite').delete(id)) },

  // ── Photos ────────────────────────────────────────────────
  async putPhoto(ph)       { return this._p(this._store('photos','readwrite').put(ph)) },
  async getPhotosByReport(rid) {
    return this._p(this._store('photos').index('reportId').getAll(rid))
  },
  async deletePhoto(id)    { return this._p(this._store('photos','readwrite').delete(id)) },
}

// ── ID generators ─────────────────────────────────────────────────────────────

/** Short local ID */
export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7)
}

/** RFC-4122 style mock GUID for MS Project Online fields */
export function genMockGuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

/** Check if MS Project Online is configured in localStorage */
export function isMsConfigured() {
  try {
    const cfg = JSON.parse(localStorage.getItem('bolt_ms_config') || '{}')
    return !!(cfg.tenantId && cfg.clientId && cfg.pwaUrl)
  } catch { return false }
}

/** Return mock sync metadata for demo mode */
export function mockSyncMeta() {
  return {
    msProjectId:  genMockGuid(),
    syncStatus:   'mock',
    syncedAt:     new Date().toISOString(),
    syncNote:     'Demo mode – mock ID assigned',
  }
}

// ── Report number ─────────────────────────────────────────────────────────────

export async function genReportNo(projectId, date) {
  const all = await DB._p(DB._store('dailyReports').index('projectId').getAll(projectId))
  const sameDay = all.filter(r => r.reportDate === date && !r.isDraft)
  const seq = String(sameDay.length + 1).padStart(3, '0')
  return `DR-${date.replace(/-/g, '')}-${seq}`
}

// ── Date helpers ──────────────────────────────────────────────────────────────

export function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export function formatDate(s) {
  if (!s) return '–'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

export function formatDateLong(s) {
  if (!s) return '–'
  try {
    return new Date(s + 'T00:00:00').toLocaleDateString('en-MY', {
      day: '2-digit', month: 'long', year: 'numeric'
    })
  } catch { return s }
}

// ── Display helpers ───────────────────────────────────────────────────────────

export function weatherEmoji(w) {
  return { Sunny: '☀️', Rainy: '🌧️', Cloudy: '⛅', Windy: '💨', Fog: '🌫️' }[w] || '🌤️'
}

export function statusColor(s) {
  return {
    active:    'text-emerald-700 bg-emerald-50 border-emerald-200',
    completed: 'text-blue-700 bg-blue-50 border-blue-200',
    on_hold:   'text-amber-700 bg-amber-50 border-amber-200',
    synced:    'text-emerald-700 bg-emerald-50 border-emerald-200',
    mock:      'text-purple-700 bg-purple-50 border-purple-200',
    pending:   'text-amber-700 bg-amber-50 border-amber-200',
    failed:    'text-red-700 bg-red-50 border-red-200',
  }[s] || 'text-gray-600 bg-gray-50 border-gray-200'
}

export function statusLabel(s) {
  return {
    active:    'Active',
    completed: 'Completed',
    on_hold:   'On Hold',
    synced:    'Synced',
    mock:      'Demo (Mock)',
    pending:   'Pending Sync',
    failed:    'Sync Failed',
  }[s] || (s || 'Unknown')
}

export function progressColor(pct) {
  if (pct >= 80) return '#10b981'
  if (pct >= 50) return '#3b82f6'
  if (pct >= 20) return '#f59e0b'
  return '#ef4444'
}

export async function computeProjectProgress(projectId) {
  const reports = await DB.getReportsByProject(projectId)
  if (!reports.length) return 0
  const cumulative = computeCumulativeProgressMap(reports)
  let total = 0, count = 0
  for (const zoneActs of Object.values(cumulative)) {
    for (const pct of Object.values(zoneActs)) {
      total += pct; count++
    }
  }
  return count ? Math.round(total / count) : 0
}

/**
 * Returns cumulative progress per activity across all submitted reports.
 * Keyed by zoneConfigId -> activityId -> percentComplete (max across reports).
 */
export function computeCumulativeProgressMap(reports) {
  const submitted = reports.filter(r => !r.isDraft)
  const map = {} // zoneConfigId -> activityId -> maxPercent
  for (const r of submitted) {
    for (const zp of (r.zoneProgress || [])) {
      if (!map[zp.zoneConfigId]) map[zp.zoneConfigId] = {}
      for (const act of (zp.activities || [])) {
        const key = act.activityId || act.id
        const pct = act.percentComplete || 0
        if (!map[zp.zoneConfigId][key] || pct > map[zp.zoneConfigId][key]) {
          map[zp.zoneConfigId][key] = pct
        }
      }
    }
  }
  return map
}

/**
 * Returns the zone progress from the most recent submitted (non-draft) report.
 * Used to pre-fill new report forms with the latest values.
 */
export function getLastReportProgress(reports) {
  const submitted = reports.filter(r => !r.isDraft && r.zoneProgress?.length)
  if (!submitted.length) return null
  return submitted[submitted.length - 1].zoneProgress || null
}

// ── Predefined activity lists ─────────────────────────────────────────────────

export const BIPV_ACTIVITIES = [
  'Removal Lamp Post',
  'BIPV Footing Marking',
  'Bar Reinforcement',
  'Concreting',
  'Carport Structure',
  'Mounting Structure',
  'PV Modules',
  'Laying DC Cables',
  'Inverter Installation',
  'Parking Lights',
  'Drainage',
  'Curb',
  'Gutter / RWDP',
]

export const STANDARD_ACTIVITIES = [
  'Removal Lamp Post/Trees',
  'Footing Marking',
  'Bar Reinforcement',
  'Concreting',
  'Carport Structure',
  'Roofing',
  'Parking Lights',
  'Curb / Premix',
  'Gutter / RWDP',
]

export function getActivities(zoneType) {
  const list = zoneType === 'BIPV' ? BIPV_ACTIVITIES : STANDARD_ACTIVITIES
  return list.map((name, i) => ({
    id:              genId(),
    name:            name,
    sequence:        i + 1,
    percentComplete: 0,
    msTaskId:        isMsConfigured() ? '' : genMockGuid(),
  }))
}
