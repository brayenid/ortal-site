'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
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
  Loader2
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

  // ===== selection utils
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
  const currentFigure = (): HTMLFrameElement | null => {
    const el = closestInEditor('.rt-figure')
    return (el as HTMLFrameElement) ?? null
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
    if (da === 'left' || da === 'center' || da === 'right' || da === 'justify') return da
    const container = ref.current
    if (!container) return 'left'
    const el = fig ?? getSelectionElement()
    if (!el) return 'left'
    const ta = (window.getComputedStyle(el).textAlign as Align) || 'left'
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

  useEffect(() => {
    const onSel = () => {
      setBlock(detectCurrentBlock())
      setAlign(detectCurrentAlign())
      setImgSize(detectCurrentImgSize())
    }
    document.addEventListener('selectionchange', onSel)
    return () => document.removeEventListener('selectionchange', onSel)
  }, [])

  const onInput: React.FormEventHandler<HTMLDivElement> = () => {
    onChange(ref.current?.innerHTML ?? '')
  }

  // === PASTE: text & image
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
    onChange(ref.current?.innerHTML ?? '')
  }

  // === LINK
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

  // ====== WARNING block
  const unwrapWarning = (box: HTMLElement) => {
    const parent = box.parentNode
    if (!parent) return
    while (box.firstChild) parent.insertBefore(box.firstChild, box)
    parent.removeChild(box)
    onChange(ref.current?.innerHTML ?? '')
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
    onChange(ref.current?.innerHTML ?? '')
  }

  // ===== IMG: choose, drop
  const onChooseImage = () => fileInputRef.current?.click()

  const onDrop: React.DragEventHandler<HTMLDivElement> = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer?.files?.[0]
    if (file && file.type.startsWith('image/')) {
      await handleUploadAndInsert(file)
    }
  }

  // ===== helpers: insert paragraph after node + move caret
  const insertTrailingParagraphAndFocus = (after: HTMLElement) => {
    const p = document.createElement('p')
    p.appendChild(document.createElement('br'))
    after.insertAdjacentElement('afterend', p)
    // place caret at start of the new paragraph
    const range = document.createRange()
    range.setStart(p, 0)
    range.collapse(true)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }

  // ===== Upload & insert (with non-editable placeholder)
  const handleUploadAndInsert = async (file: File) => {
    const placeholderId = `upl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const ph = insertUploadingPlaceholder(placeholderId) // return element

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
      // tambahkan baris baru di bawah gambar + fokus ke sana
      if (fig) insertTrailingParagraphAndFocus(fig)
      onNotice?.({ type: 'success', text: 'Gambar diunggah.' })
    } catch (err: any) {
      removePlaceholder(placeholderId)
      onNotice?.({ type: 'error', text: err?.message || 'Upload gagal' })
      // kembalikan fokus ke editor
      ref.current?.focus()
    } finally {
      setUploading(false)
    }
  }

  const insertUploadingPlaceholder = (id: string): HTMLFrameElement | null => {
    // figure non-editable supaya nggak bisa diketik/diubah saat upload
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
    onChange(ref.current?.innerHTML ?? '')
    // return the element back
    return ref.current?.querySelector<HTMLFrameElement>(`.rt-figure.rt-uploading[data-upload-id="${id}"]`) ?? null
  }

  const removePlaceholder = (id: string) => {
    const container = ref.current
    if (!container) return
    const fig = container.querySelector<HTMLElement>(`.rt-figure.rt-uploading[data-upload-id="${id}"]`)
    fig?.remove()
    onChange(container.innerHTML)
  }

  const replacePlaceholderWithImage = (
    id: string,
    img: { url: string; width?: number; height?: number; publicId: string }
  ): HTMLFrameElement | null => {
    const container = ref.current
    if (!container) return null
    const fig = container.querySelector<HTMLFrameElement>(`.rt-figure.rt-uploading[data-upload-id="${id}"]`)
    if (!fig) {
      // fallback
      const f2 = insertImageHTML(img)
      return f2
    }
    fig.classList.remove('rt-uploading')
    fig.removeAttribute('data-upload-id')
    fig.removeAttribute('contenteditable') // kembali editable container sekitarnya, figur tetap ikut editor
    fig.setAttribute('data-public-id', img.publicId)
    fig.setAttribute('data-align', fig.getAttribute('data-align') || 'left')
    const maxW = 1200
    const displayWidth = img.width && img.width < maxW ? img.width : maxW
    fig.innerHTML = `
      <img src="${img.url}" alt="Bagian Organisasi" loading="lazy" decoding="async" data-public-id="${img.publicId}"
           style="max-width:100%;height:auto;width:${displayWidth}px" />
    `
    onChange(container.innerHTML)
    return fig
  }

  const insertImageHTML = (img: {
    url: string
    width?: number
    height?: number
    publicId: string
  }): HTMLFrameElement | null => {
    const maxW = 1200
    const displayWidth = img.width && img.width < maxW ? img.width : maxW
    const html = `
      <figure class="rt-figure my-3" data-public-id="${img.publicId}" data-align="left">
        <img src="${img.url}" alt="Bagian Organisasi" loading="lazy" decoding="async" data-public-id="${img.publicId}"
             style="max-width:100%;height:auto;width:${displayWidth}px" />
      </figure>
    `
    document.execCommand('insertHTML', false, html)
    onChange(ref.current?.innerHTML ?? '')
    return ref.current?.querySelector<HTMLFrameElement>(`.rt-figure[data-public-id="${img.publicId}"]`) ?? null
  }

  // ===== Image controls (align + size apply to current figure if any)
  const alignFigure = (a: Align) => {
    const fig = currentFigure()
    if (!fig) {
      if (a === 'left') exec('justifyLeft')
      if (a === 'center') exec('justifyCenter')
      if (a === 'right') exec('justifyRight')
      if (a === 'justify') exec('justifyFull')
      setAlign(a)
      return
    }
    fig.setAttribute('data-align', a === 'justify' ? 'left' : a)
    setAlign(a)
    onChange(ref.current?.innerHTML ?? '')
  }

  const setFigureSize = (pct: SizePct) => {
    const fig = currentFigure()
    const img = fig?.querySelector<HTMLImageElement>('img')
    if (!fig || !img) return
    img.style.width = `${pct}%`
    img.style.maxWidth = '100%'
    setImgSize(pct)
    onChange(ref.current?.innerHTML ?? '')
  }

  // ===== Observer: sticky + deletion watcher
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
          // beri jeda kecil untuk menghindari false positive re-render
          await new Promise((r) => setTimeout(r, 350))
          const htmlNow = ref.current?.innerHTML || ''

          for (const fig of toDelete) {
            const publicId =
              fig.getAttribute('data-public-id') || fig.querySelector('img')?.getAttribute('data-public-id') || null
            if (!publicId) continue
            if (ref.current?.contains(fig)) continue
            if (htmlNow.includes(publicId)) continue // masih ada di editor dalam node lain

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

  // helpers
  const btn = (active: boolean) =>
    `richtext-btn inline-flex items-center justify-center rounded-lg border px-2.5 py-1.5 text-sm ${
      active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
    }`

  return (
    <div className="space-y-2">
      {/* sentinel harus tepat sebelum toolbar */}
      <div ref={sentinelRef} aria-hidden className="h-px -mt-px" />

      {/* Toolbar - sticky */}
      <div
        className={[
          'flex flex-wrap items-center gap-2 sticky z-[100] transition-all bg-white p-2 rounded',
          stuck ? 'shadow-sm border border-gray-200' : 'border border-transparent'
        ].join(' ')}
        style={{ top: stickyOffset }}>
        {/* Format */}
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

        {/* Inline styles */}
        <button type="button" className={btn(false)} onClick={() => exec('bold')} aria-label="Bold">
          <Bold size={16} />
        </button>
        <button type="button" className={btn(false)} onClick={() => exec('italic')} aria-label="Italic">
          <Italic size={16} />
        </button>
        <button type="button" className={btn(false)} onClick={() => exec('underline')} aria-label="Underline">
          <Underline size={16} />
        </button>

        <span className="w-px h-6 bg-slate-200" />

        {/* Lists & link & quote */}
        <button
          type="button"
          className={btn(false)}
          onClick={() => exec('insertUnorderedList')}
          aria-label="Bullet list">
          <List size={16} />
        </button>
        <button
          type="button"
          className={btn(false)}
          onClick={() => exec('insertOrderedList')}
          aria-label="Numbered list">
          <ListOrdered size={16} />
        </button>
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

        <span className="w-px h-6 bg-slate-200" />

        {/* Align (text atau figure) */}
        <div className="flex items-center gap-1" role="group" aria-label="Alignment">
          <button
            type="button"
            className={btn(align === 'left')}
            onClick={() => alignFigure('left')}
            aria-label="Align left">
            <AlignLeft size={16} />
          </button>
          <button
            type="button"
            className={btn(align === 'center')}
            onClick={() => alignFigure('center')}
            aria-label="Align center">
            <AlignCenter size={16} />
          </button>
          <button
            type="button"
            className={btn(align === 'right')}
            onClick={() => alignFigure('right')}
            aria-label="Align right">
            <AlignRight size={16} />
          </button>
          <button
            type="button"
            className={btn(align === 'justify')}
            onClick={() => alignFigure('justify')}
            aria-label="Justify">
            <AlignJustify size={16} />
          </button>
        </div>

        {/* Image size */}
        <select
          value={imgSize}
          onChange={(e) => setFigureSize(parseInt(e.target.value, 10) as SizePct)}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm w-24"
          title="Ukuran gambar (persen)">
          <option value={10}>10%</option>
          <option value={25}>25%</option>
          <option value={50}>50%</option>
          <option value={75}>75%</option>
          <option value={100}>100%</option>
        </select>

        <span className="w-px h-6 bg-slate-200" />

        {/* Warning block */}
        <button type="button" className={btn(false)} onClick={toggleWarning} aria-label="Warning block">
          <AlertTriangle size={16} />
        </button>

        <span className="w-px h-6 bg-slate-200" />

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

        <span className="w-px h-6 bg-slate-200" />

        {/* History & clear */}
        <button type="button" className={btn(false)} onClick={() => exec('undo')} aria-label="Undo">
          <Undo2 size={16} />
        </button>
        <button type="button" className={btn(false)} onClick={() => exec('redo')} aria-label="Redo">
          <Redo2 size={16} />
        </button>
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
        /* Placeholder visual */
        [contenteditable][data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: rgb(100 116 139);
        }

        /* Warning styling */
        .prose .rt-warning { margin: 0.5rem 0; }
        .prose .rt-warning strong:first-child { margin-right: .25rem; }

        /* Alignment via data-attribute (persist ke HTML) */
        .prose .rt-figure[data-align="left"]   { text-align: left; }
        .prose .rt-figure[data-align="center"] { text-align: center; }
        .prose .rt-figure[data-align="right"]  { text-align: right; }

        /* Figure & caption */
        .prose .rt-figure img { display:inline-block; margin:0; border-radius: 0.5rem; }
        .prose .rt-caption { outline: none; }
        .prose .rt-caption:empty::before { content: 'Tulis keterangan…'; color: rgb(148 163 184); }

        /* Uploading placeholder: non-editable feel */
        .rt-figure.rt-uploading,
        .rt-figure.rt-uploading * {
          pointer-events: none;
          user-select: none;
        }
        .rt-figure.rt-uploading {
          display:flex; align-items:center; justify-content:center;
          min-height: 120px; border: 1px dashed #cbd5e1; border-radius: 0.5rem;
          color: #64748b; background: #f8fafc;
        }
        .rt-spinner { display:flex; align-items:center; gap:8px; font-size:12px; }
        .rt-spin { color:#64748b }
      `}</style>
    </div>
  )
}
