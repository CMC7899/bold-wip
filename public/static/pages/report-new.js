// ============================================================
// DAILY REPORT FORM – 5-step mobile-first form
// Offline-capable (Steps 2 & 3 work without network)
// Auto-saves draft to IndexedDB
// ============================================================
import { DB, genId, genReportNo, todayISO, getActivities, formatDate,
         isMsConfigured, genMockGuid, progressColor, getLastReportProgress } from '../db.js'

const WEATHER_OPTIONS = ['Sunny', 'Rainy', 'Cloudy', 'Windy', 'Fog']
const WEATHER_EMOJI   = { Sunny: '☀️', Rainy: '🌧️', Cloudy: '⛅', Windy: '💨', Fog: '🌫️' }

export class ReportNewPage {
  constructor() {
    this.step       = 1
    this.totalSteps = 5
    this.project    = null
    this.photos     = []
    this._autosaveTimer = null

    const qs = new URLSearchParams((location.hash.split('?')[1]) || '')
    this.projectId = qs.get('projectId') || ''
    this.draftKey  = 'bolt_draft_' + (this.projectId || 'general')

    this.data = {
      id:              genId(),
      projectId:       this.projectId,
      reportDate:      todayISO(),
      reportNo:        '',
      weatherAm:       'Sunny',
      weatherPm:       'Sunny',
      workStart:       '09:00',
      workEnd:         '19:00',
      stopWorkTime:    '',
      resumeWorkTime:  '',
      manpowerLog:     [],
      machineryLog:    [],
      zoneProgress:    [],
      remarks:         '',
      plannedActivities: '',
      exceptions:      '',
      preparedBy:      localStorage.getItem('bolt_user_name') || '',
      submittedAt:     '',
      syncStatus:      isMsConfigured() ? 'pending' : 'mock',
      photos:          [],
      isDraft:         true,
    }
  }

  async render(container) {
    app.setHeaderTitle('New Daily Report', `
      <button onclick="reportNewPage && reportNewPage._saveDraft(true)"
        class="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
        <i class="fas fa-save mr-1"></i>Draft
      </button>`)

    // Restore draft from localStorage (works offline)
    // Note: zoneProgress is excluded from draft restore since it always comes from the last submitted report
    this._tryRestoreDraft()

    // Load project
    if (this.projectId) {
      this.project = await DB.getProject(this.projectId)
    }

    if (!this.project) {
      await this._renderProjectSelector(container)
      return
    }

    // Compute the pre-fill zone progress from the last submitted report
    const prevReports = await DB.getReportsByProject(this.projectId)
    const lastZp = getLastReportProgress(prevReports)
    const prefillZoneProgress = (this.project.zones || []).map(z => {
      const lastZone = lastZp?.find(lz => lz.zoneConfigId === z.id)
      return {
        zoneConfigId: z.id,
        zoneCode:     z.zoneCode,
        activities:   (z.activities || []).map(a => ({
          activityId:      a.id,
          activityName:    a.name || a.activityName || '',
          percentComplete: lastZone?.activities?.find(la => la.activityId === a.id)?.percentComplete || 0,
        })),
      }
    })

    // Pre-fill zoneProgress if not already set (e.g. from draft restore)
    if (!this.data.zoneProgress?.length) {
      this.data.zoneProgress = prefillZoneProgress
    }

    // Init manpower / machinery
    if (!this.data.manpowerLog?.length) {
      this.data.manpowerLog = (this.project.resourceTemplates || [])
        .filter(r => r.type === 'MANPOWER')
        .map(r => ({ resourceTemplateId: r.id, roleName: r.roleName || '', quantity: 0 }))
    }
    if (!this.data.machineryLog?.length) {
      this.data.machineryLog = (this.project.resourceTemplates || [])
        .filter(r => r.type === 'MACHINERY')
        .map(r => ({ resourceTemplateId: r.id, equipmentName: r.roleName || '', quantity: 0 }))
    }

    // Auto-generate report number
    if (!this.data.reportNo) {
      this.data.reportNo = await genReportNo(this.projectId, this.data.reportDate)
    }

    container.innerHTML = `
      <div class="max-w-2xl mx-auto">
        <!-- Sticky progress header -->
        <div id="form-header" class="sticky top-14 lg:top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
          <div class="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span class="font-semibold text-brand-800 truncate max-w-[60%]">
              <i class="fas fa-clipboard-list mr-1"></i>${this._esc(this.project.name)}
            </span>
            <span class="flex-shrink-0">Step ${this.step} of ${this.totalSteps}</span>
          </div>
          <div id="step-indicator" class="flex items-center gap-1"></div>
        </div>

        <!-- Step content -->
        <div id="step-content" class="px-4 py-5"></div>

        <!-- Navigation bar -->
        <div id="step-nav"
          class="sticky bottom-20 lg:bottom-0 z-20 px-4 py-3 bg-white border-t border-gray-100 shadow-md flex gap-3"></div>
      </div>`

    window.reportNewPage = this
    this._renderStep()
    this._startAutosave()
  }

