// ============================================================
// APP.JS – Main application entry point
// ============================================================

import { DB } from './db.js'
import { Router } from './router.js'
import { showToast } from './toast.js'
import { ProjectListPage } from './pages/projects-list.js'
import { ProjectNewPage } from './pages/project-new.js'
import { ProjectDashboardPage } from './pages/project-dashboard.js'
import { ReportNewPage } from './pages/report-new.js'
import { ReportViewPage } from './pages/report-view.js'
import { SettingsPage } from './pages/settings.js'

class App {
  constructor() {
    this.router      = new Router()
    this.currentPage = null
    this.sidebarOpen = false
  }

  async init() {
    await DB.init()
    this.renderShell()
    this.setupRoutes()
    this.setupEvents()
    this.router.dispatch()
  }

  renderShell() {
    document.getElementById('app').innerHTML = `
      <!-- Toast container -->
      <div id="toast-container"></div>

      <!-- Desktop Sidebar -->
      <aside id="desktop-sidebar"
        class="fixed left-0 top-0 bottom-0 w-64 bg-brand-800 text-white z-50 hidden lg:flex flex-col">
        ${this.sidebarContent()}
      </aside>

      <!-- Mobile sidebar overlay -->
      <div id="sidebar-overlay"
        class="fixed inset-0 bg-black/50 z-40 hidden"
        onclick="app.closeSidebar()"></div>

      <!-- Mobile sidebar drawer -->
      <aside id="sidebar"
        class="fixed left-0 top-0 bottom-0 w-72 bg-brand-800 text-white z-50 flex flex-col lg:hidden"
        style="transform:translateX(-100%);transition:transform 0.3s cubic-bezier(0.4,0,0.2,1)">
        ${this.sidebarContent()}
      </aside>

      <!-- Main content area -->
      <div id="main-wrap" class="lg:ml-64 min-h-screen flex flex-col pb-20 lg:pb-0">

        <!-- Mobile top header -->
        <header id="app-header"
          class="sticky top-0 z-30 bg-white border-b border-gray-200 flex items-center px-4 h-14 gap-3 lg:hidden">
          <button onclick="app.toggleSidebar()"
            class="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-600 flex-shrink-0">
            <i class="fas fa-bars text-lg"></i>
          </button>
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <div class="w-7 h-7 rounded-lg bg-brand-800 flex items-center justify-center flex-shrink-0">
              <i class="fas fa-bolt text-yellow-400" style="font-size:11px"></i>
            </div>
            <span id="header-title" class="font-semibold text-gray-800 text-sm truncate">
              Daily Progress Report
            </span>
          </div>
          <div id="header-actions" class="flex items-center gap-1 flex-shrink-0"></div>
        </header>

        <!-- Desktop top bar -->
        <header class="hidden lg:flex items-center px-8 h-16 border-b border-gray-100 bg-white sticky top-0 z-30">
          <div id="desktop-breadcrumb" class="flex items-center gap-2 text-sm text-gray-500">
            <div class="w-6 h-6 rounded-md bg-brand-800 flex items-center justify-center flex-shrink-0">
              <i class="fas fa-bolt text-yellow-400" style="font-size:9px"></i>
            </div>
            <span class="text-gray-400">/</span>
            <span id="desktop-title" class="font-semibold text-gray-700">Daily Progress Report</span>
          </div>
          <div class="flex-1"></div>
          <div id="desktop-header-actions" class="flex items-center gap-3"></div>
          <!-- Online indicator (desktop) -->
          <div class="flex items-center gap-2 ml-4 pl-4 border-l border-gray-100">
            <div id="online-dot-desktop" class="w-2 h-2 rounded-full bg-emerald-400"></div>
            <span id="online-label-desktop" class="text-xs text-gray-400">Online</span>
          </div>
        </header>

        <!-- Page content -->
        <main id="page-content" class="flex-1 page-enter"></main>
      </div>

      <!-- Mobile bottom navigation -->
      <nav id="bottom-nav" class="lg:hidden">
        <div class="bottom-nav-item" data-nav="#/projects" onclick="app.navTo('#/projects')">
          <i class="fas fa-folder-open"></i>
          <span>Projects</span>
        </div>
        <div class="bottom-nav-item" onclick="app.startNewReport()">
          <i class="fas fa-plus-circle text-brand-800" style="font-size:26px;margin-bottom:1px"></i>
          <span>New Report</span>
        </div>
        <div class="bottom-nav-item" data-nav="#/settings" onclick="app.navTo('#/settings')">
          <i class="fas fa-cog"></i>
          <span>Settings</span>
        </div>
      </nav>`
  }

