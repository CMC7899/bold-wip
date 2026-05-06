// ============================================================
// PROJECT NEW PAGE – 4-step multi-step form
// Mock IDs assigned automatically when MS Project not configured
// ============================================================
import { DB, genId, genMockGuid, isMsConfigured, todayISO, getActivities } from '../db.js'
import { msSync } from '../msproject.js'

export class ProjectNewPage {
  constructor() {
    this.step = 1
    this.totalSteps = 4
    this.saving = false
    this.data = {
      id:               genId(),
      name:             '',
      client:           '',
      contractor:       'Bolt Industries Sdn Bhd',
      siteLocation:     '',
      msProjectId:      '',
      msProjectUrl:     '',
      startDate:        todayISO(),
      expectedEndDate:  '',
      zones:            [],
      resourceTemplates:[],
      status:           'active',
      createdAt:        new Date().toISOString(),
    }
  }

  async render(container) {
    app.setHeaderTitle('New Project', `
      <button onclick="app.navTo('#/projects')"
        class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
        <i class="fas fa-times"></i>
      </button>`)

    container.innerHTML = `
      <div class="max-w-2xl mx-auto px-4 py-6 lg:py-10">
        <div class="hidden lg:flex items-center gap-4 mb-8">
          <button onclick="app.navTo('#/projects')"
            class="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">
            <i class="fas fa-arrow-left"></i>
          </button>
          <div>
            <h1 class="text-2xl font-bold text-gray-900">New Project Setup</h1>
            <p class="text-sm text-gray-500">Configure your project in 4 steps</p>
          </div>
        </div>
        <div id="step-indicator" class="mb-6"></div>
        <div id="step-content" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"></div>
        <div id="step-nav" class="flex gap-3 mt-4"></div>
      </div>`

    window.projectNewPage = this
    this._renderStep()
  }

  // ── Step orchestration ────────────────────────────────────

  _renderStep() {
    this._renderIndicator()
    this._renderContent()
    this._renderNav()
  }

  _renderIndicator() {
    const labels = ['Project Info', 'Zone Config', 'Resources', 'Review']
    document.getElementById('step-indicator').innerHTML = `
      <div class="flex items-center">
        ${labels.map((l, i) => {
          const n = i + 1
          const state = n < this.step ? 'done' : n === this.step ? 'active' : 'inactive'
          return `
            ${i > 0 ? `<div class="step-line flex-1 ${n <= this.step ? 'done' : ''}"></div>` : ''}
            <div class="flex flex-col items-center gap-1 flex-shrink-0">
              <div class="step-dot ${state}">
                ${state === 'done' ? '<i class="fas fa-check" style="font-size:9px"></i>' : n}
              </div>
              <span class="text-xs font-medium hidden sm:block whitespace-nowrap
                ${state === 'active' ? 'text-brand-800' : state === 'done' ? 'text-emerald-600' : 'text-gray-400'}">${l}</span>
            </div>`
        }).join('')}
      </div>`
  }

  _renderContent() {
    const c = document.getElementById('step-content')
    const fn = [null, this._step1, this._step2, this._step3, this._step4][this.step]
    c.innerHTML = fn ? fn.call(this) : ''
  }

  _renderNav() {
    document.getElementById('step-nav').innerHTML = `
      ${this.step > 1 ? `
        <button onclick="projectNewPage._prev()"
          class="flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          <i class="fas fa-arrow-left mr-2"></i>Back
        </button>` : ''}
      ${this.step < this.totalSteps ? `
        <button onclick="projectNewPage._next()"
          class="flex-1 py-3 px-4 rounded-xl bg-brand-800 text-white text-sm font-semibold hover:bg-brand-700">
          Next <i class="fas fa-arrow-right ml-2"></i>
        </button>` : `
        <button id="save-btn" onclick="projectNewPage._save()"
          class="flex-1 py-3 px-4 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
          <i class="fas fa-save mr-2"></i>Save Project
        </button>`}
    `
  }