  // ── Draft management (localStorage – works offline) ───────

  _tryRestoreDraft() {
    try {
      const raw = localStorage.getItem(this.draftKey)
      if (!raw) return
      const saved = JSON.parse(raw)
      if (saved && saved.projectId === this.projectId) {
        if (confirm('You have an unsaved draft. Restore it?')) {
          const { id, reportNo, zoneProgress: draftZp, ...rest } = saved
          // Preserve pre-filled zoneProgress from last report; only restore if draft has it
          const mergedZp = (draftZp && draftZp.length)
            ? draftZp
            : this.data.zoneProgress
          Object.assign(this.data, rest, { zoneProgress: mergedZp })
          if (Array.isArray(saved._photos)) this.photos = saved._photos
        }
      }
    } catch { /* ignore */ }
  }

  async _saveDraft(notify = false) {
    try {
      const payload = { ...this.data, _photos: this.photos }
      localStorage.setItem(this.draftKey, JSON.stringify(payload))
      // Also persist to IndexedDB
      await DB.putDraft({ ...this.data, id: this.draftKey })
      if (notify) showToast('Draft saved', 'info')
    } catch { /* ignore */ }
  }

  _startAutosave() {
    this._autosaveTimer = setInterval(() => this._saveDraft(false), 30000)
  }

  _stopAutosave() {
    if (this._autosaveTimer) clearInterval(this._autosaveTimer)
  }

  _clearDraft() {
    localStorage.removeItem(this.draftKey)
    DB.deleteDraft(this.draftKey).catch(() => {})
  }

  // ── Project selector ──────────────────────────────────────

  async _renderProjectSelector(container) {
    const projects = await DB.getAllProjects()
    const active   = projects.filter(p => p.status === 'active')
    container.innerHTML = `
      <div class="max-w-lg mx-auto px-4 py-10">
        <div class="text-center mb-8">
          <div class="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-clipboard-list text-2xl text-brand-800"></i>
          </div>
          <h2 class="text-xl font-bold text-gray-900">Select Project</h2>
          <p class="text-sm text-gray-500 mt-1">Choose the project for this daily report</p>
        </div>
        ${active.length === 0
          ? `<div class="text-center py-8 bg-white rounded-2xl border border-gray-200">
              <p class="text-gray-500 mb-4">No active projects found</p>
              <button onclick="app.navTo('#/projects/new')"
                class="px-4 py-2.5 bg-brand-800 text-white rounded-xl text-sm font-semibold">
                Create a Project First
              </button>
            </div>`
          : `<div class="space-y-3">
              ${active.map(p => `
                <div onclick="reportNewPage._selectProject('${p.id}')"
                  class="flex items-center gap-4 p-4 bg-white border-2 border-gray-200 rounded-2xl cursor-pointer
                    hover:border-brand-500 hover:bg-brand-50 transition-all active:scale-[0.99]">
                  <div class="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-hard-hat text-brand-800 text-lg"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-bold text-gray-900 truncate">${this._esc(p.name || 'Untitled')}</div>
                    <div class="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <i class="fas fa-map-marker-alt"></i>
                      ${this._esc(p.siteLocation || '–')}
                    </div>
                  </div>
                  <i class="fas fa-chevron-right text-gray-300 flex-shrink-0"></i>
                </div>`).join('')}
            </div>`}
      </div>`
  }

  async _selectProject(pid) {
    this.projectId = pid
    this.draftKey  = 'bolt_draft_' + pid
    this.data.projectId = pid
    location.hash  = `#/reports/new?projectId=${pid}`
    await this.render(document.getElementById('page-content'))
  }

  // ── Step rendering ────────────────────────────────────────

  _renderStep() {
    this._renderIndicator()
    this._renderContent()
    this._renderNav()
  }

  _renderIndicator() {
    const labels = ['Header', 'Resources', 'Progress', 'Notes', 'Preview']
    const icons  = ['fa-calendar-alt', 'fa-users', 'fa-tasks', 'fa-sticky-note', 'fa-eye']
    document.getElementById('step-indicator').innerHTML = `
      <div class="flex items-center w-full">
        ${labels.map((l, i) => {
          const n     = i + 1
          const state = n < this.step ? 'done' : n === this.step ? 'active' : 'inactive'
          return `
            ${i > 0 ? `<div class="step-line flex-1 ${n <= this.step ? 'done' : ''}"></div>` : ''}
            <div class="flex flex-col items-center gap-0.5">
              <div class="step-dot ${state}">
                ${state === 'done'
                  ? '<i class="fas fa-check" style="font-size:8px"></i>'
                  : `<i class="fas ${icons[i]}" style="font-size:8px"></i>`}
              </div>
              <span class="text-xs hidden sm:block whitespace-nowrap
                ${state === 'active' ? 'text-brand-800 font-semibold' : state === 'done' ? 'text-emerald-600' : 'text-gray-400'}">${l}</span>
            </div>`
        }).join('')}
      </div>`
  }