  sidebarContent() {
    return `
      <!-- Logo -->
      <div class="flex items-center gap-3 px-5 py-5 border-b border-white/10 flex-shrink-0">
        <div class="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center shadow-lg flex-shrink-0">
          <i class="fas fa-bolt text-brand-800 text-lg"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-bold text-sm leading-tight truncate">Bolt Industries</div>
          <div class="text-white/50 text-xs">Sdn Bhd · Daily Reports</div>
        </div>
        <button onclick="app.closeSidebar()"
          class="lg:hidden text-white/40 hover:text-white w-7 h-7 flex items-center justify-center flex-shrink-0 rounded-lg hover:bg-white/10">
          <i class="fas fa-times text-sm"></i>
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        <div class="text-white/30 text-xs font-semibold px-3 py-2 uppercase tracking-wider">Projects</div>

        <a href="#/projects"
          onclick="event.preventDefault(); app.navTo('#/projects')"
          class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all"
          data-nav="#/projects">
          <i class="fas fa-folder-open w-4 text-center text-sm flex-shrink-0"></i>
          <span>All Projects</span>
        </a>

        <a href="#/projects/new"
          onclick="event.preventDefault(); app.navTo('#/projects/new')"
          class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all"
          data-nav="#/projects/new">
          <i class="fas fa-plus-circle w-4 text-center text-sm flex-shrink-0"></i>
          <span>New Project</span>
        </a>

        <div class="text-white/30 text-xs font-semibold px-3 py-2 mt-2 uppercase tracking-wider">Daily Reports</div>

        <a href="#/reports/new"
          onclick="event.preventDefault(); app.startNewReport()"
          class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all">
          <i class="fas fa-file-medical w-4 text-center text-sm flex-shrink-0"></i>
          <span>New Daily Report</span>
        </a>

        <div class="text-white/30 text-xs font-semibold px-3 py-2 mt-2 uppercase tracking-wider">System</div>

        <a href="#/settings"
          onclick="event.preventDefault(); app.navTo('#/settings')"
          class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all"
          data-nav="#/settings">
          <i class="fas fa-cog w-4 text-center text-sm flex-shrink-0"></i>
          <span>Settings</span>
        </a>
      </nav>

      <!-- Online status footer -->
      <div class="px-4 py-3 border-t border-white/10 flex items-center gap-2 flex-shrink-0">
        <div id="online-dot" class="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"></div>
        <span id="online-label" class="text-white/40 text-xs">Online</span>
        <span class="ml-auto text-white/20 text-xs">v1.0.0</span>
      </div>`
  }

