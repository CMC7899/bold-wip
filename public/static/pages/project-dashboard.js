// ============================================================
// PROJECT DASHBOARD PAGE
// ============================================================
import { DB, formatDate, formatDateLong, statusColor, statusLabel,
         computeProjectProgress, progressColor, weatherEmoji, isMsConfigured, todayISO } from '../db.js'
import { msSync } from '../msproject.js'

export class ProjectDashboardPage {
  constructor(id) {
    this.projectId = id
    this.project   = null
    this.reports   = []
  }

  async render(container) {
    app.setHeaderTitle('Project', `
      <button onclick="app.navTo('#/reports/new?projectId=${this.projectId}')"
        class="flex items-center gap-1 px-3 py-1.5 bg-brand-800 text-white text-xs font-semibold rounded-lg">
        <i class="fas fa-plus"></i> Report
      </button>`)

    container.innerHTML = `<div class="flex items-center justify-center py-20"><div class="spinner"></div></div>`

    this.project = await DB.getProject(this.projectId)
    if (!this.project) {
      container.innerHTML = `
        <div class="text-center py-20 px-4">
          <div class="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-exclamation-triangle text-2xl text-red-400"></i>
          </div>
          <p class="text-gray-700 font-semibold mb-1">Project not found</p>
          <p class="text-gray-400 text-sm mb-4">ID: ${this.projectId}</p>
          <button onclick="app.navTo('#/projects')"
            class="px-4 py-2 bg-brand-800 text-white rounded-xl text-sm font-semibold">
            Back to Projects
          </button>
        </div>`
      return
    }

    this.reports = await DB.getReportsByProject(this.projectId)
    const pct    = await computeProjectProgress(this.projectId)
    window.projectDashboardPage = this

    app.setHeaderTitle(this.project.name || 'Project', `
      <button onclick="app.navTo('#/reports/new?projectId=${this.projectId}')"
        class="flex items-center gap-1 px-3 py-1.5 bg-brand-800 text-white text-xs font-semibold rounded-lg">
        <i class="fas fa-plus"></i> Report
      </button>`)

    container.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 py-4 lg:py-8">

      <!-- Desktop back + actions -->
      <div class="hidden lg:flex items-center gap-4 mb-6">
        <button onclick="app.navTo('#/projects')"
          class="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">
          <i class="fas fa-arrow-left"></i>
        </button>
        <div class="flex-1 min-w-0">
          <h1 class="text-2xl font-bold text-gray-900 truncate">${this._esc(this.project.name)}</h1>
          <p class="text-sm text-gray-500">${this._esc(this.project.siteLocation)}</p>
        </div>
        <div class="flex gap-2 flex-shrink-0">
          ${this.project.msProjectUrl ? `
          <button onclick="projectDashboardPage._syncToMs()"
            class="flex items-center gap-2 px-4 py-2 border border-blue-200 text-blue-700 bg-blue-50 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors">
            <i class="fab fa-microsoft"></i> Sync to MS Project
          </button>` : ''}
          <button onclick="app.navTo('#/reports/new?projectId=${this.projectId}')"
            class="flex items-center gap-2 px-4 py-2 bg-brand-800 text-white rounded-xl text-sm font-semibold hover:bg-brand-700">
            <i class="fas fa-plus"></i> New Daily Report
          </button>
        </div>
      </div>

      <!-- Header card -->
      <div class="bg-gradient-to-br from-brand-800 to-brand-900 rounded-2xl text-white p-5 mb-5 shadow-lg">
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1 min-w-0">
            <div class="text-white/50 text-xs uppercase tracking-wider mb-1">Project</div>
            <h2 class="text-xl font-bold leading-tight lg:hidden truncate">${this._esc(this.project.name)}</h2>
            <div class="flex flex-wrap items-center gap-2 mt-1">
              <span class="badge text-xs ${this.project.status === 'active' ? 'text-emerald-300 border-emerald-400/50 bg-emerald-900/30' : 'text-gray-300 border-gray-400/50'}">
                ${statusLabel(this.project.status)}
              </span>
              ${(this.project.syncStatus === 'mock' || !isMsConfigured()) ? `
              <span class="badge text-xs text-purple-300 border-purple-400/50 bg-purple-900/30">
                <i class="fas fa-magic mr-1"></i>Demo Mode
              </span>` : ''}
            </div>
          </div>
          <div class="text-right flex-shrink-0 ml-4">
            <div class="text-4xl font-black">${pct}%</div>
            <div class="text-white/50 text-xs mt-0.5">Overall Progress</div>
          </div>
        </div>
        <div class="h-2 bg-white/20 rounded-full overflow-hidden mb-4">
          <div class="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-700"
            style="width:${pct}%"></div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div><div class="text-white/50 mb-0.5">Client</div><div class="font-semibold truncate">${this._esc(this.project.client)}</div></div>
          <div><div class="text-white/50 mb-0.5">Contractor</div><div class="font-semibold truncate">${this._esc(this.project.contractor)}</div></div>
          <div><div class="text-white/50 mb-0.5">Start</div><div class="font-semibold">${formatDate(this.project.startDate)}</div></div>
          <div><div class="text-white/50 mb-0.5">Deadline</div><div class="font-semibold">${formatDate(this.project.expectedEndDate)}</div></div>
        </div>
      </div>

      <!-- Stats row -->
      <div class="grid grid-cols-3 gap-3 mb-5">
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <div class="text-2xl font-black text-brand-800">${(this.project.zones || []).length}</div>
          <div class="text-xs text-gray-500 mt-0.5">Zones</div>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <div class="text-2xl font-black text-brand-800">${this.reports.length}</div>
          <div class="text-xs text-gray-500 mt-0.5">Reports</div>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <div class="text-2xl font-black text-brand-800">${this.reports.filter(r => r.syncStatus === 'synced').length}</div>
          <div class="text-xs text-gray-500 mt-0.5">Synced</div>
        </div>
      </div>

      <!-- MS Project IDs panel (demo info) -->
      ${this._renderMsInfoPanel()}

      <!-- Zone Progress Grid -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <h3 class="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <i class="fas fa-layer-group text-brand-600"></i> Zone Progress Overview
        </h3>
        ${this._renderZoneGrid()}
      </div>

      <!-- Recent Reports -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-gray-900 flex items-center gap-2">
            <i class="fas fa-clipboard-list text-brand-600"></i> Daily Reports
          </h3>
          <button onclick="app.navTo('#/reports/new?projectId=${this.projectId}')"
            class="text-xs text-brand-600 font-semibold flex items-center gap-1 hover:underline">
            <i class="fas fa-plus"></i> New Report
          </button>
        </div>
        ${this._renderReports()}
      </div>
    </div>`
  }

  _renderMsInfoPanel() {
    const p = this.project
    if (isMsConfigured() && p.msProjectId && p.syncStatus !== 'mock') {
      return `
        <div class="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5">
          <div class="flex items-center gap-2 mb-2">
            <i class="fab fa-microsoft text-blue-600"></i>
            <span class="font-semibold text-blue-800 text-sm">MS Project Online – Linked</span>
          </div>
          <div class="text-xs text-blue-700 font-mono break-all">Project ID: ${p.msProjectId}</div>
          ${p.msProjectUrl ? `<div class="text-xs text-blue-500 mt-1 break-all">${p.msProjectUrl}</div>` : ''}
        </div>`
    }
    if (!isMsConfigured() || p.syncStatus === 'mock') {
      const zones = (p.zones || []).slice(0, 3)
      return `
        <div class="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-5">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <i class="fas fa-magic text-purple-500"></i>
              <div>
                <span class="font-semibold text-purple-800 text-sm">Demo Mode – Mock IDs Assigned</span>
                <p class="text-xs text-purple-600 mt-0.5">All MS Project fields have auto-generated GUIDs for demonstration.</p>
              </div>
            </div>
            <button onclick="app.navTo('#/settings')"
              class="flex-shrink-0 text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700">
              Configure
            </button>
          </div>
          ${p.msProjectId ? `
          <div class="mt-3 grid grid-cols-1 gap-1.5 text-xs">
            <div class="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-purple-100">
              <span class="text-purple-500 font-semibold w-20 flex-shrink-0">Project ID</span>
              <code class="font-mono text-gray-600 truncate">${p.msProjectId}</code>
            </div>
            ${zones.map(z => `
            <div class="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-purple-100">
              <span class="text-purple-500 font-semibold w-20 flex-shrink-0">${z.zoneCode}</span>
              <code class="font-mono text-gray-600 truncate">${z.msTaskId || '–'}</code>
            </div>`).join('')}
            ${(p.zones || []).length > 3 ? `<div class="text-purple-400 text-center text-xs">+${(p.zones||[]).length - 3} more zones…</div>` : ''}
          </div>` : ''}
        </div>`
    }
    return ''
  }

  _renderZoneGrid() {
    if (!(this.project.zones || []).length) {
      return `<p class="text-gray-400 text-sm text-center py-6">No zones configured</p>`
    }
    const progressMap = {}
    if (this.reports.length) {
      for (const zp of (this.reports[0].zoneProgress || [])) {
        progressMap[zp.zoneConfigId] = zp.activities || []
      }
    }
    return `
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        ${this.project.zones.map(zone => {
          const acts = progressMap[zone.id] || (zone.activities || []).map(a => ({ ...a, percentComplete: 0 }))
          const avg  = acts.length ? Math.round(acts.reduce((s, a) => s + (a.percentComplete || 0), 0) / acts.length) : 0
          const col  = progressColor(avg)
          const isBIPV = zone.zoneType === 'BIPV'
          return `
            <div class="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <span class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm
                    ${isBIPV ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}">
                    ${isBIPV ? 'B' : 'S'}
                  </span>
                  <div>
                    <div class="font-bold text-sm text-gray-900">${this._esc(zone.zoneCode)}</div>
                    <div class="text-xs text-gray-400">${zone.zoneType}</div>
                  </div>
                </div>
                <span class="text-xl font-black" style="color:${col}">${avg}%</span>
              </div>
              <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                <div class="h-full rounded-full transition-all duration-500"
                  style="width:${avg}%;background:${col}"></div>
              </div>
              <div class="space-y-1.5">
                ${acts.slice(0, 5).map(a => {
                  const name = a.activityName || a.name || '–'
                  const pct  = a.percentComplete || 0
                  return `
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-gray-500 truncate flex-1">${this._esc(name)}</span>
                      <div class="w-16 h-1 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                        <div class="h-full rounded-full"
                          style="width:${pct}%;background:${progressColor(pct)}"></div>
                      </div>
                      <span class="text-xs font-semibold w-7 text-right flex-shrink-0"
                        style="color:${progressColor(pct)}">${pct}%</span>
                    </div>`
                }).join('')}
                ${acts.length > 5 ? `<p class="text-xs text-gray-400">+${acts.length - 5} more…</p>` : ''}
              </div>
            </div>`
        }).join('')}
      </div>`
  }

  _renderReports() {
    if (!this.reports.length) {
      return `
        <div class="text-center py-12">
          <div class="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-clipboard text-2xl text-gray-300"></i>
          </div>
          <p class="text-gray-500 text-sm mb-4">No reports yet</p>
          <button onclick="app.navTo('#/reports/new?projectId=${this.projectId}')"
            class="inline-flex items-center gap-2 bg-brand-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold">
            <i class="fas fa-plus"></i> Create First Report
          </button>
        </div>`
    }
    return `
      <div class="overflow-x-auto -mx-5 px-5">
        <table class="data-table min-w-full">
          <thead>
            <tr>
              <th>Report No.</th>
              <th>Date</th>
              <th>Weather</th>
              <th>Prepared By</th>
              <th>Sync</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${this.reports.slice(0, 15).map(r => `
              <tr onclick="app.navTo('#/reports/${r.id}')" class="cursor-pointer hover:bg-gray-50">
                <td class="font-mono text-xs font-bold text-brand-700">${r.reportNo || '–'}</td>
                <td class="text-sm">${formatDate(r.reportDate)}</td>
                <td class="text-sm">${weatherEmoji(r.weatherAm)} ${r.weatherAm} / ${weatherEmoji(r.weatherPm)} ${r.weatherPm}</td>
                <td class="text-sm text-gray-600">${this._esc(r.preparedBy || '–')}</td>
                <td>
                  <span class="badge ${statusColor(r.syncStatus || 'pending')} text-xs">
                    ${statusLabel(r.syncStatus || 'pending')}
                  </span>
                </td>
                <td class="text-right">
                  <span class="text-xs text-brand-600 font-semibold whitespace-nowrap">
                    View <i class="fas fa-chevron-right text-xs ml-1"></i>
                  </span>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      ${this.reports.length > 15 ? `<p class="text-xs text-gray-400 mt-3 text-center">Showing 15 of ${this.reports.length} reports</p>` : ''}`
  }

  async _syncToMs() {
    if (!isMsConfigured()) {
      showToast('MS Project Online not configured. Go to Settings.', 'warning'); return
    }
    showToast('Syncing to MS Project Online…', 'info')
    try {
      const result = await msSync.syncProjectZones(this.project)
      this.project.zones = result.zones
      await DB.putProject(this.project)
      showToast('Synced successfully!', 'success')
      app.navTo('#/projects/' + this.projectId)
    } catch (e) {
      showToast('Sync failed: ' + e.message, 'error')
    }
  }

  _esc(s) {
    if (s == null) return ''
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;')
  }
}
