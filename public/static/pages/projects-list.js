// ============================================================
// PROJECTS LIST PAGE
// ============================================================
import { DB, formatDate, statusColor, statusLabel, computeProjectProgress, todayISO } from '../db.js'

export class ProjectListPage {
  async render(container) {
    app.setHeaderTitle('Projects', `
      <button onclick="app.navTo('#/projects/new')"
        class="w-8 h-8 flex items-center justify-center rounded-lg bg-brand-800 text-white text-sm">
        <i class="fas fa-plus"></i>
      </button>`)

    container.innerHTML = `
      <div class="p-4 lg:p-8 max-w-7xl mx-auto">
        <div class="hidden lg:flex items-center justify-between mb-8">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Projects</h1>
            <p class="text-gray-500 text-sm mt-1">Manage all construction projects</p>
          </div>
          <button onclick="app.navTo('#/projects/new')"
            class="inline-flex items-center gap-2 bg-brand-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors">
            <i class="fas fa-plus"></i> New Project
          </button>
        </div>

        <div id="stats-row" class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6"></div>

        <div class="flex gap-3 mb-5">
          <div class="flex-1 relative">
            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input id="search-input" type="text" placeholder="Search projects…"
              oninput="projectListPage.filter()"
              class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
          </div>
          <select id="status-filter" onchange="projectListPage.filter()"
            class="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>

        <div id="projects-grid" class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3"></div>
        <div id="empty-state" class="hidden text-center py-20">
          <div class="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-folder-open text-3xl text-gray-300"></i>
          </div>
          <h3 class="font-semibold text-gray-700 mb-1">No projects yet</h3>
          <p class="text-gray-400 text-sm mb-6">Create your first project to get started</p>
          <button onclick="app.navTo('#/projects/new')"
            class="inline-flex items-center gap-2 bg-brand-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold">
            <i class="fas fa-plus"></i> Create Project
          </button>
        </div>
      </div>`

    window.projectListPage = this
    this.projects = await DB.getAllProjects()
    this.progressMap = {}
    for (const p of this.projects) {
      this.progressMap[p.id] = await computeProjectProgress(p.id)
    }
    this._renderStats()
    this.filter()
  }

  _renderStats() {
    const total     = this.projects.length
    const active    = this.projects.filter(p => p.status === 'active').length
    const completed = this.projects.filter(p => p.status === 'completed').length
    const onHold    = this.projects.filter(p => p.status === 'on_hold').length
    const el = document.getElementById('stats-row')
    if (!el) return
    el.innerHTML = [
      { label: 'Total',     value: total,     icon: 'fa-folder',       color: 'bg-blue-50 text-blue-600' },
      { label: 'Active',    value: active,    icon: 'fa-play-circle',  color: 'bg-emerald-50 text-emerald-600' },
      { label: 'Completed', value: completed, icon: 'fa-check-circle', color: 'bg-purple-50 text-purple-600' },
      { label: 'On Hold',   value: onHold,    icon: 'fa-pause-circle', color: 'bg-amber-50 text-amber-600' },
    ].map(s => `
      <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl ${s.color} flex items-center justify-center">
            <i class="fas ${s.icon}"></i>
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-900">${s.value}</div>
            <div class="text-xs text-gray-500">${s.label}</div>
          </div>
        </div>
      </div>`).join('')
  }

  filter() {
    const q  = (document.getElementById('search-input')?.value || '').toLowerCase()
    const st = document.getElementById('status-filter')?.value || ''
    const filtered = this.projects.filter(p => {
      const name = (p.name || '').toLowerCase()
      const loc  = (p.siteLocation || '').toLowerCase()
      const cli  = (p.client || '').toLowerCase()
      return (!q || name.includes(q) || loc.includes(q) || cli.includes(q)) &&
             (!st || p.status === st)
    })
    const grid  = document.getElementById('projects-grid')
    const empty = document.getElementById('empty-state')
    if (!grid || !empty) return
    if (!filtered.length) {
      grid.innerHTML = ''
      empty.classList.remove('hidden')
    } else {
      empty.classList.add('hidden')
      grid.innerHTML = filtered.map(p => this._renderCard(p)).join('')
    }
  }

  _renderCard(p) {
    const pct      = this.progressMap[p.id] || 0
    const sc       = statusColor(p.status)
    const barColor = pct >= 80 ? '#10b981' : pct >= 50 ? '#3b82f6' : pct >= 20 ? '#f59e0b' : '#ef4444'
    const name     = p.name       || 'Untitled Project'
    const loc      = p.siteLocation || '–'
    const client   = p.client     || '–'
    const created  = p.createdAt ? p.createdAt.split('T')[0] : todayISO()
    const zones    = (p.zones || []).length
    return `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm card-hover p-5 cursor-pointer"
        onclick="app.navTo('#/projects/${p.id}')">
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-gray-900 truncate">${this._esc(name)}</h3>
            <p class="text-gray-500 text-xs mt-0.5 flex items-center gap-1">
              <i class="fas fa-map-marker-alt"></i> ${this._esc(loc)}
            </p>
          </div>
          <span class="badge ${sc} ml-2 whitespace-nowrap flex-shrink-0">${statusLabel(p.status)}</span>
        </div>

        <div class="text-xs text-gray-500 mb-3 space-y-1">
          <div class="flex items-center gap-1.5">
            <i class="fas fa-building w-3.5 text-center text-gray-400"></i>
            ${this._esc(client)}
          </div>
          <div class="flex items-center gap-1.5">
            <i class="fas fa-calendar w-3.5 text-center text-gray-400"></i>
            ${formatDate(p.startDate)} – ${formatDate(p.expectedEndDate)}
          </div>
          <div class="flex items-center gap-1.5">
            <i class="fas fa-layer-group w-3.5 text-center text-gray-400"></i>
            ${zones} zone${zones !== 1 ? 's' : ''}
          </div>
        </div>

        <div class="mt-3">
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="text-gray-500">Overall Progress</span>
            <span class="font-semibold" style="color:${barColor}">${pct}%</span>
          </div>
          <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-500"
              style="width:${pct}%;background:${barColor}"></div>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
          <span class="text-xs text-gray-400">
            <i class="fas fa-clock mr-1"></i>${formatDate(created)}
          </span>
          <span class="text-xs text-brand-600 font-semibold flex items-center gap-1">
            View <i class="fas fa-chevron-right text-xs"></i>
          </span>
        </div>
      </div>`
  }

  _esc(s) {
    if (s == null) return ''
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;')
  }
}