  _renderContent() {
    const el = document.getElementById('step-content')
    const renders = {
      1: () => this._step1(),
      2: () => this._step2(),
      3: () => this._step3(),
      4: () => this._step4(),
      5: () => this._step5(),
    }
    el.innerHTML = (renders[this.step] || (() => ''))()
  }

  _renderNav() {
    const labels = ['', 'Report Header', 'Resources', 'Zone Progress', 'Remarks & Photos', 'Preview']
    document.getElementById('step-nav').innerHTML = `
      <div class="flex gap-3 w-full">
        ${this.step > 1 ? `
          <button onclick="reportNewPage._prev()"
            class="flex-none py-3 px-5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100">
            <i class="fas fa-arrow-left mr-1"></i>Back
          </button>` : ''}
        ${this.step < this.totalSteps ? `
          <button onclick="reportNewPage._next()"
            class="flex-1 py-3 px-4 rounded-xl bg-brand-800 text-white text-sm font-semibold hover:bg-brand-700 active:bg-brand-900 transition-colors">
            ${labels[this.step + 1]} <i class="fas fa-arrow-right ml-1"></i>
          </button>` : ''}
      </div>`
  }

  // ── STEP 1: Report Header ─────────────────────────────────

  _step1() {
    const d = this.data
    return `
      <div>
        <h2 class="text-lg font-bold text-gray-900 mb-1">Report Header</h2>
        <p class="text-sm text-gray-500 mb-5">Date, working hours and site conditions</p>

        <div class="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label class="field-label">Date *</label>
            <input id="r-date" type="date" value="${d.reportDate}"
              onchange="reportNewPage._onDateChange(this.value)"
              class="field-input" />
          </div>
          <div>
            <label class="field-label">Report No.</label>
            <input type="text" value="${this._esc(d.reportNo)}" readonly
              class="field-input bg-gray-50 text-gray-500 font-mono text-xs cursor-not-allowed" />
          </div>
        </div>

        <div class="bg-gray-50 rounded-2xl p-4 mb-4">
          <label class="field-label"><i class="fas fa-clock mr-1 text-brand-600"></i>Working Hours</label>
          <div class="grid grid-cols-2 gap-3 mt-2">
            <div>
              <label class="text-xs text-gray-500 mb-1 block">Start</label>
              <input id="r-start" type="time" value="${d.workStart}"
                class="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
            </div>
            <div>
              <label class="text-xs text-gray-500 mb-1 block">End</label>
              <input id="r-end" type="time" value="${d.workEnd}"
                class="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label class="text-xs text-gray-500 mb-1 block">Stop Work <span class="text-gray-300">(optional)</span></label>
              <input id="r-stop" type="time" value="${d.stopWorkTime || ''}"
                class="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
            </div>
            <div>
              <label class="text-xs text-gray-500 mb-1 block">Resume Work <span class="text-gray-300">(optional)</span></label>
              <input id="r-resume" type="time" value="${d.resumeWorkTime || ''}"
                class="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
            </div>
          </div>
        </div>

        <div class="mb-4">
          <label class="field-label"><i class="fas fa-sun mr-1 text-yellow-500"></i>Weather – Morning (AM)</label>
          <div class="flex flex-wrap gap-2 mt-2">
            ${WEATHER_OPTIONS.map(w => `
              <button onclick="reportNewPage._setWeather('am','${w}')"
                class="weather-chip px-3 py-2 rounded-xl border text-sm font-medium transition-all
                  ${d.weatherAm === w ? 'bg-brand-800 text-white border-brand-800 shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:border-brand-400'}"
                data-wam="${w}">
                ${WEATHER_EMOJI[w] || '🌤️'} ${w}
              </button>`).join('')}
          </div>
        </div>

        <div class="mb-4">
          <label class="field-label"><i class="fas fa-moon mr-1 text-indigo-400"></i>Weather – Afternoon (PM)</label>
          <div class="flex flex-wrap gap-2 mt-2">
            ${WEATHER_OPTIONS.map(w => `
              <button onclick="reportNewPage._setWeather('pm','${w}')"
                class="weather-chip px-3 py-2 rounded-xl border text-sm font-medium transition-all
                  ${d.weatherPm === w ? 'bg-brand-800 text-white border-brand-800 shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:border-brand-400'}"
                data-wpm="${w}">
                ${WEATHER_EMOJI[w] || '🌤️'} ${w}
              </button>`).join('')}
          </div>
        </div>

        <div>
          <label class="field-label">Prepared By *</label>
          <input id="r-by" type="text" value="${this._esc(d.preparedBy)}"
            placeholder="Site Supervisor full name" class="field-input" />
        </div>
      </div>`
  }

  async _onDateChange(newDate) {
    this.data.reportDate = newDate
    this.data.reportNo   = await genReportNo(this.projectId, newDate)
    const rno = document.querySelector('input[readonly]')
    if (rno) rno.value = this.data.reportNo
  }

