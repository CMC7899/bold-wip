// Utility helpers

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-MY', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateLong(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

export function classNames(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function truncate(str: string, len = 40): string {
  return str.length > len ? str.substring(0, len) + '…' : str
}

export function statusColor(status: string): string {
  switch (status) {
    case 'active': return 'text-emerald-600 bg-emerald-50 border-emerald-200'
    case 'completed': return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'on_hold': return 'text-amber-600 bg-amber-50 border-amber-200'
    case 'synced': return 'text-emerald-600 bg-emerald-50 border-emerald-200'
    case 'pending': return 'text-amber-600 bg-amber-50 border-amber-200'
    case 'failed': return 'text-red-600 bg-red-50 border-red-200'
    default: return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'active': return 'Active'
    case 'completed': return 'Completed'
    case 'on_hold': return 'On Hold'
    case 'synced': return 'Synced'
    case 'pending': return 'Pending Sync'
    case 'failed': return 'Sync Failed'
    default: return status
  }
}

export function weatherEmoji(w: string): string {
  switch (w) {
    case 'Sunny': return '☀️'
    case 'Rainy': return '🌧️'
    case 'Cloudy': return '⛅'
    case 'Windy': return '💨'
    case 'Fog': return '🌫️'
    default: return '🌤️'
  }
}

export function progressColor(pct: number): string {
  if (pct >= 80) return 'bg-emerald-500'
  if (pct >= 50) return 'bg-blue-500'
  if (pct >= 20) return 'bg-amber-500'
  return 'bg-red-400'
}

export function debounce<T extends (...args: any[]) => void>(fn: T, ms = 300) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

// Convert file to base64 data URL
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
