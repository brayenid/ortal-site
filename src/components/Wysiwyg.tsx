'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Image as ImageIcon,
  Undo2,
  Redo2,
  Eraser,
  AlertTriangle,
  Loader2,
  Table as TableIcon
} from 'lucide-react'

type SimpleWysiwygProps = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  stickyOffset?: number
  uploadEndpoint?: string // default: /api/admin/upload
  uploadFolder?: string // default: office-site/articles
  onNotice?: (n: { type: 'success' | 'error'; text: string }) => void
}

type BlockTag = 'P' | 'H1' | 'H2' | 'H3' | 'BLOCKQUOTE'
type Align = 'left' | 'center' | 'right' | 'justify'
type SizePct = 10 | 25 | 50 | 75 | 100

export const SimpleWysiwyg = ({
  value,
  onChange,
  placeholder,
  stickyOffset = 0,
  uploadEndpoint = '/api/admin/upload',
  uploadFolder = 'office-site/articles',
  onNotice
}: SimpleWysiwygProps): JSX.Element => {
  const ref = useRef<HTMLDivElement | null>(null)
  const [block, setBlock] = useState<BlockTag>('P')
  const [align, setAlign] = useState<Align>('left')
  const [imgSize, setImgSize] = useState<SizePct>(100)
  const [stuck, setStuck] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [inTable, setInTable] = useState(false)

  // ==== Rehydrate tables for editing (after loading sanitized HTML)
  function rehydrateAllTables(root: HTMLElement) {
    root.querySelectorAll<HTMLDivElement>('.rt-table-wrap').forEach((wrap) => {
      const table = wrap.querySelector<HTMLTableElement>('table.rt-table')
      if (!table) return

      // a) contenteditable flags (hilang saat disanitize)
      table.setAttribute('contenteditable', 'false')
      table.removeAttribute('spellcheck')
      table.querySelectorAll('thead th').forEach((th) => th.setAttribute('contenteditable', 'true'))
      table.querySelectorAll('tbody td').forEach((td) => td.setAttribute('contenteditable', 'true'))

      // b) pastikan colgroup sinkron
      ensureColgroupShape(table)

      // c) pasang ulang resizer di header
      table.querySelectorAll('thead th').forEach((th) => {
        if (!th.querySelector('.rt-col-resizer')) {
          const span = document.createElement('span')
          span.className = 'rt-col-resizer'
          span.setAttribute('contenteditable', 'false')
          th.appendChild(span)
        }
      })

      // d) pasang ulang grip kanan untuk resize-lebar tabel
      if (!wrap.querySelector('.rt-table-grip')) {
        const grip = document.createElement('div')
        grip.className = 'rt-table-grip'
        grip.setAttribute('contenteditable', 'false')
        grip.title = 'Resize lebar tabel'
        wrap.appendChild(grip)
      }

      // e) set data-cols agar tool lain tetap bekerja
      const colsCount = getTableColsCount(table)
      table.setAttribute('data-cols', String(colsCount))
    })
  }

  // Hitung jumlah kolom aktual
  function getTableColsCount(table: HTMLTableElement) {
    const ths = table.querySelectorAll('thead th').length
    if (ths) return ths
    const firstRow = table.querySelector('tbody tr')
    return firstRow ? firstRow.children.length : 1
  }

  // Pastikan colgroup ada & jumlah <col> sesuai jumlah kolom
  function ensureColgroupShape(table: HTMLTableElement) {
    const colsCount = getTableColsCount(table)
    let cg = table.querySelector('colgroup')
    if (!cg) {
      cg = document.createElement('colgroup')
      table.insertBefore(cg, table.firstChild)
    }
    const current = Array.from(cg.querySelectorAll('col'))
    // jika jumlah tidak pas, rebuild dengan width rata
    if (current.length !== colsCount) {
      cg.innerHTML = ''
      const pct = (100 / colsCount).toFixed(4)
      for (let i = 0; i < colsCount; i++) {
        const col = document.createElement('col')
        col.setAttribute('style', `width:${pct}%`)
        cg.appendChild(col)
      }
      return
    }
    // kalau sudah pas, tapi tidak ada width -> beri default
    let hasWidth = false
    current.forEach((c) => {
      if ((c.getAttribute('style') || '').match(/width\s*:\s*[\d.]+%/)) hasWidth = true
    })
    if (!hasWidth) {
      const pct = (100 / colsCount).toFixed(4)
      current.forEach((c) => c.setAttribute('style', `width:${pct}%`))
    }
  }

  /* ============ selection helpers ============ */
  const getSelection = () => window.getSelection()
  const getSelectionElement = (): HTMLElement | null => {
    const sel = getSelection()
    const node = sel?.anchorNode
    if (!node) return null
    return (node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement) ?? null
  }
  const closestInEditor = (selector: string): HTMLElement | null => {
    const container = ref.current
    let el = getSelectionElement()
    while (el && el !== container) {
      if ((el as any).matches?.(selector)) return el as HTMLElement
      el = el.parentElement
    }
    return null
  }
  const currentFigure = (): HTMLFrameElement | null => (closestInEditor('.rt-figure') as HTMLFrameElement) ?? null
  const currentTable = (): HTMLTableElement | null => (closestInEditor('table.rt-table') as HTMLTableElement) ?? null
  const currentCell = (): HTMLTableCellElement | null => {
    const el = getSelectionElement()
    return el?.closest('th,td') as HTMLTableCellElement | null
  }

  /* ============ sanitization for output (public view) ============ */
  const sanitizeForOutput = (raw: string): string => {
    const wrap = document.createElement('div')
    wrap.innerHTML = raw || ''
    wrap.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'))
    wrap.querySelectorAll('[spellcheck]').forEach((el) => el.removeAttribute('spellcheck'))
    wrap.querySelectorAll('.rt-col-resizer').forEach((n) => n.parentElement?.removeChild(n))
    wrap.querySelectorAll('.rt-table-grip').forEach((n) => n.parentElement?.removeChild(n))
    return wrap.innerHTML
  }

  /* ============ sync parent value -> editor DOM ============ */
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const sanitizedNow = sanitizeForOutput(el.innerHTML)
    if (sanitizedNow !== (value || '')) {
      el.innerHTML = value || ''
      // ⬇️ pasang ulang kontrol tabel agar bisa di-resize lagi
      rehydrateAllTables(el)
    } else {
      // kalau konten sama tapi user baru kembali fokus ke editor,
      // tetap pastikan kontrol ada (mis. setelah mount pertama).
      rehydrateAllTables(el)
    }
  }, [value])

  const emitChange = () => onChange(sanitizeForOutput(ref.current?.innerHTML ?? ''))

  const exec = (cmd: string, arg?: string): void => {
    ref.current?.focus()
    document.execCommand(cmd, false, arg)
    emitChange()
  }

  const setFormatBlock = (tag: BlockTag): void => {
    exec('formatBlock', tag)
    setBlock(tag)
  }

  const detectCurrentBlock = (): BlockTag => {
    const container = ref.current
    const sel = getSelection()
    const node = sel?.anchorNode
    if (!node) return 'P'
    let el = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement
    while (el && el !== container) {
      const t = (el.tagName as BlockTag) || 'P'
      if (t === 'H1' || t === 'H2' || t === 'H3' || t === 'BLOCKQUOTE' || t === 'P') return t
      el = el.parentElement
    }
    return 'P'
  }

  const detectCurrentAlign = (): Align => {
    const fig = currentFigure()
    const da = (fig?.getAttribute('data-align') as Align | null) ?? null
    if (da) return da
    const c = currentCell()
    if (c) {
      const ta = (c.style.textAlign as Align) || (getComputedStyle(c).textAlign as Align) || 'left'
      return ta === 'left' || ta === 'center' || ta === 'right' || ta === 'justify' ? ta : 'left'
    }
    const el = getSelectionElement()
    const ta = ((el && getComputedStyle(el).textAlign) as Align) || 'left'
    return ta === 'left' || ta === 'center' || ta === 'right' || ta === 'justify' ? ta : 'left'
  }

  const detectCurrentImgSize = (): SizePct => {
    const fig = currentFigure()
    if (!fig) return 100
    const img = fig.querySelector<HTMLImageElement>('img')
    if (!img) return 100
    const w = img.style.width
    if (w.endsWith('%')) {
      const n = parseInt(w, 10) as SizePct
      if (n === 10 || n === 25 || n === 50 || n === 75 || n === 100) return n
    }
    return 100
  }

  // update toolbar state on selection changes
  useEffect(() => {
    const onSel = () => {
      setBlock(detectCurrentBlock())
      setAlign(detectCurrentAlign())
      setImgSize(detectCurrentImgSize())
      setInTable(!!currentTable())
    }
    document.addEventListener('selectionchange', onSel)
    return () => document.removeEventListener('selectionchange', onSel)
  }, [])

  const onInput: React.FormEventHandler<HTMLDivElement> = () => emitChange()

  /* ============ paste (text / image) ============ */
  const onPaste: React.ClipboardEventHandler<HTMLDivElement> = async (e) => {
    const items = e.clipboardData?.items
    const imageItem = Array.from(items || []).find((it) => it.type.startsWith('image/'))
    if (imageItem) {
      e.preventDefault()
      const file = imageItem.getAsFile()
      if (file) await handleUploadAndInsert(file)
      return
    }
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
    emitChange()
  }

  /* ============ link / clear / warning ============ */
  const createLink = (): void => {
    const url = window.prompt('Masukkan URL (termasuk http/https):')
    if (!url) return
    exec('createLink', url)
  }

  const clearFormatting = (): void => {
    exec('removeFormat')
    setFormatBlock('P')
    setAlign('left')
  }

  const unwrapWarning = (box: HTMLElement) => {
    const parent = box.parentNode
    if (!parent) return
    while (box.firstChild) parent.insertBefore(box.firstChild, box)
    parent.removeChild(box)
    emitChange()
  }

  const toggleWarning = () => {
    ref.current?.focus()
    const box = closestInEditor('.rt-warning')
    if (box) {
      unwrapWarning(box)
      return
    }
    const sel = getSelection()
    const hasSelection = !!sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed
    const selectedText = hasSelection ? sel!.toString() : ''
    const html = `
      <div class="rt-warning rounded-xl border border-amber-200 bg-amber-50 text-amber-900 p-3 my-2">
        <strong>⚠️ Perhatian:</strong>
        <span>${selectedText ? selectedText : 'Tulis peringatan di sini…'}</span>
      </div>
    `
    document.execCommand('insertHTML', false, html)
    emitChange()
  }

  /* ============ upload image ============ */
  const onDrop: React.DragEventHandler<HTMLDivElement> = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer?.files?.[0]
    if (file && file.type.startsWith('image/')) await handleUploadAndInsert(file)
  }

  const handleUploadAndInsert = async (file: File) => {
    const placeholderId = `upl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    insertUploadingPlaceholder(placeholderId)
    try {
      setUploading(true)
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', uploadFolder)
      const res = await fetch(uploadEndpoint, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Upload gagal')
      const fig = replacePlaceholderWithImage(placeholderId, {
        url: data.url as string,
        width: data.width as number,
        height: data.height as number,
        publicId: data.public_id as string
      })
      if (fig) {
        const p = document.createElement('p')
        p.appendChild(document.createElement('br'))
        fig.insertAdjacentElement('afterend', p)
        const range = document.createRange()
        range.setStart(p, 0)
        range.collapse(true)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
      onNotice?.({ type: 'success', text: 'Gambar diunggah.' })
      emitChange()
    } catch (err: any) {
      removePlaceholder(placeholderId)
      onNotice?.({ type: 'error', text: err?.message || 'Upload gagal' })
      ref.current?.focus()
    } finally {
      setUploading(false)
    }
  }

  const insertUploadingPlaceholder = (id: string) => {
    const html = `
      <figure class="rt-figure rt-uploading my-3" data-upload-id="${id}" data-align="left" contenteditable="false">
        <div class="rt-spinner" aria-live="polite" aria-busy="true">
          <svg viewBox="0 0 24 24" class="rt-spin" width="32" height="32" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"></circle>
            <path d="M22 12a10 10 0 0 1-10 10" fill="none" stroke="currentColor" stroke-width="4"></path>
          </svg>
          <div class="rt-spinner-text">Uploading…</div>
        </div>
      </figure>
    `
    document.execCommand('insertHTML', false, html)
    emitChange()
  }

  const removePlaceholder = (id: string) => {
    const container = ref.current
    if (!container) return
    const fig = container.querySelector<HTMLElement>(`.rt-figure.rt-uploading[data-upload-id="${id}"]`)
    fig?.remove()
    emitChange()
  }

  const replacePlaceholderWithImage = (
    id: string,
    img: { url: string; width?: number; height?: number; publicId: string }
  ): HTMLFrameElement | null => {
    const container = ref.current
    if (!container) return null
    const fig = container.querySelector<HTMLFrameElement>(`.rt-figure.rt-uploading[data-upload-id="${id}"]`)
    if (!fig) return insertImageHTML(img)
    fig.classList.remove('rt-uploading')
    fig.removeAttribute('data-upload-id')
    fig.removeAttribute('contenteditable')
    fig.setAttribute('data-public-id', img.publicId)
    fig.setAttribute('data-align', fig.getAttribute('data-align') || 'left')
    const maxW = 1200
    const displayWidth = img.width && img.width < maxW ? img.width : maxW
    fig.innerHTML = `
      <img src="${img.url}" alt="Bagian Organisasi" loading="lazy" decoding="async" data-public-id="${img.publicId}"
           style="max-width:100%;height:auto;width:${displayWidth}px" />
    `
    return fig
  }

  const insertImageHTML = (img: { url: string; width?: number; height?: number; publicId: string }) => {
    const maxW = 1200
    const displayWidth = img.width && img.width < maxW ? img.width : maxW
    const html = `
      <figure class="rt-figure my-3" data-public-id="${img.publicId}" data-align="left">
        <img src="${img.url}" alt="Bagian Organisasi" loading="lazy" decoding="async" data-public-id="${img.publicId}"
             style="max-width:100%;height:auto;width:${displayWidth}px" />
      </figure>
    `
    document.execCommand('insertHTML', false, html)
    emitChange()
    return ref.current?.querySelector<HTMLFrameElement>(`.rt-figure[data-public-id="${img.publicId}"]`) ?? null
  }

  /* ============ alignment & image size ============ */
  const setAlignment = (a: Align) => {
    const c = currentCell()
    if (c) {
      c.style.textAlign = a === 'justify' ? 'left' : a
      setAlign(a)
      emitChange()
      return
    }
    const fig = currentFigure()
    if (fig) {
      fig.setAttribute('data-align', a === 'justify' ? 'left' : a)
      setAlign(a)
      emitChange()
      return
    }
    if (a === 'left') exec('justifyLeft')
    if (a === 'center') exec('justifyCenter')
    if (a === 'right') exec('justifyRight')
    if (a === 'justify') exec('justifyFull')
    setAlign(a)
  }

  const setFigureSize = (pct: SizePct) => {
    const fig = currentFigure()
    const img = fig?.querySelector<HTMLImageElement>('img')
    if (!fig || !img) return
    img.style.width = `${pct}%`
    img.style.maxWidth = '100%'
    setImgSize(pct)
    emitChange()
  }

  /* ============ TABLE create ============ */
  const insertTable = () => {
    const rRaw = window.prompt('Jumlah baris (tanpa header)?', '3')
    if (!rRaw) return
    const cRaw = window.prompt('Jumlah kolom?', '3')
    if (!cRaw) return
    const rows = Math.max(1, Math.min(50, parseInt(rRaw, 10) || 1))
    const cols = Math.max(1, Math.min(12, parseInt(cRaw, 10) || 1))
    insertTableHTML(rows, cols)
  }

  const ensureTableGrip = (table: HTMLTableElement) => {
    const wrap = table.closest('.rt-table-wrap') as HTMLElement | null
    if (!wrap) return
    if (!wrap.querySelector('.rt-table-grip')) {
      const grip = document.createElement('div')
      grip.className = 'rt-table-grip'
      wrap.appendChild(grip)
    }
  }

  const insertTableHTML = (rows: number, cols: number) => {
    const pct = (100 / cols).toFixed(4)
    const colgroup = Array.from({ length: cols })
      .map(() => `<col style="width:${pct}%">`)
      .join('')
    const thead = `
      <thead>
        <tr>
          ${Array.from({ length: cols })
            .map(
              (_, i) =>
                `<th contenteditable="true">Header ${
                  i + 1
                }<span class="rt-col-resizer" contenteditable="false"></span></th>`
            )
            .join('')}
        </tr>
      </thead>`
    const tbody = `
      <tbody>
        ${Array.from({ length: rows })
          .map(
            () =>
              `<tr>${Array.from({ length: cols })
                .map(() => `<td contenteditable="true"><br/></td>`)
                .join('')}</tr>`
          )
          .join('')}
      </tbody>`
    const html = `
      <div class="rt-table-wrap my-3">
        <table class="rt-table" data-cols="${cols}" style="width:100%" contenteditable="false" spellcheck="false">
          <colgroup>${colgroup}</colgroup>
          ${thead}
          ${tbody}
        </table>
        <div class="rt-table-grip" contenteditable="false" title="Resize lebar tabel"></div>
        <p><br/></p>
      </div>`
    document.execCommand('insertHTML', false, html)
    const container = ref.current
    if (!container) return
    const firstCell = container.querySelector('.rt-table tbody td') as HTMLTableCellElement | null
    if (firstCell) {
      const range = document.createRange()
      range.selectNodeContents(firstCell)
      range.collapse(true)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
    rehydrateAllTables(ref.current!)
    emitChange()
  }

  /* ============ TABLE ops (rows/cols) ============ */
  const focusCell = (cell: HTMLTableCellElement) => {
    const range = document.createRange()
    range.selectNodeContents(cell)
    range.collapse(true)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }
  const ensureCaretInCellIfCollapsed = () => {
    const c = currentCell()
    const sel = getSelection()
    if (!c || !sel || sel.rangeCount === 0) return
    if (!sel.getRangeAt(0).collapsed) return
    focusCell(c)
  }

  const addRowBelow = () => {
    const td = currentCell()
    const table = currentTable()
    if (!td || !table) return
    const row = td.parentElement as HTMLTableRowElement
    const cols = table.querySelectorAll('thead th').length || (row.children?.length ?? 1)
    const tr = document.createElement('tr')
    for (let i = 0; i < cols; i++) {
      const c = document.createElement('td')
      c.setAttribute('contenteditable', 'true')
      c.innerHTML = '<br/>'
      tr.appendChild(c)
    }
    row.insertAdjacentElement('afterend', tr)
    focusCell(tr.children[0] as HTMLTableCellElement)
    emitChange()
  }
  const addRowAbove = () => {
    const td = currentCell()
    const table = currentTable()
    if (!td || !table) return
    const row = td.parentElement as HTMLTableRowElement
    const cols = table.querySelectorAll('thead th').length || (row.children?.length ?? 1)
    const tr = document.createElement('tr')
    for (let i = 0; i < cols; i++) {
      const c = document.createElement('td')
      c.setAttribute('contenteditable', 'true')
      c.innerHTML = '<br/>'
      tr.appendChild(c)
    }
    row.insertAdjacentElement('beforebegin', tr)
    focusCell(tr.children[0] as HTMLTableCellElement)
    emitChange()
  }
  const deleteRow = () => {
    const td = currentCell()
    const table = currentTable()
    if (!td || !table) return
    const row = td.closest('tbody tr') as HTMLTableRowElement | null
    if (!row) return
    const tbody = row.parentElement as HTMLTableSectionElement
    if (tbody.rows.length <= 1) return
    const next = row.nextElementSibling as HTMLTableRowElement | null
    row.remove()
    if (next) focusCell(next.children[0] as HTMLTableCellElement)
    emitChange()
  }

  type ColOp = 'left' | 'right' | 'delete'
  const readColWidthPct = (col: HTMLTableColElement | undefined, total: number) => {
    if (!col) return 100 / total
    const m = (col.getAttribute('style') || '').match(/width\s*:\s*([\d.]+)%/)
    return m ? parseFloat(m[1]) : 100 / total
  }
  const renormalizeColgroup = (cg: HTMLTableColElement['parentElement'] | null, normalize = true) => {
    if (!cg) return
    const cols = Array.from(cg.querySelectorAll('col'))
    const widths = cols.map((c) => readColWidthPct(c as HTMLTableColElement, cols.length))
    const sum = widths.reduce((a, b) => a + b, 0)
    if (!normalize || Math.abs(sum - 100) < 0.5) return
    const factor = 100 / sum
    cols.forEach((c, i) => (c.style.width = `${Math.max(5, widths[i] * factor)}%`))
  }
  const modifyColumn = (op: ColOp) => {
    const td = currentCell()
    const table = currentTable()
    if (!td || !table) return
    const ths = Array.from(table.querySelectorAll('thead th'))
    const cg = table.querySelector('colgroup')
    const ccols = cg ? Array.from(cg.querySelectorAll('col')) : []
    const row = td.parentElement as HTMLTableRowElement
    const idx = Array.from(row.children).indexOf(td)
    if (idx < 0) return
    const total = ths.length || (row.children?.length ?? 1)
    const minCols = 1
    if (op === 'delete') {
      if (total <= minCols) return
      ccols[idx]?.remove()
      ths[idx]?.remove()
      table.querySelectorAll('tbody tr').forEach((r) => r.children[idx]?.remove())
      table.setAttribute('data-cols', String(total - 1))
      renormalizeColgroup(cg)
      emitChange()
      return
    }
    const insertPos = op === 'left' ? idx : idx + 1
    const baseIdx = op === 'left' ? idx : idx
    const baseCol = ccols[baseIdx]
    const baseWidth = readColWidthPct(baseCol as HTMLTableColElement, total)
    const newWidth = Math.max(5, baseWidth / 2)
    const remain = Math.max(5, baseWidth - newWidth)
    if (baseCol) (baseCol as HTMLTableColElement).style.width = `${remain}%`
    const newCol = document.createElement('col')
    newCol.setAttribute('style', `width:${newWidth}%`)
    baseCol?.parentElement?.insertBefore(newCol, ccols[insertPos] || null)
    const newTh = document.createElement('th')
    newTh.setAttribute('contenteditable', 'true')
    newTh.innerHTML = `Header <span class="rt-col-resizer" contenteditable="false"></span>`
    ths[0]?.parentElement?.insertBefore(newTh, ths[insertPos] || null)
    table.querySelectorAll('tbody tr').forEach((r) => {
      const c = document.createElement('td')
      c.setAttribute('contenteditable', 'true')
      c.innerHTML = '<br/>'
      r.insertBefore(c, r.children[insertPos] || null)
    })
    table.setAttribute('data-cols', String(total + 1))
    renormalizeColgroup(cg, false)
    emitChange()
  }
  const deleteTable = () => {
    const table = currentTable()
    if (!table) return
    const wrap = table.closest('.rt-table-wrap') as HTMLElement | null
    wrap?.remove()
    emitChange()
  }

  /* ============ column resize (header handles) ============ */
  useEffect(() => {
    const container = ref.current
    if (!container) return
    let dragging = false,
      table: HTMLTableElement | null = null
    let colgroup: HTMLTableColElement[] = [],
      startX = 0,
      leftIdx = -1,
      widths: number[] = [],
      tableW = 0

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.classList?.contains('rt-col-resizer')) return
      const th = target.closest('th') as HTMLTableCellElement | null
      const tbl = th?.closest('table.rt-table') as HTMLTableElement | null
      if (!th || !tbl) return
      const index = Array.from(th.parentElement!.children).indexOf(th)
      if (index < 0) return
      table = tbl
      const cg = tbl.querySelector('colgroup')
      if (!cg) return
      colgroup = Array.from(cg.querySelectorAll('col'))
      leftIdx = index
      if (leftIdx === colgroup.length - 1 && leftIdx > 0) leftIdx = leftIdx - 1
      tableW = tbl.getBoundingClientRect().width
      widths = colgroup.map((c) => {
        const w = (c.getAttribute('style') || '').match(/width\s*:\s*([\d.]+)%/)
        return w ? parseFloat(w[1]) : 100 / colgroup.length
      })
      startX = e.clientX
      dragging = true
      e.preventDefault()
      e.stopPropagation()
      document.body.style.cursor = 'col-resize'
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging || !table) return
      const dx = e.clientX - startX,
        deltaPct = (dx / tableW) * 100
      const i = leftIdx,
        j = i + 1
      if (i < 0 || j >= widths.length) return
      const minPct = 5
      let wi = widths[i] + deltaPct,
        wj = widths[j] - deltaPct
      if (wi < minPct) {
        wj -= minPct - wi
        wi = minPct
      }
      if (wj < minPct) {
        wi -= minPct - wj
        wj = minPct
      }
      if (wi < minPct || wj < minPct) return
      colgroup[i].style.width = `${wi}%`
      colgroup[j].style.width = `${wj}%`
    }
    const onMouseUp = () => {
      if (!dragging) return
      dragging = false
      table = null
      document.body.style.cursor = ''
      emitChange()
    }
    container.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      container.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  /* ============ table width grip (horizontal) ============ */
  useEffect(() => {
    const container = ref.current
    if (!container) return
    let dragging = false,
      wrap: HTMLElement | null = null,
      table: HTMLTableElement | null = null
    let startX = 0,
      startWidth = 0,
      wrapWidth = 0

    const mousedown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.classList?.contains('rt-table-grip')) return
      wrap = target.closest('.rt-table-wrap') as HTMLElement | null
      table = wrap?.querySelector('table.rt-table') as HTMLTableElement | null
      if (!wrap || !table) return
      dragging = true
      const rect = wrap.getBoundingClientRect()
      wrapWidth = rect.width
      startX = e.clientX
      const tw = table.style.width || '100%'
      startWidth = tw.endsWith('%') ? parseFloat(tw) : 100
      document.body.style.cursor = 'ew-resize'
      e.preventDefault()
      e.stopPropagation()
    }
    const mousemove = (e: MouseEvent) => {
      if (!dragging || !wrap || !table) return
      const dx = e.clientX - startX,
        deltaPct = (dx / wrapWidth) * 100
      let next = startWidth + deltaPct
      next = Math.max(30, Math.min(100, next))
      table.style.width = `${next}%`
    }
    const mouseup = () => {
      if (!dragging) return
      dragging = false
      document.body.style.cursor = ''
      emitChange()
    }
    const ensureAllGrips = () => {
      container.querySelectorAll('table.rt-table').forEach((tbl) => ensureTableGrip(tbl as HTMLTableElement))
    }
    ensureAllGrips()
    const obs = new MutationObserver(() => ensureAllGrips())
    obs.observe(container, { childList: true, subtree: true })
    container.addEventListener('mousedown', mousedown)
    window.addEventListener('mousemove', mousemove)
    window.addEventListener('mouseup', mouseup)
    return () => {
      obs.disconnect()
      container.removeEventListener('mousedown', mousedown)
      window.removeEventListener('mousemove', mousemove)
      window.removeEventListener('mouseup', mouseup)
    }
  }, [])

  /* ============ LIST: apply pada teks yang terseleksi DI DALAM sel ============ */
  function selectionInsideSameCell(): boolean {
    const sel = window.getSelection()
    const cell = currentCell()
    if (!sel || sel.rangeCount === 0 || !cell) return false
    const range = sel.getRangeAt(0)
    return cell.contains(range.startContainer) && cell.contains(range.endContainer)
  }

  function applyListWithinCell(kind: 'ul' | 'ol') {
    const sel = window.getSelection()
    const cell = currentCell()
    if (!sel || sel.rangeCount === 0 || !cell) {
      // fallback biasa
      exec(kind === 'ul' ? 'insertUnorderedList' : 'insertOrderedList')
      return
    }
    const range = sel.getRangeAt(0)

    // Jika selection melewati banyak sel: batasi ke sel aktif (tanpa merusak teks luar sel).
    if (!selectionInsideSameCell()) {
      const r2 = document.createRange()
      r2.selectNodeContents(cell)
      sel.removeAllRanges()
      sel.addRange(r2)
    }
    // Sekarang selection berada di dalam sel (bisa sebagian teks di sel).
    document.execCommand(kind === 'ul' ? 'insertUnorderedList' : 'insertOrderedList', false)
    emitChange()
  }

  /* ============ sticky & cloudinary cleanup (unchanged) ============ */
  useEffect(() => {
    if (!sentinelRef.current) return
    const io = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), {
      rootMargin: `-${stickyOffset}px 0px 0px 0px`,
      threshold: 1
    })
    io.observe(sentinelRef.current)
    return () => io.disconnect()
  }, [stickyOffset])

  useEffect(() => {
    const container = ref.current
    if (!container) return
    const removedFigures: HTMLFrameElement[] = []
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.removedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return
          const figs = node.matches?.('.rt-figure') ? [node] : Array.from(node.querySelectorAll?.('.rt-figure') ?? [])
          figs.forEach((f) => removedFigures.push(f as HTMLFrameElement))
        })
      }
      if (removedFigures.length) {
        const toDelete = [...removedFigures]
        removedFigures.length = 0
        queueMicrotask(async () => {
          await new Promise((r) => setTimeout(r, 350))
          const htmlNow = ref.current?.innerHTML || ''
          for (const fig of toDelete) {
            const publicId =
              fig.getAttribute('data-public-id') || fig.querySelector('img')?.getAttribute('data-public-id') || null
            if (!publicId) continue
            if (ref.current?.contains(fig)) continue
            if (htmlNow.includes(publicId)) continue
            try {
              await fetch(uploadEndpoint, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ public_id: publicId })
              })
              onNotice?.({ type: 'success', text: 'Gambar dihapus dari Cloudinary.' })
            } catch {
              onNotice?.({ type: 'error', text: 'Gagal menghapus gambar di Cloudinary.' })
            }
          }
        })
      }
    })
    mo.observe(container, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [uploadEndpoint, onNotice])

  /* ============ UI helpers ============ */
  const btn = (active: boolean) =>
    `richtext-btn inline-flex items-center justify-center rounded-lg border px-2.5 py-1.5 text-sm ${
      active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
    }`

  const sectionSep = <span className="w-px h-6 bg-slate-200" />

  /* ============ RENDER ============ */
  return (
    <div className="space-y-2 w-full">
      <div ref={sentinelRef} aria-hidden className="h-px -mt-px" />

      {/* Toolbar scrollable */}

      <div
        className={[
          'flex flex-wrap items-center gap-2 sticky z-[100] transition-all bg-white p-2 rounded',
          stuck ? 'shadow-sm border border-gray-200' : 'border border-transparent'
        ].join(' ')}
        style={{ top: stickyOffset }}>
        {/* Block format */}
        <select
          value={block}
          onChange={(e) => setFormatBlock(e.target.value as BlockTag)}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm w-24"
          aria-label="Ubah format blok">
          <option value="P">Normal</option>
          <option value="H1">H1</option>
          <option value="H2">H2</option>
          <option value="H3">H3</option>
          <option value="BLOCKQUOTE">Quote</option>
        </select>

        {sectionSep}

        {/* Inline */}
        <button type="button" className={btn(false)} onClick={() => exec('bold')} aria-label="Bold">
          <Bold size={16} />
        </button>
        <button type="button" className={btn(false)} onClick={() => exec('italic')} aria-label="Italic">
          <Italic size={16} />
        </button>
        <button type="button" className={btn(false)} onClick={() => exec('underline')} aria-label="Underline">
          <Underline size={16} />
        </button>

        {sectionSep}

        {/* Lists (apply ke teks terseleksi dalam sel) */}
        <select
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value
            if (!v) return
            if (v === 'ul') applyListWithinCell('ul')
            if (v === 'ol') applyListWithinCell('ol')
            e.currentTarget.value = ''
          }}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm w-20"
          title="Lists">
          <option value="" disabled>
            List
          </option>
          <option value="ul">• UL</option>
          <option value="ol">1. OL</option>
        </select>

        {/* Link & Quote */}
        <button type="button" className={btn(false)} onClick={createLink} aria-label="Insert link">
          <LinkIcon size={16} />
        </button>
        <button
          type="button"
          className={btn(block === 'BLOCKQUOTE')}
          onClick={() => setFormatBlock('BLOCKQUOTE')}
          aria-label="Quote">
          <Quote size={16} />
        </button>

        {sectionSep}

        {/* Alignment */}
        <select
          value={align}
          onChange={(e) => setAlignment(e.target.value as Align)}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm w-32"
          title="Alignment">
          <option value="left">Align Left</option>
          <option value="center">Align Center</option>
          <option value="right">Align Right</option>
          <option value="justify">Justify</option>
        </select>

        {/* Image size */}
        <select
          value={imgSize}
          onChange={(e) => setFigureSize(parseInt(e.target.value, 10) as SizePct)}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm w-20"
          title="Ukuran gambar (persen)">
          <option value={10}>10%</option>
          <option value={25}>25%</option>
          <option value={50}>50%</option>
          <option value={75}>75%</option>
          <option value={100}>100%</option>
        </select>

        {sectionSep}

        {/* Warning */}
        <button type="button" className={btn(false)} onClick={toggleWarning} aria-label="Warning block">
          <AlertTriangle size={16} />
        </button>

        {sectionSep}

        {/* Table tools */}
        <select
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value
            if (!v) return
            if (v === 'insert') insertTable()
            if (v === 'row-above') addRowAbove()
            if (v === 'row-below') addRowBelow()
            if (v === 'row-del') deleteRow()
            if (v === 'col-left') modifyColumn('left')
            if (v === 'col-right') modifyColumn('right')
            if (v === 'col-del') modifyColumn('delete')
            if (v === 'del-table') deleteTable()
            e.currentTarget.value = ''
          }}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm w-32"
          title="Table tools">
          <option value="" disabled>
            Table
          </option>
          <option value="insert">➕ Insert Table</option>
          <optgroup label="Rows">
            <option value="row-above">+ Row Above</option>
            <option value="row-below">+ Row Below</option>
            <option value="row-del">− Delete Row</option>
          </optgroup>
          <optgroup label="Columns">
            <option value="col-left">+ Col Left</option>
            <option value="col-right">+ Col Right</option>
            <option value="col-del">− Delete Col</option>
          </optgroup>
          <optgroup label="Danger">
            <option value="del-table">🗑 Delete Table</option>
          </optgroup>
        </select>

        {sectionSep}

        {/* Image */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (f) await handleUploadAndInsert(f)
            if (fileInputRef.current) fileInputRef.current.value = ''
          }}
        />
        <button
          type="button"
          className={btn(uploading)}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label="Insert image">
          {uploading ? <Loader2 className="animate-spin" size={16} /> : <ImageIcon size={16} />}
        </button>

        {sectionSep}

        {/* History & clear */}
        {/* <button type="button" className={btn(false)} onClick={() => exec('undo')} aria-label="Undo">
          <Undo2 size={16} />
        </button>
        <button type="button" className={btn(false)} onClick={() => exec('redo')} aria-label="Redo">
          <Redo2 size={16} />
        </button> */}
        <button type="button" className={btn(false)} onClick={clearFormatting} aria-label="Clear formatting">
          <Eraser size={16} />
        </button>
      </div>

      {/* Editor */}
      <div
        ref={ref}
        role="textbox"
        aria-label="Editor konten"
        contentEditable
        suppressContentEditableWarning
        onInput={onInput}
        onPaste={onPaste}
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        className="richtext prose prose-sm max-w-none"
        data-placeholder={placeholder ?? 'Tulis konten di sini…'}
        style={{ position: 'relative' }}
      />

      <style>{`
        /* sembunyikan scrollbar toolbar (opsional) */
        .no-scrollbar::-webkit-scrollbar{display:none}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}

        /* Placeholder */
        [contenteditable][data-placeholder]:empty::before {
          content: attr(data-placeholder); color: rgb(100 116 139);
        }

        /* Warning */
        .prose .rt-warning { margin: .5rem 0; }
        .prose .rt-warning strong:first-child { margin-right: .25rem; }

        /* Figure alignment */
        .prose .rt-figure[data-align="left"]   { text-align: left; }
        .prose .rt-figure[data-align="center"] { text-align: center; }
        .prose .rt-figure[data-align="right"]  { text-align: right; }
        .prose .rt-figure img { display:inline-block; margin:0; border-radius:.5rem; }
        .prose .rt-caption { outline: none; }
        .prose .rt-caption:empty::before { content: 'Tulis keterangan…'; color: rgb(148 163 184); }

        .rt-figure.rt-uploading, .rt-figure.rt-uploading * { pointer-events:none; user-select:none; }
        .rt-figure.rt-uploading {
          display:flex; align-items:center; justify-content:center;
          min-height:120px; border:1px dashed #cbd5e1; border-radius:.5rem;
          color:#64748b; background:#f8fafc;
        }
        .rt-spinner { display:flex; align-items:center; gap:8px; font-size:12px; }
        .rt-spin { color:#64748b }

        /* ===== TABLE ===== */
        .prose .rt-table-wrap { width:100%; position:relative; overflow-x:auto; }
        .prose .rt-table{
          width:100%; table-layout:fixed; border-collapse:collapse;
          border:1px solid #e2e8f0; border-radius:.5rem; overflow:hidden; background:white;
          transition:width .05s linear;
        }
        .prose .rt-table th, .prose .rt-table td {
          border:1px solid #e2e8f0; padding:.5rem .75rem; vertical-align:top; background:white;
        }
        .prose .rt-table thead th { background:#f8fafc; font-weight:600; position:relative; }

        /* Column resizer (header) */
        .prose .rt-col-resizer {
          position:absolute; right:-3px; top:0; width:6px; height:100%;
          cursor:col-resize; user-select:none; background:transparent;
        }
        .prose .rt-col-resizer::after { content:''; position:absolute; inset:0; border-right:1px dashed rgba(100,116,139,.3); }
        .prose .rt-table th:hover .rt-col-resizer::after { border-right-color:rgba(100,116,139,.6); }

        /* Table width grip */
        .prose .rt-table-grip {
          position:absolute; top:0; right:-6px; width:12px; height:100%;
          cursor:ew-resize; user-select:none; background:transparent;
        }
        .prose .rt-table-grip::after {
          content:''; position:absolute; top:8px; bottom:8px; left:5px; width:2px;
          background:rgba(100,116,139,.35); border-radius:2px;
        }

        /* Only editable inside editor; public output akan disanitasi */
        .prose .rt-table [contenteditable="true"] { outline:none; }
      `}</style>
    </div>
  )
}
