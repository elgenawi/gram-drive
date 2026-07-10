import { useEffect, useState, useRef } from 'react'
import { Image, Film, Music, FileArchive, FileText } from 'lucide-react'

const cache = new Map<string, string>()

type Props = {
  dataUrl?: string | null
  ext?: string | null
  type?: string | null
  className?: string
  fill?: boolean
}

const typeFallbackIcon: Record<string, typeof Image> = {
  image: Image,
  video: Film,
  audio: Music,
  archive: FileArchive,
}

export function FileIcon({ dataUrl, ext, type, className, fill }: Props) {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(dataUrl ?? null)
  const fetching = useRef(false)

  const cacheKey = ext || type || ''

  useEffect(() => {
    if (dataUrl) {
      setLoadedUrl(dataUrl)
      return
    }

    if (cache.has(cacheKey)) {
      setLoadedUrl(cache.get(cacheKey) || null)
      return
    }

    if (fetching.current) return
    fetching.current = true

    const lookup = async () => {
      if (ext) {
        const res = await window.electronAPI!.icon.get(ext.toLowerCase())
        if (res.success && res.data) {
          const url = `data:image/png;base64,${res.data}`
          cache.set(cacheKey, url)
          setLoadedUrl(url)
          fetching.current = false
          return
        }
      }
      if (type) {
        const res = await window.electronAPI!.icon.get(type.toLowerCase())
        if (res.success && res.data) {
          const url = `data:image/png;base64,${res.data}`
          cache.set(cacheKey, url)
          setLoadedUrl(url)
          fetching.current = false
          return
        }
      }
      cache.set(cacheKey, '')
      setLoadedUrl(null)
      fetching.current = false
    }
    lookup()
  }, [dataUrl, cacheKey, ext, type])

  if (loadedUrl) {
    return <img src={loadedUrl} alt="" className={fill ? 'size-full object-contain p-2' : className} draggable={false} />
  }

  const Fallback = type ? typeFallbackIcon[type] : undefined
  const iconClass = fill ? 'h-8 w-8 text-muted-foreground' : (className || 'h-5 w-5 text-muted-foreground')
  if (Fallback) return <Fallback className={iconClass} />
  return <FileText className={iconClass} />
}