  _setWeather(period, val) {
    if (period === 'am') {
      this.data.weatherAm = val
      document.querySelectorAll('[data-wam]').forEach(b => {
        const active = b.dataset.wam === val
        b.className = `weather-chip px-3 py-2 rounded-xl border text-sm font-medium transition-all
          ${active ? 'bg-brand-800 text-white border-brand-800 shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:border-brand-400'}`
      })
    } else {
      this.data.weatherPm = val
      document.querySelectorAll('[data-wpm]').forEach(b => {
        const active = b.dataset.wpm === val
        b.className = `weather-chip px-3 py-2 rounded-xl border text-sm font-medium transition-all
          ${active ? 'bg-brand-800 text-white border-brand-800 shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:border-brand-400'}`
      })
    }
  }

  _collectStep1() {
    this.data.reportDate     = document.getElementById('r-date')?.value   || this.data.reportDate
    this.data.workStart      = document.getElementById('r-start')?.value  || this.data.workStart
    this.data.workEnd        = document.getElementById('r-end')?.value    || this.data.workEnd
    this.data.stopWorkTime   = document.getElementById('r-stop')?.value   || ''
    this.data.resumeWorkTime = document.getElementById('r-resume')?.value || ''
    this.data.preparedBy     = document.getElementById('r-by')?.value.trim() || this.data.preparedBy
    if (this.data.preparedBy) localStorage.setItem('bolt_user_name', this.data.preparedBy)
  }

  // ── STEP 2: Manpower & Machinery ─────────────────────────

  _step2() {
    const d = this.data
    return `
      <div>
        <h2 class="text-lg font-bold text-gray-900 mb-1">Manpower &amp; Machinery</h2>
        <p class="text-sm text-gray-500 mb-5">Enter quantities for today's site resources</p>

        <!-- Manpower -->
        <div class="mb-6">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <i class="fas fa-hard-hat text-blue-600 text-sm"></i>
            </div>
            <h3 class="font-bold text-gray-800">Manpower</h3>
          </div>
          ${d.manpowerLog.length === 0
            ? `<p class="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-xl">
                No manpower roles configured for this project</p>`
            : `<div class="space-y-2">
                ${d.manpowerLog.map((log, i) => `
                  <div class="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-sm text-gray-900 truncate">${this._esc(log.roleName)}</div>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                      <button onclick="reportNewPage._adjQty('mp',${i},-1)"
                        class="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300 text-xl font-bold select-none">−</button>
                      <input type="number" min="0" value="${log.quantity}"
                        oninput="reportNewPage.data.manpowerLog[${i}].quantity=Math.max(0,parseInt(this.value)||0);this.value=reportNewPage.data.manpowerLog[${i}].quantity"
                        class="w-14 text-center py-2 rounded-lg border border-gray-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      <button onclick="reportNewPage._adjQty('mp',${i},1)"
                        class="w-9 h-9 flex items-center justify-center rounded-lg bg-brand-800 text-white hover:bg-brand-700 active:bg-brand-900 text-xl font-bold select-none">+</button>
                    </div>
                  </div>`).join('')}
              </div>`}
          <button onclick="reportNewPage._addCustomRes('MANPOWER')"
            class="w-full mt-3 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500
              hover:border-brand-400 hover:text-brand-600 transition-colors">
            <i class="fas fa-plus mr-1"></i>Add Custom Manpower
          </button>
        </div>

        <!-- Machinery -->
        <div>
          <div class="flex items-center gap-2 mb-3">
            <div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <i class="fas fa-cogs text-amber-600 text-sm"></i>
            </div>
            <h3 class="font-bold text-gray-800">Machinery / Equipment</h3>
          </div>
          ${d.machineryLog.length === 0
            ? `<p class="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-xl">
                No machinery configured for this project</p>`
            : `<div class="space-y-2">
                ${d.machineryLog.map((log, i) => `
                  <div class="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-sm text-gray-900 truncate">${this._esc(log.equipmentName)}</div>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                      <button onclick="reportNewPage._adjQty('mc',${i},-1)"
                        class="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-xl font-bold select-none">−</button>
                      <input type="number" min="0" value="${log.quantity}"
                        oninput="reportNewPage.data.machineryLog[${i}].quantity=Math.max(0,parseInt(this.value)||0);this.value=reportNewPage.data.machineryLog[${i}].quantity"
                        class="w-14 text-center py-2 rounded-lg border border-gray-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      <button onclick="reportNewPage._adjQty('mc',${i},1)"
                        class="w-9 h-9 flex items-center justify-center rounded-lg bg-brand-800 text-white hover:bg-brand-700 text-xl font-bold select-none">+</button>
                    </div>
                  </div>`).join('')}
              </div>`}
          <button onclick="reportNewPage._addCustomRes('MACHINERY')"
            class="w-full mt-3 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500
              hover:border-brand-400 hover:text-brand-600 transition-colors">
            <i class="fas fa-plus mr-1"></i>Add Custom Machinery
          </button>
        </div>
      </div>`
  }

