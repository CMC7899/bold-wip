// ============================================================
// SETTINGS PAGE
// ============================================================
import { DB, genId, genMockGuid, getActivities, todayISO } from '../db.js'

export class SettingsPage {
  async render(container) {
    app.setHeaderTitle('Settings', '')
    const userName = localStorage.getItem('bolt_user_name') || ''
    const msConfig = JSON.parse(localStorage.getItem('bolt_ms_config') || '{}')

    container.innerHTML = `
    <div class="max-w-2xl mx-auto px-4 py-4 lg:py-8">
      <!-- Desktop header -->
      <div class="hidden lg:block mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Settings</h1>
        <p class="text-sm text-gray-500 mt-1">Configure user preferences and integrations</p>
      </div>

      <!-- User Profile -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <h2 class="font-bold text-gray-900 flex items-center gap-2 mb-4">
          <i class="fas fa-user-circle text-brand-600"></i> User Profile
        </h2>
        <div>
          <label class="field-label">Your Name (Site Supervisor)</label>
          <input id="s-user-name" type="text" value="${this._esc(userName)}"
            placeholder="Enter your full name" class="field-input" />
        </div>
        <button onclick="settingsPage.saveProfile()"
          class="mt-4 px-5 py-2.5 bg-brand-800 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors">
          <i class="fas fa-save mr-1"></i> Save Profile
        </button>
      </div>

      <!-- MS Project Online Config -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <h2 class="font-bold text-gray-900 flex items-center gap-2 mb-1">
          <i class="fab fa-microsoft text-blue-500"></i> MS Project Online Integration
        </h2>
        <p class="text-xs text-gray-500 mb-4">Configure Azure AD authentication for MS Project Online sync</p>

        <div class="p-3 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2
          ${msConfig.tenantId && msConfig.clientId && msConfig.pwaUrl
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            : 'bg-amber-50 border border-amber-200 text-amber-700'}">
          <i class="fas ${msConfig.tenantId && msConfig.clientId && msConfig.pwaUrl ? 'fa-check-circle text-emerald-500' : 'fa-exclamation-circle text-amber-500'}"></i>
          ${msConfig.tenantId && msConfig.clientId && msConfig.pwaUrl
            ? 'MS Project Online configured – live sync enabled'
            : 'Not configured – Demo Mode active (mock IDs assigned)'}
        </div>

        <div class="space-y-3">
          <div>
            <label class="field-label">PWA URL *</label>
            <input id="s-pwa-url" type="url" value="${this._esc(msConfig.pwaUrl || '')}"
              placeholder="https://company.sharepoint.com/sites/pwa"
              class="field-input" />
            <p class="text-xs text-gray-400 mt-1">Your SharePoint Project Web App URL</p>
          </div>
          <div>
            <label class="field-label">Tenant ID *</label>
            <input id="s-tenant-id" type="text" value="${this._esc(msConfig.tenantId || '')}"
              placeholder="Azure AD Tenant ID (GUID)"
              class="field-input font-mono text-xs" />
          </div>
          <div>
            <label class="field-label">Client ID *</label>
            <input id="s-client-id" type="text" value="${this._esc(msConfig.clientId || '')}"
              placeholder="Azure App Registration Client ID"
              class="field-input font-mono text-xs" />
          </div>
          <div>
            <label class="field-label">Client Secret</label>
            <input id="s-client-secret" type="password" value="${this._esc(msConfig.clientSecret || '')}"
              placeholder="Azure App Client Secret"
              class="field-input" />
            <p class="text-xs text-amber-600 mt-1">
              <i class="fas fa-lock mr-1"></i>Stored in browser localStorage only. Never sent to any external server.
            </p>
          </div>
        </div>

        <div class="flex gap-2 mt-4 flex-wrap">
          <button onclick="settingsPage.saveMsConfig()"
            class="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
            <i class="fab fa-microsoft mr-1"></i> Save MS Config
          </button>
          ${msConfig.tenantId ? `
          <button onclick="settingsPage.clearMsConfig()"
            class="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">
            <i class="fas fa-times mr-1"></i> Clear (Demo Mode)
          </button>` : ''}
        </div>
      </div>

      <!-- Data Management -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <h2 class="font-bold text-gray-900 flex items-center gap-2 mb-4">
          <i class="fas fa-database text-emerald-600"></i> Data Management
        </h2>
        <div id="data-stats" class="grid grid-cols-2 gap-3 mb-4"></div>
        <div class="flex flex-wrap gap-3">
          <button onclick="settingsPage.exportData()"
            class="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700">
            <i class="fas fa-download mr-1"></i> Export All Data (JSON)
          </button>
          <button onclick="settingsPage.loadDemoData()"
            class="px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700">
            <i class="fas fa-magic mr-1"></i> Load Demo Data
          </button>
          <button onclick="settingsPage.confirmClearData()"
            class="px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">
            <i class="fas fa-trash mr-1"></i> Clear All Data
          </button>
        </div>
      </div>

      <!-- About -->
      <div class="bg-gradient-to-br from-brand-800 to-brand-900 rounded-2xl p-5 text-white">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center flex-shrink-0">
            <i class="fas fa-bolt text-brand-800 text-lg"></i>
          </div>
          <div>
            <div class="font-bold">Bolt Industries Sdn Bhd</div>
            <div class="text-white/60 text-xs">Daily Progress Report System v1.0.0</div>
          </div>
        </div>
        <p class="text-white/70 text-xs leading-relaxed mb-4">
          Construction site daily progress reporting with MS Project Online sync,
          zone-based activity tracking, offline-capable forms, and PDF export (QF-25).
        </p>
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div class="bg-white/10 rounded-xl p-3">
            <div class="font-semibold mb-1">Technology</div>
            <div class="text-white/60">IndexedDB · Vanilla JS ES6<br>Tailwind CSS · jsPDF</div>
          </div>
          <div class="bg-white/10 rounded-xl p-3">
            <div class="font-semibold mb-1">Sync</div>
            <div class="text-white/60">MS Project Online REST API<br>Azure AD OAuth 2.0</div>
          </div>
        </div>
        <div class="mt-4 pt-3 border-t border-white/10 text-xs text-white/40 flex items-center justify-between">
          <span>QF-25, Rev 00 · Issued: 06/05/2019</span>
          <span>v1.0.0</span>
        </div>
      </div>
    </div>`

    window.settingsPage = this
    this.loadDataStats()
  }

