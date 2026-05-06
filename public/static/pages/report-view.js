// ============================================================
// REPORT VIEW PAGE – Read-only view + PDF export
// PDF matches Bolt Industries QF-25 form layout
// ============================================================
import { DB, formatDate, formatDateLong, statusColor, statusLabel,
         weatherEmoji, progressColor, isMsConfigured } from '../db.js'
import { msSync } from '../msproject.js'

const WEATHER_EMOJI = { Sunny:'☀️', Rainy:'🌧️', Cloudy:'⛅', Windy:'💨', Fog:'🌫️' }

export class ReportViewPage {
  constructor(id) {
    this.reportId = id
    this.report   = null
    this.project  = null
  }

  async render(container) {
    app.setHeaderTitle('Daily Report', `
      <button onclick="reportViewPage && reportViewPage.exportPDF()"
        class="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg no-print">
        <i class="fas fa-file-pdf"></i> PDF
      </button>`)

    container.innerHTML = `<div class="flex items-center justify-center py-20"><div class="spinner"></div></div>`

    this.report = await DB.getReport(this.reportId)
    if (!this.report) {
      container.innerHTML = `
        <div class="text-center py-20 px-4">
          <div class="text-4xl mb-4">📋</div>
          <p class="text-gray-700 font-semibold mb-1">Report not found</p>
          <p class="text-gray-400 text-sm mb-4">ID: ${this.reportId}</p>
          <button onclick="history.back()"
            class="px-4 py-2 bg-brand-800 text-white rounded-xl text-sm font-semibold">Go Back</button>
        </div>`
      return
    }

    this.project = await DB.getProject(this.report.projectId)
    window.reportViewPage = this

    app.setHeaderTitle(this.report.reportNo || 'Report', `
      <button onclick="reportViewPage.exportPDF()"
        class="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg no-print">
        <i class="fas fa-file-pdf"></i> PDF
      </button>`)

    container.innerHTML = this._renderPage()
  }

  // ── Page HTML ─────────────────────────────────────────────

