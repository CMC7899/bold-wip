// ============================================================
// MS PROJECT ONLINE SYNC SERVICE
// Falls back to mock IDs when not configured
// ============================================================
import { isMsConfigured, genMockGuid } from './db.js'

export class MsProjectSyncService {
  constructor() {
    this._token = null
    this._tokenExpiry = null
    this._digest = null
    this._digestExpiry = null
  }

  get config() {
    try { return JSON.parse(localStorage.getItem('bolt_ms_config') || '{}') } catch { return {} }
  }

  get isConfigured() { return isMsConfigured() }

  // ── OAuth2 token ─────────────────────────────────────────
  async getToken() {
    if (this._token && this._tokenExpiry && Date.now() < this._tokenExpiry) return this._token
    const { tenantId, clientId, clientSecret, pwaUrl } = this.config
    if (!tenantId || !clientId || !clientSecret || !pwaUrl) throw new Error('MS Project Online not configured')
    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
    const scope = `${pwaUrl.replace(/\/$/, '')}/.default`
    const body  = new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret, scope })
    const res   = await fetch(url, { method: 'POST', body })
    if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`)
    const data  = await res.json()
    this._token       = data.access_token
    this._tokenExpiry = Date.now() + (data.expires_in - 60) * 1000
    return this._token
  }

  async getDigest(pwaUrl) {
    if (this._digest && this._digestExpiry && Date.now() < this._digestExpiry) return this._digest
    const token = await this.getToken()
    const res   = await fetch(`${pwaUrl.replace(/\/$/, '')}/_api/contextinfo`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json;odata=verbose', 'Content-Length': '0' },
    })
    if (!res.ok) throw new Error(`Contextinfo failed: ${res.status}`)
    const data  = await res.json()
    this._digest       = data.d?.GetContextWebInformation?.FormDigestValue
    this._digestExpiry = Date.now() + 28 * 60 * 1000
    return this._digest
  }

  async _apiCall(method, endpoint, body = null) {
    const { pwaUrl } = this.config
    const token  = await this.getToken()
    const digest = ['POST','PATCH','DELETE'].includes(method) ? await this.getDigest(pwaUrl) : null
    const headers = {
      Authorization:   `Bearer ${token}`,
      Accept:          'application/json;odata=nometadata',
      'Content-Type':  'application/json;odata=nometadata',
    }
    if (digest) headers['X-RequestDigest'] = digest
    const url = `${pwaUrl.replace(/\/$/, '')}${endpoint}`
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`API ${method} ${endpoint} failed (${res.status}): ${txt.slice(0,200)}`)
    }
    return res.status === 204 ? null : res.json()
  }

  // ── Project-level operations ──────────────────────────────

  async createSummaryTask(msProjectId, zoneCode) {
    if (!this.isConfigured) return genMockGuid()
    const data = await this._apiCall('POST',
      `/_api/ProjectServer/Projects('${msProjectId}')/Draft/Tasks`,
      { TaskName: zoneCode, TaskIsSummary: true })
    return data?.Id || data?.d?.Id || genMockGuid()
  }

  async createChildTask(msProjectId, parentTaskId, activityName) {
    if (!this.isConfigured) return genMockGuid()
    const data = await this._apiCall('POST',
      `/_api/ProjectServer/Projects('${msProjectId}')/Draft/Tasks`,
      { TaskName: activityName, TaskParentId: parentTaskId })
    return data?.Id || data?.d?.Id || genMockGuid()
  }

  async updateTaskProgress(msProjectId, taskId, percent) {
    if (!this.isConfigured) return { mock: true }
    await this._apiCall('PATCH',
      `/_api/ProjectServer/Projects('${msProjectId}')/Draft/Tasks('${taskId}')`,
      { TaskPercentCompleted: Math.round(percent) })
    return { ok: true }
  }

  async createResource(resourceName, type = 1) {
    if (!this.isConfigured) return genMockGuid()
    const { pwaUrl } = this.config
    const data = await this._apiCall('POST',
      `/_api/ProjectServer/EnterpriseResources`,
      { ResourceName: resourceName, ResourceType: type })
    return data?.Id || data?.d?.Id || genMockGuid()
  }

  async assignResource(msProjectId, taskId, resourceId, units = 1) {
    if (!this.isConfigured) return genMockGuid()
    const data = await this._apiCall('POST',
      `/_api/ProjectServer/Projects('${msProjectId}')/Draft/Assignments`,
      { TaskId: taskId, ResourceId: resourceId, AssignmentUnits: units })
    return data?.Id || data?.d?.Id || genMockGuid()
  }

  async publishProject(msProjectId) {
    if (!this.isConfigured) return { mock: true }
    await this._apiCall('POST',
      `/_api/ProjectServer/Projects('${msProjectId}')/Draft/Publish(true)`)
    return { ok: true }
  }

  // ── High-level: sync full zone setup ─────────────────────

  async syncProjectZones(project) {
    const msId = project.msProjectId
    if (!this.isConfigured || !msId) {
      // Assign mock GUIDs and return
      const zones = project.zones.map(z => ({
        ...z,
        msTaskId: z.msTaskId || genMockGuid(),
        activities: (z.activities || []).map(a => ({
          ...a,
          msTaskId: a.msTaskId || genMockGuid(),
        })),
      }))
      return { zones, mock: true }
    }
    const zones = []
    for (const zone of project.zones) {
      const summaryId = zone.msTaskId || await this.createSummaryTask(msId, zone.zoneCode)
      const activities = []
      for (const act of (zone.activities || [])) {
        const childId = act.msTaskId || await this.createChildTask(msId, summaryId, act.name || act.activityName)
        activities.push({ ...act, msTaskId: childId })
      }
      zones.push({ ...zone, msTaskId: summaryId, activities })
    }
    await this.publishProject(msId)
    return { zones, mock: false }
  }

  // ── High-level: push report progress ─────────────────────

  async syncReportProgress(project, report) {
    if (!this.isConfigured || !project.msProjectId) {
      return { mock: true, note: 'Demo mode – no live sync' }
    }
    for (const zp of (report.zoneProgress || [])) {
      const zone = (project.zones || []).find(z => z.id === zp.zoneConfigId)
      if (!zone) continue
      for (const ap of (zp.activities || [])) {
        const act = (zone.activities || []).find(a => a.id === ap.activityId)
        if (!act?.msTaskId) continue
        await this.updateTaskProgress(project.msProjectId, act.msTaskId, ap.percentComplete)
      }
    }
    await this.publishProject(project.msProjectId)
    return { ok: true }
  }
}

export const msSync = new MsProjectSyncService()
