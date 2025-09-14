'use client'

import { useEffect, useRef, useState } from 'react'

type SimpleWysiwygProps = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

type BlockTag = 'P' | 'H1' | 'H2' | 'H3' | 'BLOCKQUOTE'

export const SimpleWysiwyg = ({ value, onChange, placeholder }: SimpleWysiwygProps): JSX.Element => {
  const ref = useRef<HTMLDivElement | null>(null)
  const [block, setBlock] = useState<BlockTag>('P') // deteksi & kontrol blok

  // sinkronkan external value ke editor tanpa merusak caret saat sama
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
    const sel = window.getSelection()
    const node = sel?.anchorNode
    if (!node) return 'P'
    let el = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : (node.parentElement as HTMLElement | null)
    while (el && el !== ref.current) {
      const t = el.tagName
      if (t === 'H1' || t === 'H2' || t === 'H3' || t === 'BLOCKQUOTE' || t === 'P') return t as BlockTag
      el = el.parentElement as HTMLElement | null
    }
    return 'P'
  }

  // update indicator saat selection berubah
  useEffect(() => {
    const onSel = () => setBlock(detectCurrentBlock())
    document.addEventListener('selectionchange', onSel)
    return () => document.removeEventListener('selectionchange', onSel)
  }, [])

  const onInput: React.FormEventHandler<HTMLDivElement> = () => {
    onChange(ref.current?.innerHTML ?? '')
  }

  const onPaste: React.ClipboardEventHandler<HTMLDivElement> = (e) => {
    // paste plain text supaya markup bersih
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
    // kembalikan ke paragraf (normal text)
    setFormatBlock('P')
  }

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Block format selector */}
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
        className="richtext prose prose-sm"
        data-placeholder={placeholder ?? 'Tulis konten di sini…'}
        style={{ position: 'relative' }}
      />
      <style>{`
        /* placeholder visual */
        [contenteditable][data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: rgb(100 116 139);
        }
      `}</style>
    </div>
  )
}
