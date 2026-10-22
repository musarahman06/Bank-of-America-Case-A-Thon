import { FileSpreadsheet, UploadCloud } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'

interface Props {
  accept: string
  title: string
  hint: string
  onFile: (file: File) => void
  preview?: ReactNode
}

/** Dashed-border file dropzone with click-to-browse and a preview slot. */
export default function Dropzone({ accept, title, hint, onFile, preview }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const f = e.dataTransfer.files[0]
        if (f) onFile(f)
      }}
      className={`flex flex-col gap-4 rounded-xl border-2 border-dashed p-4 transition sm:flex-row sm:items-center ${
        over ? 'border-navy bg-navy-50' : 'border-slate-300 bg-slate-50/60'
      }`}
    >
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="flex flex-none flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-5 text-slate-500 transition hover:border-navy hover:text-navy"
      >
        <UploadCloud size={22} />
        <span className="text-xs font-semibold">Browse</span>
      </button>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-slate-800">
          <FileSpreadsheet size={15} className="text-navy" />
          {title}
        </p>
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
        {preview && <div className="mt-3">{preview}</div>}
      </div>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}