  setupRoutes() {
    // IMPORTANT: Exact string routes MUST come before regex patterns
    this.router.add('#/projects',     () => this.loadPage(new ProjectListPage()))
    this.router.add('#/projects/new', () => this.loadPage(new ProjectNewPage()))
    this.router.add('#/settings',     () => this.loadPage(new SettingsPage()))
    // Regex routes after exact string routes
    this.router.add(/^#\/reports\/new/, () => this.loadPage(new ReportNewPage()))
    this.router.add(/^#\/reports\/([^?#/]+)/, (id) => this.loadPage(new ReportViewPage(id)))
    this.router.add(/^#\/projects\/([^?#/]+)$/, (id) => {
      // Guard: never pass 'new' to dashboard (belt-and-suspenders)
      if (id && id !== 'new') this.loadPage(new ProjectDashboardPage(id))
      else this.loadPage(new ProjectNewPage())
    })
  }

  setupEvents() {
    window.addEventListener('hashchange', () => this.router.dispatch())

    // Online / offline indicator
    window.addEventListener('online',  () => this._updateOnlineStatus(true))
    window.addEventListener('offline', () => this._updateOnlineStatus(false))
    this._updateOnlineStatus(navigator.onLine)

    // Close sidebar on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeSidebar()
    })
  }

  _updateOnlineStatus(online) {
    const cls = online ? 'bg-emerald-400' : 'bg-red-400'
    const txt = online ? 'Online' : 'Offline'
    ;['online-dot', 'online-dot-desktop'].forEach(id => {
      const el = document.getElementById(id)
      if (el) el.className = `w-2 h-2 rounded-full flex-shrink-0 ${cls}`
    })
    ;['online-label', 'online-label-desktop'].forEach(id => {
      const el = document.getElementById(id)
      if (el) el.textContent = txt
    })
  }

  async loadPage(page) {
    this.currentPage = page
    this.closeSidebar()
    this._updateActiveNav()

    const content = document.getElementById('page-content')
    if (content) {
      content.classList.remove('page-enter')
      void content.offsetWidth  // trigger reflow
      content.classList.add('page-enter')
      content.innerHTML = ''
      await page.render(content)
    }
  }

  _updateActiveNav() {
    const hash = (location.hash || '#/projects').split('?')[0]

    document.querySelectorAll('.sidebar-link[data-nav]').forEach(el => {
      const active = el.dataset.nav === hash
      el.classList.toggle('bg-white/15',   active)
      el.classList.toggle('!text-white',   active)
      el.classList.toggle('font-semibold', active)
    })

    document.querySelectorAll('.bottom-nav-item[data-nav]').forEach(el => {
      el.classList.toggle('active', el.dataset.nav === hash)
    })
  }

  toggleSidebar() { this.sidebarOpen ? this.closeSidebar() : this.openSidebar() }

  openSidebar() {
    this.sidebarOpen = true
    const sb = document.getElementById('sidebar')
    const ov = document.getElementById('sidebar-overlay')
    if (sb) sb.style.transform = 'translateX(0)'
    if (ov) { ov.classList.remove('hidden'); requestAnimationFrame(() => { ov.style.opacity = '1' }) }
  }

  closeSidebar() {
    this.sidebarOpen = false
    const sb = document.getElementById('sidebar')
    const ov = document.getElementById('sidebar-overlay')
    if (sb) sb.style.transform = 'translateX(-100%)'
    if (ov) {
      ov.style.opacity = '0'
      setTimeout(() => ov.classList.add('hidden'), 300)
    }
  }

  navTo(hash) {
    if (location.hash === hash) {
      this.router.dispatch()
    } else {
      location.hash = hash
    }
  }

  /** Start new report – preserves current project context if on a project page */
  startNewReport() {
    const hash         = location.hash || ''
    const projectMatch = hash.match(/^#\/projects\/([^?#/]+)$/)
    if (projectMatch && projectMatch[1] !== 'new') {
      this.navTo(`#/reports/new?projectId=${projectMatch[1]}`)
    } else {
      this.navTo('#/reports/new')
    }
  }

  setHeaderTitle(title, actions = '') {
    // Mobile header
    const mobileTitle   = document.getElementById('header-title')
    const mobileActions = document.getElementById('header-actions')
    if (mobileTitle)   mobileTitle.textContent = title
    if (mobileActions) mobileActions.innerHTML  = actions

    // Desktop header
    const desktopTitle   = document.getElementById('desktop-title')
    const desktopActions = document.getElementById('desktop-header-actions')
    if (desktopTitle)   desktopTitle.textContent = title
    if (desktopActions) desktopActions.innerHTML  = actions
  }
}

// ── Globals ──────────────────────────────────────────────────
window.app       = new App()
window.showToast = showToast

// ── Boot ─────────────────────────────────────────────────────
window.app.init().catch(err => {
  console.error('App init failed:', err)
  document.getElementById('app').innerHTML = `
    <div class="flex items-center justify-center min-h-screen p-8 text-center">
      <div class="max-w-sm">
        <div class="text-5xl mb-4">⚠️</div>
        <h2 class="font-bold text-gray-800 mb-2">Failed to start application</h2>
        <p class="text-gray-500 text-sm mb-2">${err.message}</p>
        <p class="text-gray-400 text-xs mb-6">This app requires a modern browser with IndexedDB support.</p>
        <button onclick="location.reload()"
          class="px-5 py-2.5 bg-blue-700 text-white rounded-xl text-sm font-semibold hover:bg-blue-800">
          <i class="fas fa-redo mr-1"></i> Reload Page
        </button>
      </div>
    </div>`
})
