// ============================================================
// ROUTER – hash-based client-side router
// IMPORTANT: Register exact-string routes BEFORE regex routes
// ============================================================

export class Router {
  constructor() {
    this.routes = []
  }

  add(pattern, handler) {
    this.routes.push({ pattern, handler })
  }

  navigate(hash) {
    if (location.hash !== hash) {
      location.hash = hash
    } else {
      this.dispatch()
    }
  }

  dispatch() {
    const raw  = location.hash || '#/projects'
    const hash = raw.split('?')[0]          // strip query string for matching
    const full = raw                         // keep full hash for query params

    for (const route of this.routes) {
      if (typeof route.pattern === 'string') {
        // Exact match OR exact match with query string
        if (hash === route.pattern) {
          route.handler(null, full)
          return
        }
      } else if (route.pattern instanceof RegExp) {
        const m = full.match(route.pattern)
        if (m) {
          route.handler(m[1] || null, full)
          return
        }
      }
    }
    // Default fallback
    location.hash = '#/projects'
  }
}