  _adjQty(type, idx, delta) {
    if (type === 'mp') {
      this.data.manpowerLog[idx].quantity = Math.max(0, (this.data.manpowerLog[idx].quantity || 0) + delta)
    } else {
      this.data.machineryLog[idx].quantity = Math.max(0, (this.data.machineryLog[idx].quantity || 0) + delta)
    }
    this._renderContent()
    this._renderNav()
  }

  _addCustomRes(type) {
    const name = prompt(`Enter ${type === 'MANPOWER' ? 'role' : 'equipment'} name:`)
    if (!name?.trim()) return
    if (type === 'MANPOWER') {
      this.data.manpowerLog.push({ resourceTemplateId: genId(), roleName: name.trim(), quantity: 0 })
    } else {
      this.data.machineryLog.push({ resourceTemplateId: genId(), equipmentName: name.trim(), quantity: 0 })
    }
    this._renderContent()
    this._renderNav()
  }

  // ── STEP 3: Zone Progress (offline-capable) ───────────────

  _step3() {
    const zp = this.data.zoneProgress || []
    return `
      <div>
        <h2 class="text-lg font-bold text-gray-900 mb-1">Zone Progress</h2>
        <p class="text-sm text-gray-500 mb-5">Update completion % for each activity (0–100)</p>
        ${!zp.length
          ? `<div class="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
              <i class="fas fa-layer-group text-3xl text-gray-300 mb-3 block"></i>
              <p class="text-gray-500 text-sm">No zones configured in this project</p>
            </div>`
          : `<div class="space-y-3" id="zones-accordion">
              ${zp.map((z, zi) => this._renderZoneAccordion(z, zi)).join('')}
            </div>`}
      </div>`
  }

  _renderZoneAccordion(zp, zi) {
    const avg      = zp.activities.length
      ? Math.round(zp.activities.reduce((s, a) => s + (a.percentComplete || 0), 0) / zp.activities.length) : 0
    const zone     = (this.project.zones || []).find(z => z.id === zp.zoneConfigId)
    const isBIPV   = zone?.zoneType === 'BIPV'
    const col      = progressColor(avg)
    return `
      <div class="border border-gray-200 rounded-2xl overflow-hidden" id="zone-acc-${zi}">
        <div class="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer select-none"
          onclick="reportNewPage._toggleZone(${zi})">
          <div class="flex items-center gap-3">
            <span class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0
              ${isBIPV ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}">
              ${isBIPV ? 'B' : 'S'}
            </span>
            <div>
              <div class="font-bold text-sm text-gray-900">${this._esc(zp.zoneCode)}</div>
              <div class="text-xs text-gray-400">${zone?.zoneType || 'STANDARD'} · ${zp.activities.length} activities</div>
            </div>
          </div>
          <div class="flex items-center gap-3 flex-shrink-0">
            <div class="text-right">
              <div class="text-sm font-black" id="zone-avg-${zi}" style="color:${col}">${avg}%</div>
              <div class="w-20 h-1.5 bg-gray-200 rounded-full mt-0.5 overflow-hidden">
                <div class="h-full rounded-full transition-all" id="zone-bar-${zi}"
                  style="width:${avg}%;background:${col}"></div>
              </div>
            </div>
            <i class="fas fa-chevron-down text-gray-400 text-xs transition-transform" id="zone-chev-${zi}"></i>
          </div>
        </div>
        <div class="hidden px-4 py-4 bg-white space-y-4" id="zone-body-${zi}">
          ${zp.activities.map((act, ai) => {
            const pct  = act.percentComplete || 0
            const aCol = progressColor(pct)
            return `
              <div>
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <span class="w-5 h-5 rounded bg-gray-100 text-gray-500 text-xs flex items-center justify-center font-medium flex-shrink-0">${ai + 1}</span>
                    <span class="text-sm font-medium text-gray-800 truncate">${this._esc(act.activityName || '')}</span>
                  </div>
                  <div class="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    <input type="number" min="0" max="100" value="${pct}"
                      id="pct-num-${zi}-${ai}"
                      oninput="reportNewPage._setPct(${zi},${ai},parseInt(this.value)||0)"
                      class="w-14 text-center py-1.5 rounded-lg border border-gray-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500" />
                    <span class="text-xs text-gray-400 font-medium">%</span>
                  </div>
                </div>
                <input type="range" min="0" max="100" value="${pct}"
                  id="pct-rng-${zi}-${ai}"
                  oninput="reportNewPage._setPct(${zi},${ai},parseInt(this.value)||0)"
                  class="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style="accent-color:${aCol}" />
              </div>`
          }).join('')}
        </div>
      </div>`
  }

  _toggleZone(zi) {
    const body  = document.getElementById(`zone-body-${zi}`)
    const chev  = document.getElementById(`zone-chev-${zi}`)
    if (!body) return
    body.classList.toggle('hidden')
    if (chev) chev.style.transform = body.classList.contains('hidden') ? '' : 'rotate(180deg)'
  }