  async loadDataStats() {
    try {
      const [projects, reports, drafts] = await Promise.all([
        DB.getAllProjects(),
        DB.getAllReports(),
        DB.getAllDrafts(),
      ])
      const el = document.getElementById('data-stats')
      if (!el) return
      const pending = reports.filter(r => r.syncStatus === 'pending').length
      el.innerHTML = [
        { label: 'Projects',     value: projects.length, icon: 'fa-folder',         color: 'bg-blue-50 text-blue-700 border-blue-100' },
        { label: 'Reports',      value: reports.length,  icon: 'fa-clipboard-list', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
        { label: 'Drafts',       value: drafts.length,   icon: 'fa-file-alt',       color: 'bg-amber-50 text-amber-700 border-amber-100' },
        { label: 'Pending Sync', value: pending,         icon: 'fa-sync',           color: 'bg-purple-50 text-purple-700 border-purple-100' },
      ].map(s => `
        <div class="${s.color} rounded-xl p-3 flex items-center gap-3 border">
          <i class="fas ${s.icon} text-xl flex-shrink-0"></i>
          <div>
            <div class="text-xl font-black leading-none">${s.value}</div>
            <div class="text-xs opacity-70 mt-0.5">${s.label}</div>
          </div>
        </div>`).join('')
    } catch (e) {
      console.warn('loadDataStats error:', e)
    }
  }

  saveProfile() {
    const name = document.getElementById('s-user-name')?.value.trim()
    if (!name) { showToast('Enter your name', 'warning'); return }
    localStorage.setItem('bolt_user_name', name)
    showToast('Profile saved!', 'success')
  }

  saveMsConfig() {
    const pwaUrl       = document.getElementById('s-pwa-url')?.value.trim()
    const tenantId     = document.getElementById('s-tenant-id')?.value.trim()
    const clientId     = document.getElementById('s-client-id')?.value.trim()
    const clientSecret = document.getElementById('s-client-secret')?.value.trim()

    if (!pwaUrl || !tenantId || !clientId) {
      showToast('PWA URL, Tenant ID and Client ID are required', 'error')
      return
    }
    const config = { pwaUrl, tenantId, clientId, clientSecret }
    localStorage.setItem('bolt_ms_config', JSON.stringify(config))
    showToast('MS Project configuration saved! Live sync enabled.', 'success')
    // Re-render to update status badge
    setTimeout(() => this.render(document.getElementById('page-content')), 400)
  }

  clearMsConfig() {
    if (!confirm('Clear MS Project config and return to Demo Mode?')) return
    localStorage.removeItem('bolt_ms_config')
    showToast('MS Project config cleared – Demo Mode active', 'info')
    setTimeout(() => this.render(document.getElementById('page-content')), 400)
  }

  async exportData() {
    try {
      const data = {
        projects:   await DB.getAllProjects(),
        reports:    await DB.getAllReports(),
        exportedAt: new Date().toISOString(),
        version:    '1.0.0',
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `bolt-industries-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast('Data exported!', 'success')
    } catch (e) {
      showToast('Export failed: ' + e.message, 'error')
    }
  }

  async loadDemoData() {
    if (!confirm('This will add a demo project and sample report. Continue?')) return

    try {
      const pid = genId()

      const zones = [
        { id: genId(), projectId: pid, zoneCode: 'CP1',  zoneType: 'BIPV',     msTaskId: genMockGuid(), activities: getActivities('BIPV') },
        { id: genId(), projectId: pid, zoneCode: 'CP2',  zoneType: 'BIPV',     msTaskId: genMockGuid(), activities: getActivities('BIPV') },
        { id: genId(), projectId: pid, zoneCode: 'CPN1', zoneType: 'STANDARD', msTaskId: genMockGuid(), activities: getActivities('STANDARD') },
        { id: genId(), projectId: pid, zoneCode: 'CPN2', zoneType: 'STANDARD', msTaskId: genMockGuid(), activities: getActivities('STANDARD') },
      ]

      const resources = [
        { id: genId(), projectId: pid, type: 'MANPOWER', roleName: 'Engineer',              msResourceId: genMockGuid() },
        { id: genId(), projectId: pid, type: 'MANPOWER', roleName: 'Site Supervisor',        msResourceId: genMockGuid() },
        { id: genId(), projectId: pid, type: 'MANPOWER', roleName: 'General Workers',        msResourceId: genMockGuid() },
        { id: genId(), projectId: pid, type: 'MANPOWER', roleName: 'Site Safety Supervisor', msResourceId: genMockGuid() },
        { id: genId(), projectId: pid, type: 'MACHINERY', roleName: 'Backhoe',      equipmentName: 'Backhoe',      msResourceId: genMockGuid() },
        { id: genId(), projectId: pid, type: 'MACHINERY', roleName: 'Crane',          equipmentName: 'Crane',          msResourceId: genMockGuid() },
        { id: genId(), projectId: pid, type: 'MACHINERY', roleName: 'Tipper Truck',   equipmentName: 'Tipper Truck',   msResourceId: genMockGuid() },
      ]

      const project = {
        id: pid,
        name:            'NEM 3.0 Program – LHDN Cyberjaya',
        client:          'LHDN Malaysia',
        contractor:      'Bolt Industries Sdn Bhd',
        siteLocation:    'LHDN Cyberjaya, Selangor',
        msProjectId:     genMockGuid(),
        msProjectUrl:    '',
        startDate:       '2025-06-01',
        expectedEndDate: '2025-12-31',
        zones,
        resourceTemplates: resources,
        status:          'active',
        syncStatus:      'mock',
        createdAt:       new Date().toISOString(),
      }
      await DB.putProject(project)

      // Sample daily report
      const today = todayISO()
      const rid   = genId()
      const report = {
        id: rid,
        projectId:   pid,
        reportDate:  today,
        reportNo:    `DR-${today.replace(/-/g, '')}-001`,
        weatherAm:   'Sunny',
        weatherPm:   'Cloudy',
        workStart:   '09:00',
        workEnd:     '19:00',
        stopWorkTime:   '',
        resumeWorkTime: '',
        manpowerLog: [
          { resourceTemplateId: resources[0].id, roleName: 'Engineer',              quantity: 1 },
          { resourceTemplateId: resources[1].id, roleName: 'Site Supervisor',        quantity: 1 },
          { resourceTemplateId: resources[2].id, roleName: 'General Workers',        quantity: 12 },
          { resourceTemplateId: resources[3].id, roleName: 'Site Safety Supervisor', quantity: 1 },
        ],
        machineryLog: [
          { resourceTemplateId: resources[4].id, roleName: 'Backhoe',      equipmentName: 'Backhoe',      quantity: 1 },
          { resourceTemplateId: resources[5].id, roleName: 'Crane',        equipmentName: 'Crane',        quantity: 0 },
          { resourceTemplateId: resources[6].id, roleName: 'Tipper Truck', equipmentName: 'Tipper Truck', quantity: 2 },
        ],
        zoneProgress: zones.map((z, zi) => ({
          zoneConfigId: z.id,
          zoneCode:     z.zoneCode,
          activities:   z.activities.map((a, ai) => ({
            activityId:      a.id,
            activityName:    a.name,
            percentComplete: Math.min(100, (ai + 1) * (zi + 1) * 7),
          })),
        })),
        remarks:          'Work progressing as scheduled. Concrete pouring for CP1 footing completed. Bar reinforcement ongoing for CP2. No major issues reported.',
        plannedActivities:'Continue carport structure for CP1. Start footing marking for CPN1. Prepare materials for PV module installation.',
        exceptions:       'Minor delay due to afternoon rain. Workers resumed at 15:30.',
        preparedBy:       'Ahmad Faizal',
        submittedAt:      new Date().toISOString(),
        syncStatus:       'mock',
        photos:           [],
        isDraft:          false,
      }
      await DB.putReport(report)

      showToast('Demo data loaded successfully!', 'success')
      setTimeout(() => app.navTo(`#/projects/${pid}`), 800)
    } catch (e) {
      showToast('Failed to load demo data: ' + e.message, 'error')
    }
  }

  async confirmClearData() {
    if (!confirm('⚠️ This will permanently delete ALL projects and reports. Are you sure?')) return
    if (!confirm('Final confirmation: ALL data will be deleted. Proceed?')) return
    try {
      const [projects, reports, drafts] = await Promise.all([
        DB.getAllProjects(),
        DB.getAllReports(),
        DB.getAllDrafts(),
      ])
      await Promise.all([
        ...projects.map(p => DB.deleteProject(p.id)),
        ...reports.map(r => DB.deleteReport(r.id)),
        ...drafts.map(d => DB.deleteDraft(d.id)),
      ])
      showToast('All data cleared', 'info')
      this.loadDataStats()
    } catch (e) {
      showToast('Clear failed: ' + e.message, 'error')
    }
  }

  _esc(s) {
    if (s == null) return ''
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  }
}
