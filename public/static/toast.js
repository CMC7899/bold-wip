// ============================================================
// TOAST – Notification helper
// ============================================================

export function showToast(msg, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container')
  if (!container) return

  const icons = {
    success: 'fa-check-circle',
    error:   'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info:    'fa-info-circle',
  }

  const toast = document.createElement('div')
  toast.className = `toast ${type}`
  toast.innerHTML = `
    <i class="fas ${icons[type] || icons.info} flex-shrink-0" style="font-size:15px"></i>
    <span style="flex:1;min-width:0">${msg}</span>
    <button onclick="this.parentElement.remove()"
      style="background:none;border:none;cursor:pointer;opacity:.7;padding:0;margin-left:4px;color:inherit;font-size:14px;flex-shrink:0"
      title="Dismiss"><i class="fas fa-times"></i></button>`

  container.appendChild(toast)

  setTimeout(() => {
    toast.classList.add('toast-out')
    setTimeout(() => toast.remove(), 320)
  }, duration)
}
