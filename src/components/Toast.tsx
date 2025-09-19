export type Notice = { type: 'success' | 'error'; text: string } | null

function NoticeToast({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  if (!notice) return null
  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed top-4 right-4 z-[100] rounded-2xl shadow-lg px-4 py-3 text-sm ${
        notice.type === 'success'
          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          : 'bg-red-50 text-red-800 border border-red-200'
      }`}>
      <div className="flex items-start gap-3">
        <span className="font-medium">{notice.type === 'success' ? 'Berhasil' : 'Gagal'}</span>
        <span>·</span>
        <span>{notice.text}</span>
        <button className="ml-3 text-xs underline" onClick={onClose}>
          Tutup
        </button>
      </div>
    </div>
  )
}

export default NoticeToast
