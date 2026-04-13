/** Pola nilai uang untuk API DECIMAL(15,2). */
export const API_DECIMAL_MONEY_RE = /^\d{1,13}(\.\d{1,2})?$/

export type ParseApiMoneyResult = string | undefined | '__invalid__'

/** Parse teks input uang; kosong → undefined; tidak cocok pola → __invalid__. */
export function parseOptionalApiDecimalMoney(raw: string): ParseApiMoneyResult {
  const s = String(raw ?? '').trim().replace(/\s/g, '')
  if (!s)
    return undefined
  if (!API_DECIMAL_MONEY_RE.test(s))
    return '__invalid__'
  return s
}

/**
 * Input uang: hanya angka dan satu pemisah desimal (. atau , → .).
 * Pecahan dibatasi maxFractionDigits (default 2).
 */
export function sanitizeDecimalMoneyInput(raw: string, maxFractionDigits = 2): string {
  const input = String(raw ?? '')
  let out = ''
  let hasDot = false
  let frac = 0
  for (const ch of input) {
    if (ch >= '0' && ch <= '9') {
      if (hasDot) {
        if (frac < maxFractionDigits) {
          out += ch
          frac++
        }
      }
      else {
        out += ch
      }
    }
    else if ((ch === '.' || ch === ',') && !hasDot) {
      hasDot = true
      out += '.'
    }
  }
  return out
}

/** Untuk VTextField string (nilai DECIMAL API): blok huruf/simbol; izinkan satu titik/koma desimal. */
export function blockKeysNonDecimalMoney(e: KeyboardEvent): void {
  const nav = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
  if (nav.includes(e.key))
    return
  if (e.ctrlKey || e.metaKey || e.altKey)
    return
  if (/^\d$/.test(e.key))
    return
  if (e.key === '.' || e.key === ',') {
    const t = e.target as HTMLInputElement
    const v = t?.value ?? ''
    if (v.includes('.') || v.includes(','))
      e.preventDefault()
    return
  }
  e.preventDefault()
}

export function onPasteSanitizedDecimalMoney(e: ClipboardEvent, apply: (s: string) => void): void {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain') ?? ''
  apply(sanitizeDecimalMoneyInput(text))
}

/** Untuk type="number" biaya: cegah notasi ilmiah / tanda. */
export function blockKeysInvalidNumberMoneyInput(e: KeyboardEvent): void {
  if (e.ctrlKey || e.metaKey || e.altKey)
    return
  if (['e', 'E', '+', '-'].includes(e.key))
    e.preventDefault()
}
