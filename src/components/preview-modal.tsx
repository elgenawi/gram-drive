import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

type PreviewItem = {
  Id: string
  Name?: string
  Type?: string | null
  MimeType?: string | null
} | null

export function PreviewModal({
  item,
  url,
  onClose,
}: {
  item: PreviewItem
  url: string
  onClose: () => void
}) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(false)
  }, [url])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const isVideo = item?.Type === 'video' || item?.MimeType?.startsWith('video/')

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <button
        className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 z-10 cursor-pointer"
        onClick={onClose}
      >
        <X className="h-5 w-5" />
      </button>
      <div className="flex items-center justify-center max-w-[90vw] max-h-[90vh]">
        {isVideo ? (
          <video
            src={url}
            controls
            autoPlay
            className="max-w-[90vw] max-h-[90vh] rounded-lg"
            onCanPlay={() => setLoaded(true)}
          />
        ) : (
          <img
            src={url}
            alt={item?.Name || ''}
            className="max-w-[90vw] max-h-[90vh] rounded-lg object-contain"
            onLoad={() => setLoaded(true)}
          />
        )}
        {!loaded && (
          <div className="absolute h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
        )}
      </div>
    </div>
  )
}
