// MS Project Online Sync Service
// Handles all communication with Microsoft Project Online via REST API

export interface MsProjectConfig {
  pwaUrl: string
  projectId: string
  accessToken: string
}

interface RequestDigest {
  value: string
  expiresAt: number
}

const digestCache = new Map<string, RequestDigest>()

async function getRequestDigest(pwaUrl: string, token: string): Promise<string> {
  const cached = digestCache.get(pwaUrl)
  if (cached && Date.now() < cached.expiresAt) return cached.value

  const res = await fetch(`${pwaUrl}/_api/contextinfo`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json;odata=verbose',
    },
  })
  if (!res.ok) throw new Error(`Failed to get digest: ${res.status}`)
  const data = await res.json()
  const digest: RequestDigest = {
    value: data.d?.GetContextWebInformation?.FormDigestValue || '',
    expiresAt: Date.now() + 25 * 60 * 1000, // 25 min
  }
  digestCache.set(pwaUrl, digest)
  return digest.value
}

async function msRequest<T>(
  cfg: MsProjectConfig,
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: object
): Promise<T> {
  const url = `${cfg.pwaUrl}/_api/ProjectServer/${path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${cfg.accessToken}`,
    Accept: 'application/json;odata=verbose',
    'Content-Type': 'application/json;odata=verbose',
  }
  if (method !== 'GET') {
    headers['X-RequestDigest'] = await getRequestDigest(cfg.pwaUrl, cfg.accessToken)
    if (method === 'PATCH') headers['X-HTTP-Method'] = 'MERGE'
    headers['IF-MATCH'] = '*'
  }
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`MS Project API error ${res.status}: ${err}`)
  }
  if (res.status === 204) return {} as T
  return res.json()
}

export class MsProjectSyncService {
  constructor(private cfg: MsProjectConfig) {}

  async createSummaryTask(zoneCode: string): Promise<string> {
    const data = await msRequest<any>(
      this.cfg,
      `Projects('${this.cfg.projectId}')/Draft/Tasks`,
      'POST',
      { '__metadata': { type: 'PS.DraftTask' }, TaskName: zoneCode, TaskIsSummary: true }
    )
    await this.checkIn()
    return data?.d?.Id || ''
  }

  async createChildTask(parentTaskId: string, activityName: string): Promise<string> {
    const data = await msRequest<any>(
      this.cfg,
      `Projects('${this.cfg.projectId}')/Draft/Tasks`,
      'POST',
      { '__metadata': { type: 'PS.DraftTask' }, TaskName: activityName, TaskParentId: parentTaskId }
    )
    return data?.d?.Id || ''
  }

  async updateTaskProgress(taskId: string, percent: number): Promise<void> {
    await msRequest<void>(
      this.cfg,
      `Projects('${this.cfg.projectId}')/Draft/Tasks('${taskId}')`,
      'PATCH',
      { '__metadata': { type: 'PS.DraftTask' }, TaskPercentCompleted: percent }
    )
  }

  async createResource(resourceName: string, type: 'MANPOWER' | 'MACHINERY'): Promise<string> {
    // type 1 = Work (people), type 2 = Material (equipment)
    const resourceType = type === 'MANPOWER' ? 1 : 2
    const data = await msRequest<any>(
      this.cfg,
      'EnterpriseResources',
      'POST',
      { '__metadata': { type: 'PS.EnterpriseResource' }, ResourceName: resourceName, ResourceType: resourceType }
    )
    return data?.d?.Id || ''
  }

  async assignResource(taskId: string, resourceId: string, units: number): Promise<void> {
    await msRequest<void>(
      this.cfg,
      `Projects('${this.cfg.projectId}')/Draft/Assignments`,
      'POST',
      { '__metadata': { type: 'PS.DraftAssignment' }, TaskId: taskId, ResourceId: resourceId, AssignmentUnits: units }
    )
  }

  async publishProject(): Promise<void> {
    await msRequest<void>(
      this.cfg,
      `Projects('${this.cfg.projectId}')/Draft/Publish(true)`,
      'POST'
    )
  }

  async checkIn(): Promise<void> {
    await msRequest<void>(
      this.cfg,
      `Projects('${this.cfg.projectId}')/Draft/CheckIn(true)`,
      'POST'
    )
  }

  async checkOut(): Promise<void> {
    await msRequest<void>(
      this.cfg,
      `Projects('${this.cfg.projectId}')/Draft/CheckOut()`,
      'POST'
    )
  }
}

// ─── Auth helpers (Azure AD) ──────────────────────────────────────────────────

export interface MsAuthConfig {
  tenantId: string
  clientId: string
  clientSecret?: string
  pwaUrl: string
}

export async function getAccessTokenClientCredentials(cfg: MsAuthConfig): Promise<string> {
  const scope = `${cfg.pwaUrl}/.default`
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret || '',
    scope,
  })
  const res = await fetch(`https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`)
  const data = await res.json()
  return data.access_token
}

// ─── Sync queue for offline support ──────────────────────────────────────────

export interface SyncQueueItem {
  id: string
  type: 'report_progress'
  reportId: string
  projectId: string
  payload: any
  createdAt: string
  attempts: number
}

const SYNC_QUEUE_KEY = 'bolt_sync_queue'

export function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'attempts'>): void {
  const queue = getSyncQueue()
  queue.push({ ...item, id: `sq-${Date.now()}`, createdAt: new Date().toISOString(), attempts: 0 })
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))
}

export function getSyncQueue(): SyncQueueItem[] {
  try {
    return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

export function removeSyncQueueItem(id: string): void {
  const queue = getSyncQueue().filter(i => i.id !== id)
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))
}