  // ── Step 1: Project Info ──────────────────────────────────

  _step1() {
    const d = this.data
    const msConfigured = isMsConfigured()
    return `
      <h2 class="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
        <span class="w-7 h-7 rounded-lg bg-brand-800 text-white text-xs flex items-center justify-center">1</span>
        Project Information
      </h2>
      <div class="space-y-4">
        <div>
          <label class="field-label">Project Name *</label>
          <input id="f-name" type="text" value="${this._esc(d.name)}"
            placeholder="e.g. NEM 3.0 LHDN Cyberjaya"
            class="field-input" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="field-label">Client *</label>
            <input id="f-client" type="text" value="${this._esc(d.client)}"
              placeholder="e.g. LHDN" class="field-input" />
          </div>
          <div>
            <label class="field-label">Contractor *</label>
            <input id="f-contractor" type="text" value="${this._esc(d.contractor)}"
              placeholder="Contractor name" class="field-input" />
          </div>
        </div>
        <div>
          <label class="field-label">Site Location *</label>
          <input id="f-location" type="text" value="${this._esc(d.siteLocation)}"
            placeholder="e.g. LHDN Cyberjaya, Selangor" class="field-input" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="field-label">Start Date *</label>
            <input id="f-start" type="date" value="${d.startDate}" class="field-input" />
          </div>
          <div>
            <label class="field-label">Expected End Date *</label>
            <input id="f-end" type="date" value="${d.expectedEndDate}" class="field-input" />
          </div>
        </div>

        ${msConfigured ? `
        <div class="border-t border-gray-100 pt-4">
          <div class="flex items-center gap-2 mb-3">
            <i class="fab fa-microsoft text-blue-500"></i>
            <span class="text-sm font-semibold text-gray-700">MS Project Online</span>
            <span class="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Configured</span>
          </div>
          <div class="space-y-3">
            <input id="f-ms-url" type="url" value="${this._esc(d.msProjectUrl)}"
              placeholder="PWA URL (e.g. https://company.sharepoint.com/sites/pwa)"
              class="field-input" />
            <input id="f-ms-id" type="text" value="${this._esc(d.msProjectId)}"
              placeholder="MS Project GUID (leave blank to create new)"
              class="field-input font-mono text-xs" />
          </div>
        </div>` : `
        <div class="border-t border-gray-100 pt-4">
          <div class="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <i class="fab fa-microsoft text-amber-500 text-lg"></i>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold text-amber-800">MS Project Online – Demo Mode</div>
              <div class="text-xs text-amber-600 mt-0.5">Mock IDs will be auto-assigned. Configure in
                <button onclick="app.navTo('#/settings')" class="underline font-semibold">Settings</button>
                to enable live sync.</div>
            </div>
          </div>
        </div>`}
      </div>`
  }

  // ── Step 2: Zone Configuration ────────────────────────────

  _step2() {
    return `
      <h2 class="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
        <span class="w-7 h-7 rounded-lg bg-brand-800 text-white text-xs flex items-center justify-center">2</span>
        Zone Configuration
      </h2>
      <p class="text-sm text-gray-500 mb-5">Add construction zones and their activity lists</p>

      <div class="flex gap-2 mb-4">
        <select id="zone-type-sel"
          class="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          <option value="BIPV">BIPV Zone (CP1–CP7)</option>
          <option value="STANDARD">Standard Zone (CPN1–CPN8)</option>
        </select>
        <input id="zone-code-inp" type="text" placeholder="Code e.g. CP1"
          class="w-32 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase"
          onkeydown="if(event.key==='Enter') projectNewPage._addZone()" />
        <button onclick="projectNewPage._addZone()"
          class="px-4 py-2.5 bg-brand-800 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 whitespace-nowrap">
          <i class="fas fa-plus mr-1"></i>Add
        </button>
      </div>

      <div id="zones-list">
        ${this._renderZonesList()}
      </div>`
  }