  _setPct(zi, ai, val) {
    val = Math.max(0, Math.min(100, val || 0))
    this.data.zoneProgress[zi].activities[ai].percentComplete = val

    // Sync num ↔ range
    const num = document.getElementById(`pct-num-${zi}-${ai}`)
    const rng = document.getElementById(`pct-rng-${zi}-${ai}`)
    if (num && parseInt(num.value) !== val) num.value = val
    if (rng && parseInt(rng.value) !== val) rng.value = val

    // Update zone average display
    const zp  = this.data.zoneProgress[zi]
    const avg = Math.round(zp.activities.reduce((s, a) => s + (a.percentComplete || 0), 0) / zp.activities.length)
    const col = progressColor(avg)
    const avgEl = document.getElementById(`zone-avg-${zi}`)
    const barEl = document.getElementById(`zone-bar-${zi}`)
    if (avgEl) { avgEl.textContent = avg + '%'; avgEl.style.color = col }
    if (barEl) { barEl.style.width = avg + '%'; barEl.style.background = col }

    // Update range color
    if (rng) rng.style.accentColor = progressColor(val)
  }

  // ── STEP 4: Remarks, Notes & Photos ──────────────────────

  _step4() {
    const d = this.data
    return `
      <div>
        <h2 class="text-lg font-bold text-gray-900 mb-1">Remarks &amp; Photos</h2>
        <p class="text-sm text-gray-500 mb-5">Document observations, plans, issues and site evidence</p>

        <div class="space-y-4">
          <div>
            <label class="field-label">
              <i class="fas fa-sticky-note mr-1 text-yellow-500"></i>Remarks / Site Observations
            </label>
            <textarea id="r-remarks" rows="4"
              placeholder="Describe significant events, activity progress, materials on site…"
              oninput="reportNewPage._step4Input('remarks', this.value)"
              class="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none mt-1">${this._escTA(d.remarks)}</textarea>
          </div>
          <div>
            <label class="field-label">
              <i class="fas fa-calendar-check mr-1 text-blue-500"></i>Planned Activities (Tomorrow)
            </label>
            <textarea id="r-planned" rows="3"
              placeholder="What is planned for the next working day…"
              oninput="reportNewPage._step4Input('plannedActivities', this.value)"
              class="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none mt-1">${this._escTA(d.plannedActivities)}</textarea>
          </div>
          <div>
            <label class="field-label">
              <i class="fas fa-exclamation-triangle mr-1 text-red-500"></i>Exceptions / Issues
            </label>
            <textarea id="r-exceptions" rows="3"
              placeholder="Any delays, safety incidents, non-conformances…"
              oninput="reportNewPage._step4Input('exceptions', this.value)"
              class="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none mt-1">${this._escTA(d.exceptions)}</textarea>
          </div>

          <!-- Photo upload -->
          <div>
            <label class="field-label">
              <i class="fas fa-camera mr-1 text-purple-500"></i>Site Photos – Evidence
              ${this.photos.length ? `<span class="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">${this.photos.length} attached</span>` : ''}
            </label>
            <div class="photo-grid mt-2" id="photo-grid">
              ${this.photos.map((ph, i) => `
                <div class="relative group">
                  <img src="${ph.dataUrl}" class="photo-thumb cursor-pointer"
                    onclick="reportNewPage._viewPhoto(${i})" alt="${this._esc(ph.caption)}" />
                  <button onclick="reportNewPage._removePhoto(${i})"
                    class="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs
                      flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="fas fa-times" style="font-size:8px"></i>
                  </button>
                  ${ph.caption ? `
                    <div class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1
                      rounded-b-lg text-center truncate">${this._esc(ph.caption)}</div>` : ''}
                </div>`).join('')}
              <label class="photo-add-btn cursor-pointer flex flex-col items-center justify-center gap-1
                border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-brand-50 hover:border-brand-400 transition-colors"
                style="min-height:80px">
                <i class="fas fa-camera text-2xl text-gray-400"></i>
                <span class="text-xs text-gray-500">Add Photo</span>
                <input type="file" accept="image/*" multiple capture="environment" class="hidden"
                  onchange="reportNewPage._handlePhotos(event)" />
              </label>
            </div>
          </div>
        </div>
      </div>`
  }

  _collectStep4() {
    const remEl   = document.getElementById('r-remarks')
    const planEl  = document.getElementById('r-planned')
    const exclEl  = document.getElementById('r-exceptions')
    if (remEl)  this.data.remarks           = remEl.value
    if (planEl) this.data.plannedActivities = planEl.value
    if (exclEl) this.data.exceptions        = exclEl.value
  }

  _step4Input(field, value) {
    this.data[field] = value
  }

  async _handlePhotos(event) {
    const files = Array.from(event.target.files || [])
    for (const file of files) {
      const dataUrl = await new Promise(res => {
        const fr = new FileReader()
        fr.onload = e => res(e.target.result)
        fr.readAsDataURL(file)
      })
      // Optionally compress large images
      const caption = ''  // user can add caption on view
      this.photos.push({
        id: genId(), reportId: this.data.id, dataUrl,
        caption, name: file.name, takenAt: new Date().toISOString(),
      })
    }
    this._renderContent()
    this._renderNav()
  }

