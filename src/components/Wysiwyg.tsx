'use client'

import { useEffect, useRef, useState } from 'react'

type SimpleWysiwygProps = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  /** jarak dari atas (px), pakai ini kalau ada navbar fixed. contoh: 64 */
  stickyOffset?: number
}

type BlockTag = 'P' | 'H1' | 'H2' | 'H3' | 'BLOCKQUOTE'

export const SimpleWysiwyg = ({ value, onChange, placeholder, stickyOffset = 0 }: SimpleWysiwygProps): JSX.Element => {
  const ref = useRef<HTMLDivElement | null>(null)
  const [block, setBlock] = useState<BlockTag>('P')
  const [stuck, setStuck] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // ===== utils selection/closest
  const getSelectionElement = (): HTMLElement | null => {
    const sel = window.getSelection()
    const node = sel?.anchorNode
    if (!node) return null
    return (node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement) ?? null
  }
  const closestInEditor = (selector: string): HTMLElement | null => {
    const container = ref.current
    let el = getSelectionElement()
    while (el && el !== container) {
      if (el.matches?.(selector)) return el
      el = el.parentElement
    }
    return null
  }

  // ===== sync external value
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (el.innerHTML !== value) el.innerHTML = value || ''
  }, [value])

  const exec = (cmd: string, arg?: string): void => {
    ref.current?.focus()
    document.execCommand(cmd, false, arg)
    onChange(ref.current?.innerHTML ?? '')
  }

  const setFormatBlock = (tag: BlockTag): void => {
    exec('formatBlock', tag)
    setBlock(tag)
  }

  const detectCurrentBlock = (): BlockTag => {
    const container = ref.current
    const sel = window.getSelection()
    const node = sel?.anchorNode
    if (!node) return 'P'
    let el = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement
    while (el && el !== container) {
      const t = el.tagName as BlockTag
      if (t === 'H1' || t === 'H2' || t === 'H3' || t === 'BLOCKQUOTE' || t === 'P') return t
      el = el.parentElement
    }
    return 'P'
  }

  useEffect(() => {
    const onSel = () => setBlock(detectCurrentBlock())
    document.addEventListener('selectionchange', onSel)
    return () => document.removeEventListener('selectionchange', onSel)
  }, [])

  const onInput: React.FormEventHandler<HTMLDivElement> = () => {
    onChange(ref.current?.innerHTML ?? '')
  }

  const onPaste: React.ClipboardEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
    onChange(ref.current?.innerHTML ?? '')
  }

  const createLink = (): void => {
    const url = window.prompt('Masukkan URL (termasuk http/https):')
    if (!url) return
    exec('createLink', url)
  }

  const clearFormatting = (): void => {
    exec('removeFormat')
    setFormatBlock('P')
  }

  // ====== WARNING: toggle block
  const unwrapWarning = (box: HTMLElement) => {
    const parent = box.parentNode
    if (!parent) return
    // pindahkan semua anak keluar lalu hapus wrapper
    while (box.firstChild) parent.insertBefore(box.firstChild, box)
    parent.removeChild(box)
    onChange(ref.current?.innerHTML ?? '')
  }

  const toggleWarning = () => {
    ref.current?.focus()
    // jika sedang di dalam .rt-warning → unwrap
    const box = closestInEditor('.rt-warning')
    if (box) {
      unwrapWarning(box)
      return
    }
    // jika tidak, sisipkan blok warning baru (menggantikan selection kalau ada)
    const sel = window.getSelection()
    const hasSelection = !!sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed
    const selectedText = hasSelection ? sel!.toString() : ''
    const html = `
      <div class="rt-warning rounded-xl border border-amber-200 bg-amber-50 text-amber-900 p-3 my-2">
        <strong>⚠️ Perhatian:</strong>
        <span>${selectedText ? selectedText : 'Tulis peringatan di sini…'}</span>
      </div>
    `
    document.execCommand('insertHTML', false, html)
    onChange(ref.current?.innerHTML ?? '')
  }

  // ===== Observer untuk sticky toolbar (shadow saat menempel)
  useEffect(() => {
    if (!sentinelRef.current) return
    const io = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), {
      rootMargin: `-${stickyOffset}px 0px 0px 0px`,
      threshold: 1
    })
    io.observe(sentinelRef.current)
    return () => io.disconnect()
  }, [stickyOffset])

  return (
    <div className="space-y-2">
      {/* sentinel harus tepat sebelum toolbar */}
      <div ref={sentinelRef} aria-hidden className="h-px -mt-px" />

      {/* Toolbar - sticky */}
      <div
        className={[
          'flex flex-wrap items-center gap-2 sticky z-[100] !top-20 transition-all bg-white p-2 rounded',
          stuck ? 'shadow-sm border border-gray-200' : 'border border-transparent'
        ].join(' ')}
        style={{ top: stickyOffset }}>
        <label className="text-xs text-slate-500">Format</label>
        <select
          value={block}
          onChange={(e) => setFormatBlock(e.target.value as BlockTag)}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm w-32"
          aria-label="Ubah format blok">
          <option value="P">Normal</option>
          <option value="H1">H1</option>
          <option value="H2">H2</option>
          <option value="H3">H3</option>
          <option value="BLOCKQUOTE">Quote</option>
        </select>

        <span className="w-px h-6 bg-slate-200" />

        <button type="button" className="richtext-btn" onClick={() => exec('bold')}>
          B
        </button>
        <button type="button" className="richtext-btn" onClick={() => exec('italic')}>
          <i>I</i>
        </button>
        <button type="button" className="richtext-btn" onClick={() => exec('underline')}>
          <u>U</u>
        </button>

        <span className="w-px h-6 bg-slate-200" />

        <button type="button" className="richtext-btn" onClick={() => exec('insertUnorderedList')}>
          • List
        </button>
        <button type="button" className="richtext-btn" onClick={() => exec('insertOrderedList')}>
          1. List
        </button>
        <button type="button" className="richtext-btn" onClick={createLink}>
          Link
        </button>

        <span className="w-px h-6 bg-slate-200" />

        {/* NEW: Warning block */}
        <button type="button" className="richtext-btn" onClick={toggleWarning}>
          Warning
        </button>

        <span className="w-px h-6 bg-slate-200" />

        <button type="button" className="richtext-btn" onClick={() => exec('undo')}>
          Undo
        </button>
        <button type="button" className="richtext-btn" onClick={() => exec('redo')}>
          Redo
        </button>
        <button type="button" className="richtext-btn" onClick={clearFormatting}>
          Clear
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
        className="richtext prose prose-sm max-w-none"
        data-placeholder={placeholder ?? 'Tulis konten di sini…'}
        style={{ position: 'relative' }}
      />

      <style>{`
        /* Placeholder visual */
        [contenteditable][data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: rgb(100 116 139);
        }
        /* Pastikan warning terlihat rapi saat dirender di halaman lain juga */
        .prose .rt-warning { margin: 0.5rem 0; }
        .prose .rt-warning strong:first-child { margin-right: .25rem; }
      `}</style>
    </div>
  )
}