  _renderZonesList() {
    if (!this.data.zones.length) {
      return `<div class="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
        <i class="fas fa-layer-group text-3xl mb-2 block text-gray-300"></i>
        No zones added yet. Add at least one zone to continue.
      </div>`
    }
    return `
      <div class="space-y-2">
        ${this.data.zones.map((z, i) => this._renderZoneItem(z, i)).join('')}
      </div>
      <p class="text-xs text-gray-400 mt-3 text-center">${this.data.zones.length} zone(s) configured</p>`
  }

  _renderZoneItem(z, i) {
    const isBIPV = z.zoneType === 'BIPV'
    return `
      <div class="border border-gray-200 rounded-xl overflow-hidden">
        <div class="flex items-center gap-3 px-4 py-3 bg-gray-50 cursor-pointer select-none"
          onclick="this.nextElementSibling.classList.toggle('hidden')">
          <span class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
            ${isBIPV ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}">
            ${isBIPV ? 'B' : 'S'}
          </span>
          <div class="flex-1 min-w-0">
            <span class="font-semibold text-sm text-gray-900">${this._esc(z.zoneCode)}</span>
            <span class="text-xs text-gray-400 ml-2">${z.zoneType}</span>
          </div>
          <span class="text-xs text-gray-400">${(z.activities || []).length} activities</span>
          <button onclick="event.stopPropagation(); projectNewPage._removeZone(${i})"
            class="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 flex-shrink-0">
            <i class="fas fa-trash-alt text-xs"></i>
          </button>
          <i class="fas fa-chevron-down text-gray-300 text-xs flex-shrink-0"></i>
        </div>
        <div class="hidden px-4 py-3 bg-white">
          <div class="text-xs text-gray-500 space-y-1 max-h-48 overflow-y-auto">
            ${(z.activities || []).map((a, ai) => `
              <div class="flex items-center gap-2 py-0.5">
                <span class="w-5 h-5 rounded bg-gray-100 text-gray-500 text-xs flex items-center justify-center flex-shrink-0">${a.sequence || ai + 1}</span>
                <span class="flex-1">${this._esc(a.name || a.activityName || '')}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>`
  }

  _addZone() {
    const code = (document.getElementById('zone-code-inp')?.value || '').trim().toUpperCase()
    const type = document.getElementById('zone-type-sel')?.value || 'BIPV'
    if (!code) { showToast('Enter a zone code', 'warning'); return }
    if (this.data.zones.find(z => z.zoneCode === code)) {
      showToast('Zone code already exists', 'warning'); return
    }
    const activities = getActivities(type)
    this.data.zones.push({
      id:         genId(),
      projectId:  this.data.id,
      zoneCode:   code,
      zoneType:   type,
      msTaskId:   isMsConfigured() ? '' : genMockGuid(),
      activities,
    })
    const inp = document.getElementById('zone-code-inp')
    if (inp) inp.value = ''
    document.getElementById('zones-list').innerHTML = this._renderZonesList()
  }

  _removeZone(i) {
    this.data.zones.splice(i, 1)
    document.getElementById('zones-list').innerHTML = this._renderZonesList()
  }

  // ── Step 3: Resource Templates ────────────────────────────

  _step3() {
    const presetMP = ['Engineer', 'Site Supervisor', 'General Workers', 'Backhoe Operator', 'Site Safety Supervisor', 'Project Manager']
    const presetMC = ['Backhoe', 'Crane', 'Tipper Truck', 'Forklift', 'Bar Bending Machine', 'Road Cutting Machine']
    return `
      <h2 class="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
        <span class="w-7 h-7 rounded-lg bg-brand-800 text-white text-xs flex items-center justify-center">3</span>
        Resource Templates
      </h2>
      <p class="text-sm text-gray-500 mb-5">Define manpower roles and machinery for daily logging</p>

      <div class="flex gap-2 mb-3">
        <select id="res-type-sel"
          class="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          <option value="MANPOWER">👷 Manpower</option>
          <option value="MACHINERY">🔧 Machinery</option>
        </select>
        <input id="res-name-inp" type="text" placeholder="Role / equipment name"
          class="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          onkeydown="if(event.key==='Enter') projectNewPage._addResource()" />
        <button onclick="projectNewPage._addResource()"
          class="px-4 py-2.5 bg-brand-800 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 whitespace-nowrap">
          <i class="fas fa-plus mr-1"></i>Add
        </button>
      </div>

      <div class="mb-4">
        <p class="text-xs text-gray-500 mb-2">Quick presets:</p>
        <div class="flex flex-wrap gap-1.5">
          ${presetMP.map(n => `<button onclick="projectNewPage._addPreset('${n}','MANPOWER')"
            class="px-2.5 py-1 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">${n}</button>`).join('')}
          ${presetMC.map(n => `<button onclick="projectNewPage._addPreset('${n}','MACHINERY')"
            class="px-2.5 py-1 text-xs bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors">${n}</button>`).join('')}
        </div>
      </div>

      <div id="resources-list">
        ${this._renderResourcesList()}
      </div>`
  }

  _renderResourcesList() {
    const mp = this.data.resourceTemplates.filter(r => r.type === 'MANPOWER')
    const mc = this.data.resourceTemplates.filter(r => r.type === 'MACHINERY')
    if (!mp.length && !mc.length) {
      return `<div class="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
        <i class="fas fa-users text-2xl mb-2 block text-gray-300"></i>
        No resources added yet (optional)
      </div>`
    }
    return `
      <div class="space-y-2">
        ${mp.length ? `<div class="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1 px-1">👷 Manpower (${mp.length})</div>
          ${mp.map(r => this._renderResItem(r)).join('')}` : ''}
        ${mc.length ? `<div class="text-xs font-semibold text-amber-600 uppercase tracking-wide mt-3 mb-1 px-1">🔧 Machinery (${mc.length})</div>
          ${mc.map(r => this._renderResItem(r)).join('')}` : ''}
      </div>`
  }

  _renderResItem(r) {
    return `
      <div class="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
        <span class="text-lg flex-shrink-0">${r.type === 'MANPOWER' ? '👷' : '🔧'}</span>
        <span class="flex-1 text-sm font-medium text-gray-800">${this._esc(r.roleName)}</span>
        <button onclick="projectNewPage._removeResource('${r.id}')"
          class="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 flex-shrink-0">
          <i class="fas fa-trash-alt text-xs"></i>
        </button>
      </div>`
  }

  _addPreset(name, type) {
    if (this.data.resourceTemplates.find(r => r.roleName === name)) return
    this.data.resourceTemplates.push({
      id: genId(), projectId: this.data.id, type, roleName: name,
      msResourceId: isMsConfigured() ? '' : genMockGuid(),
    })
    document.getElementById('resources-list').innerHTML = this._renderResourcesList()
  }

  _addResource() {
    const name = (document.getElementById('res-name-inp')?.value || '').trim()
    const type = document.getElementById('res-type-sel')?.value || 'MANPOWER'
    if (!name) { showToast('Enter a resource name', 'warning'); return }
    if (this.data.resourceTemplates.find(r => r.roleName === name)) {
      showToast('Resource already exists', 'warning'); return
    }
    this.data.resourceTemplates.push({
      id: genId(), projectId: this.data.id, type, roleName: name,
      msResourceId: isMsConfigured() ? '' : genMockGuid(),
    })
    const inp = document.getElementById('res-name-inp')
    if (inp) inp.value = ''
    document.getElementById('resources-list').innerHTML = this._renderResourcesList()
  }

  _removeResource(id) {
    this.data.resourceTemplates = this.data.resourceTemplates.filter(r => r.id !== id)
    document.getElementById('resources-list').innerHTML = this._renderResourcesList()
  }

  // ── Step 4: Review & Save ─────────────────────────────────

  _step4() {
    const d = this.data
    const msConfigured = isMsConfigured()
    return `
      <h2 class="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
        <span class="w-7 h-7 rounded-lg bg-emerald-600 text-white text-xs flex items-center justify-center">
          <i class="fas fa-check" style="font-size:9px"></i>
        </span>
        Review & Save
      </h2>

      ${!msConfigured ? `
      <div class="flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl mb-4 text-sm">
        <i class="fas fa-magic text-purple-500 mt-0.5"></i>
        <div>
          <span class="font-semibold text-purple-800">Demo Mode Active</span>
          <div class="text-purple-600 text-xs mt-0.5">Mock GUIDs will be auto-assigned for all MS Project fields. You can configure live sync later in Settings.</div>
        </div>
      </div>` : ''}

      <div class="space-y-3 text-sm">
        <div class="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <h3 class="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <i class="fas fa-info-circle text-blue-500"></i> Project Info
          </h3>
          <div class="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
            <span class="text-blue-500 font-medium">Name</span>
            <span class="font-semibold text-blue-900">${this._esc(d.name)}</span>
            <span class="text-blue-500 font-medium">Client</span>
            <span class="text-blue-800">${this._esc(d.client)}</span>
            <span class="text-blue-500 font-medium">Contractor</span>
            <span class="text-blue-800">${this._esc(d.contractor)}</span>
            <span class="text-blue-500 font-medium">Location</span>
            <span class="text-blue-800">${this._esc(d.siteLocation)}</span>
            <span class="text-blue-500 font-medium">Start Date</span>
            <span class="text-blue-800">${d.startDate}</span>
            <span class="text-blue-500 font-medium">End Date</span>
            <span class="text-blue-800">${d.expectedEndDate}</span>
          </div>
        </div>

        <div class="bg-purple-50 rounded-xl p-4 border border-purple-100">
          <h3 class="font-semibold text-purple-900 mb-3 flex items-center gap-2">
            <i class="fas fa-layer-group text-purple-500"></i> Zones (${d.zones.length})
          </h3>
          ${d.zones.length === 0
            ? `<p class="text-red-500 text-xs flex items-center gap-1"><i class="fas fa-exclamation-circle"></i> No zones configured – required</p>`
            : d.zones.map(z => `
              <div class="flex items-center justify-between py-1.5 border-b border-purple-100 last:border-0">
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-purple-900 text-xs">${this._esc(z.zoneCode)}</span>
                  <span class="text-xs bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded-full">${z.zoneType}</span>
                </div>
                <span class="text-xs text-purple-500">${(z.activities || []).length} activities</span>
              </div>`).join('')}
        </div>

        <div class="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <h3 class="font-semibold text-emerald-900 mb-2 flex items-center gap-2">
            <i class="fas fa-users text-emerald-500"></i> Resources (${d.resourceTemplates.length})
          </h3>
          ${d.resourceTemplates.length === 0
            ? `<p class="text-gray-500 text-xs">No resources configured (optional)</p>`
            : `<div class="flex flex-wrap gap-1.5">
                ${d.resourceTemplates.map(r => `
                  <span class="text-xs bg-white border border-emerald-200 text-emerald-800 px-2 py-1 rounded-lg">
                    ${r.type === 'MANPOWER' ? '👷' : '🔧'} ${this._esc(r.roleName)}
                  </span>`).join('')}
               </div>`}
        </div>

        <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h3 class="font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <i class="fab fa-microsoft text-blue-500"></i> MS Project Sync
          </h3>
          ${msConfigured
            ? `<div class="text-xs text-gray-600">
                <span class="text-emerald-600 font-semibold">✓ Configured</span> –
                ${d.msProjectId ? `Project GUID: <code class="font-mono bg-white px-1 rounded">${d.msProjectId}</code>` : 'New project will be linked on first sync'}
               </div>`
            : `<div class="text-xs text-amber-700">
                <i class="fas fa-magic mr-1 text-purple-500"></i>
                Mock GUIDs will be auto-assigned to all zones and activities.
               </div>`}
        </div>
      </div>`
  }

  // ── Navigation ────────────────────────────────────────────

  _collectStep1() {
    this.data.name          = document.getElementById('f-name')?.value.trim()        || ''
    this.data.client        = document.getElementById('f-client')?.value.trim()      || ''
    this.data.contractor    = document.getElementById('f-contractor')?.value.trim()  || ''
    this.data.siteLocation  = document.getElementById('f-location')?.value.trim()    || ''
    this.data.startDate     = document.getElementById('f-start')?.value             || ''
    this.data.expectedEndDate = document.getElementById('f-end')?.value             || ''
    if (isMsConfigured()) {
      this.data.msProjectUrl = document.getElementById('f-ms-url')?.value.trim()    || ''
      this.data.msProjectId  = document.getElementById('f-ms-id')?.value.trim()     || ''
    }
  }

  _validate() {
    if (this.step === 1) {
      this._collectStep1()
      if (!this.data.name)          { showToast('Project name is required', 'error');     return false }
      if (!this.data.client)        { showToast('Client name is required', 'error');      return false }
      if (!this.data.contractor)    { showToast('Contractor is required', 'error');       return false }
      if (!this.data.siteLocation)  { showToast('Site location is required', 'error');   return false }
      if (!this.data.startDate)     { showToast('Start date is required', 'error');      return false }
      if (!this.data.expectedEndDate) { showToast('Expected end date is required', 'error'); return false }
    }
    if (this.step === 2) {
      if (!this.data.zones.length)  { showToast('Add at least one zone', 'error');       return false }
    }
    return true
  }

  _next() {
    if (!this._validate()) return
    this.step++
    this._renderStep()
    document.getElementById('step-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  _prev() {
    this.step--
    this._renderStep()
  }

  async _save() {
    if (this.saving) return
    if (!this._validate()) return

    this.saving = true
    const btn = document.getElementById('save-btn')
    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving…'; btn.disabled = true }

    try {
      // Assign mock IDs if MS Project not configured
      if (!isMsConfigured()) {
        if (!this.data.msProjectId) this.data.msProjectId = genMockGuid()
        this.data.msProjectUrl = this.data.msProjectUrl || ''
        this.data.syncStatus   = 'mock'
        // Ensure every zone + activity has msTaskId
        this.data.zones = this.data.zones.map(z => ({
          ...z,
          msTaskId: z.msTaskId || genMockGuid(),
          activities: (z.activities || []).map(a => ({
            ...a,
            msTaskId: a.msTaskId || genMockGuid(),
          })),
        }))
        this.data.resourceTemplates = this.data.resourceTemplates.map(r => ({
          ...r,
          msResourceId: r.msResourceId || genMockGuid(),
        }))
      } else {
        // Try to sync zones to MS Project Online
        try {
          const result = await msSync.syncProjectZones(this.data)
          this.data.zones      = result.zones
          this.data.syncStatus = result.mock ? 'mock' : 'synced'
        } catch (syncErr) {
          console.warn('MS Project sync failed, using mock IDs:', syncErr.message)
          this.data.syncStatus = 'mock'
          this.data.zones = this.data.zones.map(z => ({
            ...z,
            msTaskId: z.msTaskId || genMockGuid(),
            activities: (z.activities || []).map(a => ({
              ...a, msTaskId: a.msTaskId || genMockGuid(),
            })),
          }))
        }
      }

      await DB.putProject(this.data)
      showToast('Project created successfully!', 'success')
      setTimeout(() => app.navTo(`#/projects/${this.data.id}`), 600)
    } catch (e) {
      showToast('Failed to save project: ' + e.message, 'error')
      if (btn) { btn.innerHTML = '<i class="fas fa-save mr-2"></i>Save Project'; btn.disabled = false }
    } finally {
      this.saving = false
    }
  }

  // ── Utility ───────────────────────────────────────────────
  _esc(s) {
    if (s == null) return ''
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;')
  }
}