  _renderPage() {
    const r = this.report
    const p = this.project
    const pName = p?.name       || 'Unknown Project'
    const pLoc  = p?.siteLocation || '–'

    return `
    <div class="max-w-4xl mx-auto px-4 py-4 lg:py-8">

      <!-- Desktop action bar -->
      <div class="hidden lg:flex items-center gap-4 mb-6 no-print">
        <button onclick="history.back()"
          class="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">
          <i class="fas fa-arrow-left"></i>
        </button>
        <div class="flex-1 min-w-0">
          <h1 class="text-2xl font-bold text-gray-900 font-mono">${this._esc(r.reportNo)}</h1>
          <p class="text-sm text-gray-500">${this._esc(pName)} · ${formatDateLong(r.reportDate)}</p>
        </div>
        <div class="flex gap-2 flex-shrink-0">
          ${isMsConfigured() && r.syncStatus !== 'synced' ? `
          <button onclick="reportViewPage._syncReport()"
            class="flex items-center gap-2 px-4 py-2 border border-blue-200 text-blue-700 bg-blue-50 rounded-xl text-sm font-semibold hover:bg-blue-100">
            <i class="fab fa-microsoft"></i> Sync Progress
          </button>` : ''}
          <button onclick="reportViewPage.exportPDF()"
            class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">
            <i class="fas fa-file-pdf"></i> Export PDF
          </button>
          <button onclick="app.navTo('#/reports/new?projectId=${r.projectId}')"
            class="flex items-center gap-2 px-4 py-2 bg-brand-800 text-white rounded-xl text-sm font-semibold hover:bg-brand-700">
            <i class="fas fa-plus"></i> New Report
          </button>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════
           PRINTABLE REPORT (matches QF-25 form layout)
           ═══════════════════════════════════════════════ -->
      <div id="report-printable" class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        <!-- ── HEADER BAND ── -->
        <div class="bg-brand-800 text-white px-6 py-5">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 mb-2">
                <div class="w-11 h-11 rounded-xl bg-yellow-400 flex items-center justify-center flex-shrink-0 shadow">
                  <i class="fas fa-bolt text-brand-800 text-xl"></i>
                </div>
                <div>
                  <div class="font-black text-lg leading-tight">BOLT INDUSTRIES SDN BHD</div>
                  <div class="text-white/50 text-xs">Controlled Form No. QF-25, Rev 00 · Issued: 06/05/2019</div>
                </div>
              </div>
              <div class="text-2xl font-black uppercase tracking-widest mt-2">Daily Progress Report</div>
            </div>
            <div class="text-right flex-shrink-0">
              <div class="text-white/50 text-xs uppercase tracking-wide">Report No.</div>
              <div class="font-mono font-black text-xl mt-0.5">${this._esc(r.reportNo)}</div>
              <div class="mt-2">
                <span class="text-xs px-2 py-1 rounded-full font-semibold
                  ${r.syncStatus === 'synced' ? 'bg-emerald-500/30 text-emerald-200' :
                    r.syncStatus === 'mock'   ? 'bg-purple-500/30 text-purple-200' :
                    'bg-amber-500/30 text-amber-200'}">
                  ${statusLabel(r.syncStatus || 'pending')}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- ── PROJECT INFO BAND ── -->
        <div class="bg-blue-50 border-b border-blue-100 px-6 py-4">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div class="sm:col-span-2">
              <div class="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Project Name</div>
              <div class="font-bold text-gray-900">${this._esc(pName)}</div>
            </div>
            <div>
              <div class="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Date</div>
              <div class="font-bold text-gray-900">${formatDate(r.reportDate)}</div>
            </div>
            <div class="sm:col-span-2">
              <div class="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Site Location</div>
              <div class="font-medium text-gray-700">${this._esc(pLoc)}</div>
            </div>
            <div>
              <div class="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Contractor</div>
              <div class="font-medium text-gray-700">${this._esc(p?.contractor || 'Bolt Industries Sdn Bhd')}</div>
            </div>
          </div>
        </div>

        <!-- ── WORKING HOURS & WEATHER ── -->
        <div class="px-6 py-5 border-b border-gray-100">
          <h3 class="section-heading mb-4">
            <i class="fas fa-clock mr-1 text-brand-600"></i>Working Hours &amp; Weather
          </h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
              <div class="text-xs text-gray-400 mb-1">Work Start</div>
              <div class="text-2xl font-black text-brand-800">${r.workStart || '–'}</div>
            </div>
            <div class="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
              <div class="text-xs text-gray-400 mb-1">Work End</div>
              <div class="text-2xl font-black text-brand-800">${r.workEnd || '–'}</div>
            </div>
            <div class="bg-yellow-50 rounded-xl p-3 text-center border border-yellow-100">
              <div class="text-xs text-gray-400 mb-1">AM Weather</div>
              <div class="text-2xl">${WEATHER_EMOJI[r.weatherAm] || '🌤️'}</div>
              <div class="text-xs font-semibold text-gray-700 mt-0.5">${r.weatherAm || '–'}</div>
            </div>
            <div class="bg-indigo-50 rounded-xl p-3 text-center border border-indigo-100">
              <div class="text-xs text-gray-400 mb-1">PM Weather</div>
              <div class="text-2xl">${WEATHER_EMOJI[r.weatherPm] || '🌤️'}</div>
              <div class="text-xs font-semibold text-gray-700 mt-0.5">${r.weatherPm || '–'}</div>
            </div>
          </div>
          ${(r.stopWorkTime || r.resumeWorkTime) ? `
          <div class="grid grid-cols-2 gap-3 mt-3">
            ${r.stopWorkTime ? `<div class="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-2 border border-amber-100">
              <i class="fas fa-stop-circle"></i> Stop: <strong>${r.stopWorkTime}</strong>
            </div>` : ''}
            ${r.resumeWorkTime ? `<div class="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-2 border border-emerald-100">
              <i class="fas fa-play-circle"></i> Resume: <strong>${r.resumeWorkTime}</strong>
            </div>` : ''}
          </div>` : ''}
        </div>

        <!-- ── MANPOWER ── -->
        <div class="px-6 py-5 border-b border-gray-100">
          <h3 class="section-heading mb-4">
            <i class="fas fa-hard-hat mr-1 text-blue-500"></i>Manpower
          </h3>
          ${this._renderResTable(
            (r.manpowerLog || []).filter(m => m.quantity > 0),
            'roleName', 'Manpower / Role', 'Qty'
          )}
          ${!(r.manpowerLog || []).filter(m => m.quantity > 0).length
            ? '<p class="text-sm text-gray-400 italic">No manpower recorded</p>' : ''}
        </div>

        <!-- ── MACHINERY ── -->
        <div class="px-6 py-5 border-b border-gray-100">
          <h3 class="section-heading mb-4">
            <i class="fas fa-cogs mr-1 text-amber-500"></i>Machinery / Equipment
          </h3>
          ${this._renderResTable(
            (r.machineryLog || []).filter(m => m.quantity > 0),
            'equipmentName', 'Equipment / Machinery', 'Qty'
          )}
          ${!(r.machineryLog || []).filter(m => m.quantity > 0).length
            ? '<p class="text-sm text-gray-400 italic">No machinery recorded</p>' : ''}
        </div>

        <!-- ── ZONE PROGRESS ── -->
        <div class="px-6 py-5 border-b border-gray-100">
          <h3 class="section-heading mb-4">
            <i class="fas fa-layer-group mr-1 text-brand-600"></i>Zone Progress Details
          </h3>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            ${(r.zoneProgress || []).map(zp => {
              const acts = zp.activities || []
              const avg  = acts.length
                ? Math.round(acts.reduce((s,a) => s+(a.percentComplete||0), 0) / acts.length) : 0
              const zone  = (this.project?.zones || []).find(z => z.id === zp.zoneConfigId)
              const zType = zone?.zoneType || 'STANDARD'
              const isBIPV = zType === 'BIPV'
              const col   = progressColor(avg)
              return `
                <div class="border border-gray-200 rounded-xl overflow-hidden">
                  <div class="flex items-center justify-between px-4 py-3
                    ${isBIPV ? 'bg-blue-50' : 'bg-purple-50'}">
                    <div class="flex items-center gap-2">
                      <span class="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs
                        ${isBIPV ? 'bg-blue-200 text-blue-800' : 'bg-purple-200 text-purple-800'}">
                        ${isBIPV ? 'B' : 'S'}
                      </span>
                      <div>
                        <div class="font-bold text-sm ${isBIPV ? 'text-blue-900' : 'text-purple-900'}">${this._esc(zp.zoneCode)}</div>
                        <div class="text-xs ${isBIPV ? 'text-blue-500' : 'text-purple-500'}">${zType}</div>
                      </div>
                    </div>
                    <span class="text-lg font-black" style="color:${col}">${avg}%</span>
                  </div>
                  <div class="h-1.5 ${isBIPV ? 'bg-blue-100' : 'bg-purple-100'} overflow-hidden">
                    <div class="h-full transition-all" style="width:${avg}%;background:${col}"></div>
                  </div>
                  <div class="px-4 py-3 space-y-2">
                    ${acts.map((a, i) => {
                      const pct  = a.percentComplete || 0
                      const aCol = progressColor(pct)
                      return `
                        <div>
                          <div class="flex justify-between text-xs mb-0.5">
                            <span class="text-gray-600 truncate flex-1">${i+1}. ${this._esc(a.activityName || '–')}</span>
                            <span class="font-semibold ml-2 flex-shrink-0" style="color:${aCol}">${pct}%</span>
                          </div>
                          <div class="h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div class="h-full rounded-full" style="width:${pct}%;background:${aCol}"></div>
                          </div>
                        </div>`
                    }).join('')}
                  </div>
                </div>`
            }).join('')}
          </div>
        </div>

        <!-- ── DETAILS RECORD ── -->
        ${(r.remarks || r.plannedActivities || r.exceptions) ? `
        <div class="px-6 py-5 border-b border-gray-100">
          <h3 class="section-heading mb-4">
            <i class="fas fa-sticky-note mr-1 text-yellow-500"></i>Details Record
          </h3>
          <div class="space-y-3">
            ${r.remarks ? `
            <div class="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
              <div class="text-xs font-bold text-yellow-700 uppercase tracking-wide mb-1.5">Remarks / Site Observations</div>
              <p class="text-sm text-gray-800 whitespace-pre-wrap">${this._esc(r.remarks)}</p>
            </div>` : ''}
            ${r.plannedActivities ? `
            <div class="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div class="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1.5">Planned Activities (Tomorrow)</div>
              <p class="text-sm text-gray-800 whitespace-pre-wrap">${this._esc(r.plannedActivities)}</p>
            </div>` : ''}
            ${r.exceptions ? `
            <div class="bg-red-50 border border-red-100 rounded-xl p-4">
              <div class="text-xs font-bold text-red-700 uppercase tracking-wide mb-1.5">Exceptions / Issues</div>
              <p class="text-sm text-gray-800 whitespace-pre-wrap">${this._esc(r.exceptions)}</p>
            </div>` : ''}
          </div>
        </div>` : ''}

        <!-- ── SITE PHOTOS ── -->
        ${(r.photos?.length) ? `
        <div class="px-6 py-5 border-b border-gray-100">
          <h3 class="section-heading mb-4">
            <i class="fas fa-camera mr-1 text-purple-500"></i>Site Photos (${r.photos.length})
          </h3>
          <div class="photo-grid">
            ${r.photos.map((ph, i) => `
              <div class="relative cursor-pointer group"
                onclick="reportViewPage._viewPhoto('${encodeURIComponent(ph.dataUrl)}','${this._esc(ph.caption||'')}')">
                <img src="${ph.dataUrl}" class="photo-thumb" alt="${this._esc(ph.caption || 'Site photo')}" />
                ${ph.caption ? `
                <div class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1
                  rounded-b-xl text-center truncate">${this._esc(ph.caption)}</div>` : ''}
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-colors"></div>
              </div>`).join('')}
          </div>
        </div>` : ''}

        <!-- ── SIGNATURE FOOTER ── -->
        <div class="px-6 py-6 bg-gray-50 border-t border-gray-200">
          <div class="grid grid-cols-2 gap-8">
            <div>
              <div class="text-xs text-gray-400 uppercase tracking-wide mb-2">Prepared By</div>
              <div class="border-b-2 border-gray-300 pb-5 mb-2 min-h-[44px]"></div>
              <div class="font-semibold text-sm text-gray-800">${this._esc(r.preparedBy || '–')}</div>
              <div class="text-xs text-gray-400">Site Supervisor</div>
            </div>
            <div>
              <div class="text-xs text-gray-400 uppercase tracking-wide mb-2">Verified By</div>
              <div class="border-b-2 border-gray-300 pb-5 mb-2 min-h-[44px]"></div>
              <div class="font-semibold text-sm text-gray-800">___________________</div>
              <div class="text-xs text-gray-400">Project Manager</div>
            </div>
          </div>
          <div class="text-center text-xs text-gray-400 mt-5 pt-4 border-t border-gray-200">
            Submitted: ${r.submittedAt ? new Date(r.submittedAt).toLocaleString('en-MY') : '–'}
            &nbsp;·&nbsp; Bolt Industries Sdn Bhd &nbsp;·&nbsp; QF-25 Rev 00
          </div>
        </div>
      </div>

      <!-- Mobile action row -->
      <div class="mt-4 grid grid-cols-2 gap-3 no-print">
        <button onclick="reportViewPage.exportPDF()"
          class="flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-2xl text-sm font-semibold hover:bg-red-700 active:bg-red-800">
          <i class="fas fa-file-pdf"></i> Export PDF
        </button>
        <button onclick="app.navTo('#/projects/${r.projectId}')"
          class="flex items-center justify-center gap-2 py-3 bg-brand-800 text-white rounded-2xl text-sm font-semibold hover:bg-brand-700">
          <i class="fas fa-arrow-left"></i> Back to Project
        </button>
      </div>
    </div>`
  }

  // ── Resource table ────────────────────────────────────────

  _renderResTable(items, nameKey, col1, col2) {
    if (!items?.length) return ''
    return `
      <div class="overflow-x-auto rounded-xl border border-gray-200">
        <table class="data-table">
          <thead><tr>
            <th class="text-left">${col1}</th>
            <th class="text-right w-20">${col2}</th>
          </tr></thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>${this._esc(item[nameKey] || '–')}</td>
                <td class="text-right font-bold text-brand-800">${item.quantity}</td>
              </tr>`).join('')}
            <tr class="bg-gray-50 font-semibold">
              <td class="text-gray-600">Total</td>
              <td class="text-right text-brand-800">${items.reduce((s,i) => s+(i.quantity||0), 0)}</td>
            </tr>
          </tbody>
        </table>
      </div>`
  }

  // ── Photo viewer ──────────────────────────────────────────

  _viewPhoto(encodedUrl, caption) {
    const dataUrl = decodeURIComponent(encodedUrl)
    const overlay = document.createElement('div')
    overlay.className = 'fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4'
    overlay.innerHTML = `
      <div class="relative max-w-2xl w-full">
        <img src="${dataUrl}" class="w-full rounded-2xl shadow-2xl max-h-[80vh] object-contain" />
        ${caption ? `<p class="text-white text-center mt-3 text-sm">${this._esc(caption)}</p>` : ''}
        <button onclick="this.closest('.fixed').remove()"
          class="absolute -top-4 -right-4 w-9 h-9 bg-white rounded-full text-gray-700
            flex items-center justify-center shadow-lg hover:bg-gray-100">
          <i class="fas fa-times"></i>
        </button>
      </div>`
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })
    document.body.appendChild(overlay)
  }

  // ── MS Project sync ───────────────────────────────────────

  async _syncReport() {
    if (!this.project) return
    showToast('Syncing report progress to MS Project…', 'info')
    try {
      await msSync.syncReportProgress(this.project, this.report)
      this.report.syncStatus = 'synced'
      this.report.syncedAt   = new Date().toISOString()
      await DB.putReport(this.report)
      showToast('Sync successful!', 'success')
      app.navTo('#/reports/' + this.reportId)
    } catch (e) {
      showToast('Sync failed: ' + e.message, 'error')
    }
  }

  // ── PDF export ────────────────────────────────────────────

  async exportPDF() {
    const btns = document.querySelectorAll('[onclick*="exportPDF"]')
    btns.forEach(b => { b.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Generating…'; b.disabled = true })
    try {
      await this._generatePDF()
    } catch (e) {
      showToast('PDF failed: ' + e.message, 'error')
      console.error(e)
    }
    btns.forEach(b => { b.innerHTML = '<i class="fas fa-file-pdf mr-1"></i>Export PDF'; b.disabled = false })
  }

  async _generatePDF() {
    const { jsPDF } = window.jspdf
    const r   = this.report
    const p   = this.project
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    const PW = 210, PH = 297, M = 14, CW = PW - M * 2
    let y = 0

    // ── Brand colour ─────────────────────────────────
    const BRAND  = [30, 58, 95]
    const WHITE  = [255, 255, 255]
    const YELLOW = [251, 191, 36]

    // ── HEADER ───────────────────────────────────────
    doc.setFillColor(...BRAND)
    doc.rect(0, 0, PW, 40, 'F')

    // Yellow bolt icon placeholder
    doc.setFillColor(...YELLOW)
    doc.roundedRect(M, 5, 14, 14, 2, 2, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND)
    doc.text('⚡', M + 7, 14, { align: 'center' })

    doc.setTextColor(...WHITE)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('BOLT INDUSTRIES SDN BHD', M + 17, 11)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text('Controlled Form No. QF-25, Rev 00   ·   Issued: 06/05/2019', M + 17, 16)
    doc.setFontSize(17)
    doc.setFont('helvetica', 'bold')
    doc.text('DAILY PROGRESS REPORT', M, 30)

    // Report No – top right
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text('Report No.', PW - M, 9, { align: 'right' })
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(r.reportNo || '–', PW - M, 15, { align: 'right' })
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(statusLabel(r.syncStatus || 'pending'), PW - M, 21, { align: 'right' })

    y = 46

    // ── PROJECT INFO BOX ─────────────────────────────
    doc.setFillColor(239, 246, 255)
    doc.rect(M, y, CW, 22, 'F')
    doc.setDrawColor(191, 219, 254)
    doc.rect(M, y, CW, 22, 'S')

    const infoLeft = (label, val, x, yy) => {
      doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND)
      doc.text(label, x, yy)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(0,0,0); doc.setFontSize(8)
      doc.text(String(val || '–').substring(0,50), x + (label.length * 1.7), yy)
    }

    infoLeft('PROJECT:', p?.name || '–', M + 2, y + 6)
    infoLeft('DATE:', formatDate(r.reportDate), M + 2, y + 12)
    infoLeft('LOCATION:', p?.siteLocation || '–', M + 2, y + 18)
    infoLeft('CONTRACTOR:', p?.contractor || 'Bolt Industries Sdn Bhd', M + 95, y + 6)
    infoLeft('REPORT NO:', r.reportNo || '–', M + 95, y + 12)
    y += 28

    // ── WORKING HOURS / WEATHER ───────────────────────
    doc.autoTable({
      startY: y,
      head:   [['Working Hours', 'Work Start', 'Work End', 'Stop Work', 'Resume', 'Weather AM', 'Weather PM']],
      body:   [['', r.workStart||'–', r.workEnd||'–',
                r.stopWorkTime||'–', r.resumeWorkTime||'–',
                r.weatherAm||'–', r.weatherPm||'–']],
      styles:     { fontSize: 8, cellPadding: 3, halign: 'center' },
      headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold', fontSize: 7 },
      columnStyles: { 0: { fontStyle: 'bold', halign: 'left' } },
      margin: { left: M, right: M },
    })
    y = doc.lastAutoTable.finalY + 5

    // ── MANPOWER ─────────────────────────────────────
    const mpRows = (r.manpowerLog || []).filter(m => m.quantity > 0)
    if (mpRows.length) {
      doc.autoTable({
        startY: y,
        head:   [['👷  Manpower / Role', 'Quantity']],
        body:   mpRows.map(m => [m.roleName || '–', m.quantity]),
        foot:   [['Total Manpower', mpRows.reduce((s,m)=>s+(m.quantity||0),0)]],
        styles:      { fontSize: 8, cellPadding: 3 },
        headStyles:  { fillColor: [37,99,235], textColor: 255, fontStyle: 'bold', fontSize: 7 },
        footStyles:  { fillColor: [239,246,255], textColor: BRAND, fontStyle: 'bold', fontSize: 8 },
        columnStyles: { 1: { halign: 'center', fontStyle: 'bold', cellWidth: 25 } },
        margin: { left: M, right: M },
      })
      y = doc.lastAutoTable.finalY + 4
    }

    // ── MACHINERY ────────────────────────────────────
    const mcRows = (r.machineryLog || []).filter(m => m.quantity > 0)
    if (mcRows.length) {
      doc.autoTable({
        startY: y,
        head:   [['🔧  Machinery / Equipment', 'Quantity']],
        body:   mcRows.map(m => [m.equipmentName || '–', m.quantity]),
        foot:   [['Total Equipment Types', mcRows.length]],
        styles:      { fontSize: 8, cellPadding: 3 },
        headStyles:  { fillColor: [217,119,6], textColor: 255, fontStyle: 'bold', fontSize: 7 },
        footStyles:  { fillColor: [255,251,235], textColor: [146,64,14], fontStyle: 'bold', fontSize: 8 },
        columnStyles: { 1: { halign: 'center', fontStyle: 'bold', cellWidth: 25 } },
        margin: { left: M, right: M },
      })
      y = doc.lastAutoTable.finalY + 4
    }

    // ── ZONE PROGRESS ────────────────────────────────
    if ((r.zoneProgress||[]).length) {
      if (y > PH - 60) { doc.addPage(); y = M }

      const rows = []
      for (const zp of r.zoneProgress) {
        const acts = zp.activities || []
        const avg  = acts.length
          ? Math.round(acts.reduce((s,a)=>s+(a.percentComplete||0),0)/acts.length) : 0
        rows.push([{ content: zp.zoneCode || '–', styles: { fontStyle:'bold' } },
                   { content: 'Zone Average', styles: { fontStyle:'italic', textColor:[100,100,100] } },
                   { content: avg + '%', styles: { fontStyle:'bold',
                       textColor: avg>=80?[16,185,129]:avg>=50?[59,130,246]:avg>=20?[245,158,11]:[239,68,68] }}])
        for (const a of acts) {
          const pct = a.percentComplete || 0
          rows.push(['', a.activityName || '–',
            { content: pct + '%', styles: {
                textColor: pct>=80?[16,185,129]:pct>=50?[59,130,246]:pct>=20?[245,158,11]:[239,68,68],
                fontStyle: 'bold'
              }}])
        }
      }

      doc.autoTable({
        startY: y,
        head:   [['Zone', 'Activity', '% Complete']],
        body:   rows,
        styles:      { fontSize: 7.5, cellPadding: 2.5 },
        headStyles:  { fillColor: BRAND, textColor: 255, fontStyle: 'bold', fontSize: 7 },
        columnStyles: { 0: { cellWidth: 18, fontStyle:'bold' }, 2: { halign:'center', cellWidth: 24 } },
        rowPageBreak: 'avoid',
        margin: { left: M, right: M },
      })
      y = doc.lastAutoTable.finalY + 5
    }

    // ── DETAILS RECORD ────────────────────────────────
    const hasDetails = r.remarks || r.plannedActivities || r.exceptions
    if (hasDetails) {
      if (y > PH - 55) { doc.addPage(); y = M }
      doc.setFillColor(254, 252, 232)
      doc.rect(M, y, CW, 7, 'F')
      doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(120,100,0)
      doc.text('DETAILS RECORD / REMARKS', M + 2, y + 5)
      y += 10

      const section = (label, text) => {
        if (!text) return
        doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...BRAND)
        doc.text(label, M, y); y += 4
        doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(0,0,0)
        const lines = doc.splitTextToSize(text, CW)
        lines.forEach(line => {
          if (y > PH - 20) { doc.addPage(); y = M }
          doc.text(line, M, y); y += 4.5
        })
        y += 3
      }
      section('Remarks / Site Observations:', r.remarks)
      section('Planned Activities (Tomorrow):', r.plannedActivities)
      section('Exceptions / Issues:', r.exceptions)
    }

    // ── PHOTOS ───────────────────────────────────────
    if (r.photos?.length) {
      if (y > PH - 70) { doc.addPage(); y = M }
      doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(...BRAND)
      doc.text(`SITE PHOTOS (${r.photos.length})`, M, y); y += 5

      const PW_PHOTO = 56, PH_PHOTO = 42, GAP = 4
      let px = M, py = y
      for (let i = 0; i < Math.min(r.photos.length, 9); i++) {
        if (i > 0 && i % 3 === 0) { px = M; py += PH_PHOTO + 6 }
        if (py + PH_PHOTO > PH - 20) { doc.addPage(); px = M; py = M }
        try {
          doc.addImage(r.photos[i].dataUrl, 'JPEG', px, py, PW_PHOTO, PH_PHOTO, '', 'MEDIUM')
          if (r.photos[i].caption) {
            doc.setFontSize(6); doc.setFont('helvetica','normal'); doc.setTextColor(80,80,80)
            doc.text(r.photos[i].caption, px, py + PH_PHOTO + 3, { maxWidth: PW_PHOTO })
          }
        } catch { /* skip unreadable photo */ }
        px += PW_PHOTO + GAP
      }
      y = py + PH_PHOTO + 10
    }

    // ── SIGNATURE ────────────────────────────────────
    if (y > PH - 38) { doc.addPage(); y = M }
    const SIG_W = 70
    doc.setDrawColor(180,180,180); doc.setLineWidth(0.4)
    doc.line(M, y + 16, M + SIG_W, y + 16)
    doc.line(PW - M - SIG_W, y + 16, PW - M, y + 16)
    doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(0,0,0)
    doc.text(r.preparedBy || '_______________', M, y + 21)
    doc.text('_______________', PW - M - SIG_W, y + 21)
    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(120,120,120)
    doc.text('Prepared By / Site Supervisor', M, y + 26)
    doc.text('Verified By / Project Manager', PW - M - SIG_W, y + 26)

    // ── FOOTER on every page ──────────────────────────
    const total = doc.getNumberOfPages()
    for (let i = 1; i <= total; i++) {
      doc.setPage(i)
      doc.setFontSize(6.5); doc.setTextColor(160,160,160); doc.setFont('helvetica','normal')
      doc.text(`Page ${i} of ${total}`, PW - M, PH - 5, { align: 'right' })
      doc.text(`Bolt Industries Sdn Bhd  ·  ${r.reportNo || '–'}  ·  ${formatDate(r.reportDate)}  ·  QF-25 Rev 00`,
        M, PH - 5)
    }

    doc.save(`${r.reportNo || 'report'}_${r.reportDate || 'date'}.pdf`)
    showToast('PDF exported!', 'success')
  }

  // ── Helpers ───────────────────────────────────────────────
  _esc(s) {
    if (s == null) return ''
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;')
  }
}