  _removePhoto(i) {
    this.photos.splice(i, 1)
    this._renderContent()
    this._renderNav()
  }

  _viewPhoto(i) {
    const ph = this.photos[i]
    const overlay = document.createElement('div')
    overlay.className = 'fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4'
    overlay.innerHTML = `
      <div class="relative max-w-lg w-full">
        <img src="${ph.dataUrl}" class="w-full rounded-2xl shadow-2xl" />
        ${ph.caption ? `<p class="text-white text-center mt-3 text-sm">${this._esc(ph.caption)}</p>` : ''}
        <button onclick="this.closest('.fixed').remove()"
          class="absolute -top-4 -right-4 w-9 h-9 bg-white rounded-full text-gray-700
            flex items-center justify-center shadow-lg hover:bg-gray-100">
          <i class="fas fa-times"></i>
        </button>
      </div>`
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })
    document.body.appendChild(overlay)
  }

  // ── STEP 5: Preview & Submit ──────────────────────────────

  _step5() {
    const d   = this.data
    const totalMP = d.manpowerLog.reduce((s, r) => s + (r.quantity || 0), 0)
    const totalMC = d.machineryLog.filter(r => r.quantity > 0).length
    return `
      <div>
        <h2 class="text-lg font-bold text-gray-900 mb-1">Preview &amp; Submit</h2>
        <p class="text-sm text-gray-500 mb-5">Review your report before submitting</p>

        <!-- Summary card -->
        <div class="bg-gradient-to-br from-brand-800 to-brand-900 rounded-2xl text-white p-5 mb-4 shadow-lg">
          <div class="flex items-start justify-between mb-3">
            <div>
              <div class="text-white/50 text-xs uppercase tracking-wider">Daily Report</div>
              <div class="font-mono font-bold text-xl mt-0.5">${this._esc(d.reportNo)}</div>
              <div class="text-white/70 text-sm mt-0.5">${formatDate(d.reportDate)}</div>
            </div>
            <div class="text-right">
              <div class="text-xs text-white/50">Project</div>
              <div class="font-semibold text-sm mt-0.5 max-w-32 truncate">${this._esc(this.project?.name || '–')}</div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-white/20">
            <div><div class="text-white/50">AM Weather</div><div class="mt-0.5">${WEATHER_EMOJI[d.weatherAm] || ''} ${d.weatherAm}</div></div>
            <div><div class="text-white/50">PM Weather</div><div class="mt-0.5">${WEATHER_EMOJI[d.weatherPm] || ''} ${d.weatherPm}</div></div>
            <div><div class="text-white/50">Work Hours</div><div class="mt-0.5">${d.workStart} – ${d.workEnd}</div></div>
            <div><div class="text-white/50">Prepared By</div><div class="mt-0.5 truncate">${this._esc(d.preparedBy || '–')}</div></div>
          </div>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-3 gap-3 mb-4">
          <div class="bg-blue-50 rounded-2xl p-3 border border-blue-100 text-center">
            <div class="text-2xl font-black text-blue-700">${totalMP}</div>
            <div class="text-xs text-blue-500 mt-0.5">Manpower</div>
          </div>
          <div class="bg-amber-50 rounded-2xl p-3 border border-amber-100 text-center">
            <div class="text-2xl font-black text-amber-700">${totalMC}</div>
            <div class="text-xs text-amber-500 mt-0.5">Equipment</div>
          </div>
          <div class="bg-purple-50 rounded-2xl p-3 border border-purple-100 text-center">
            <div class="text-2xl font-black text-purple-700">${this.photos.length}</div>
            <div class="text-xs text-purple-500 mt-0.5">Photos</div>
          </div>
        </div>

        <!-- Zone summary -->
        <div class="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
          <h4 class="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
            <i class="fas fa-layer-group text-brand-600"></i> Zone Progress Summary
          </h4>
          <div class="space-y-2">
            ${d.zoneProgress.map(zp => {
              const avg = zp.activities.length
                ? Math.round(zp.activities.reduce((s,a) => s+(a.percentComplete||0), 0) / zp.activities.length) : 0
              const col = progressColor(avg)
              return `
                <div class="flex items-center gap-3">
                  <span class="text-sm font-semibold text-gray-700 w-14 flex-shrink-0">${this._esc(zp.zoneCode)}</span>
                  <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all" style="width:${avg}%;background:${col}"></div>
                  </div>
                  <span class="text-xs font-bold w-9 text-right flex-shrink-0" style="color:${col}">${avg}%</span>
                </div>`
            }).join('')}
          </div>
        </div>

        ${d.remarks ? `
        <div class="bg-yellow-50 border border-yellow-100 rounded-2xl p-4 mb-4">
          <div class="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-1">Remarks / Site Observations</div>
          <p class="text-sm text-yellow-900 whitespace-pre-wrap">${this._esc(d.remarks)}</p>
        </div>` : ''}
        ${d.plannedActivities ? `
        <div class="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-4">
          <div class="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Planned Activities (Tomorrow)</div>
          <p class="text-sm text-blue-900 whitespace-pre-wrap">${this._esc(d.plannedActivities)}</p>
        </div>` : ''}
        ${d.exceptions ? `
        <div class="bg-red-50 border border-red-100 rounded-2xl p-4 mb-4">
          <div class="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Exceptions / Issues</div>
          <p class="text-sm text-red-900 whitespace-pre-wrap">${this._esc(d.exceptions)}</p>
        </div>` : ''}

        ${this.photos.length ? `
        <div class="mb-4">
          <div class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">${this.photos.length} Photo(s) Attached</div>
          <div class="photo-grid">
            ${this.photos.slice(0, 6).map(ph => `<img src="${ph.dataUrl}" class="photo-thumb rounded-xl" />`).join('')}
          </div>
        </div>` : ''}

        <!-- Validation errors -->
        <div id="val-errors" class="mb-4"></div>

        <!-- Submit -->
        <button id="submit-btn" onclick="reportNewPage._submit()"
          class="w-full py-4 bg-emerald-600 text-white rounded-2xl text-base font-bold
            hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-lg">
          <i class="fas fa-paper-plane mr-2"></i>Submit Daily Report
        </button>
        <p class="text-xs text-gray-400 text-center mt-2">
          Saved locally · ${isMsConfigured() ? 'Will sync to MS Project Online' : 'Demo mode – mock IDs assigned'}
        </p>
      </div>`
  }

  // ── Navigation ────────────────────────────────────────────

  async _validate() {
    if (this.step === 1) {
      this._collectStep1()
      if (!this.data.preparedBy) { showToast('Enter your name in "Prepared By"', 'error'); return false }
      if (!this.data.reportDate) { showToast('Select a report date', 'error');              return false }
    }
    if (this.step === 3) {
      // Only warn – do not block navigation if no zones configured
      const hasZones = (this.data.zoneProgress || []).length > 0
      if (hasZones) {
        const ok = (this.data.zoneProgress || []).some(zp =>
          (zp.activities || []).some(a => (a.percentComplete || 0) > 0))
        if (!ok) { showToast('Update at least one activity percentage', 'warning'); return false }
      }
    }
    return true
  }

  async _next() {
    if (!await this._validate()) return
    if (this.step === 4) this._collectStep4()
    this.step++
    document.getElementById('step-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    this._renderStep()
    await this._saveDraft()
  }

  _prev() {
    if (this.step === 5) this._collectStep4()
    this.step--
    this._renderStep()
  }

  async _submit() {
    this._collectStep4()
    const errors = []
    if (!this.data.preparedBy) errors.push('Prepared By is required')
    if (!this.data.reportDate) errors.push('Report date is required')
    // Only require zone progress if zones exist
    const hasZones = (this.data.zoneProgress || []).length > 0
    if (hasZones) {
      const hasProgress = (this.data.zoneProgress || []).some(zp =>
        (zp.activities || []).some(a => (a.percentComplete || 0) > 0))
      if (!hasProgress) errors.push('At least one zone activity must have progress recorded')
    }

    const errEl = document.getElementById('val-errors')
    if (errors.length) {
      if (errEl) errEl.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-xl p-3">
          ${errors.map(e => `<div class="text-sm text-red-700 flex items-center gap-2">
            <i class="fas fa-exclamation-circle"></i>${e}</div>`).join('')}
        </div>`
      return
    }
    if (errEl) errEl.innerHTML = ''

    const btn = document.getElementById('submit-btn')
    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Submitting…'; btn.disabled = true }

    // Attach photos to report data
    this.data.photos      = this.photos
    this.data.submittedAt = new Date().toISOString()
    this.data.isDraft     = false

    // Assign mock IDs to any photo that lacks an id
    this.data.photos = this.data.photos.map(ph => ({ ...ph, id: ph.id || genId() }))

    // Ensure the report itself has a stable ID
    if (!this.data.id) this.data.id = genId()

    // When MS Project is not configured, stamp every zone activity with a mock msTaskId
    if (!isMsConfigured()) {
      this.data.syncStatus = 'mock'
      this.data.zoneProgress = (this.data.zoneProgress || []).map(zp => ({
        ...zp,
        msTaskId: zp.msTaskId || genMockGuid(),
        activities: (zp.activities || []).map(a => ({
          ...a,
          msTaskId: a.msTaskId || genMockGuid(),
        })),
      }))
    }

    try {
      await DB.putReport(this.data)
      this._clearDraft()
      this._stopAutosave()
      showToast('Daily report submitted!', 'success')
      setTimeout(() => app.navTo(`#/reports/${this.data.id}`), 600)
    } catch (e) {
      showToast('Failed to save report: ' + e.message, 'error')
      if (btn) { btn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Submit Daily Report'; btn.disabled = false }
    }
  }

  // ── Helpers ───────────────────────────────────────────────
  _esc(s) {
    if (s == null) return ''
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;')
  }
  _escTA(s) {
    if (s == null) return ''
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  }
}
