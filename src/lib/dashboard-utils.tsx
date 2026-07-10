import { Folder, FileText, Image, Film, Music, FileArchive, HardDrive, Star, MessageSquare, Download, Clock } from 'lucide-react'
import type { ReactNode } from 'react'

export const fileIcon = (type: string | undefined | null, isFolder: number | undefined | null): ReactNode => {
  if (isFolder) return <Folder className="h-5 w-5 text-amber-400" />
  switch (type) {
    case 'image': return <Image className="h-5 w-5 text-emerald-400" />
    case 'video': return <Film className="h-5 w-5 text-purple-400" />
    case 'audio': return <Music className="h-5 w-5 text-rose-400" />
    case 'archive': return <FileArchive className="h-5 w-5 text-orange-400" />
    default: return <FileText className="h-5 w-5 text-blue-400" />
  }
}

export const formatSize = (bytes: number | undefined | null): string => {
  if (!bytes) return '--'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export const formatDate = (ts: number | undefined | null): string => {
  if (!ts) return '--'
  return new Date(ts * 1000).toLocaleDateString()
}

export const sidebarItems = [
  { icon: HardDrive, label: 'My Drive', value: '-1' },
  { icon: Star, label: 'Starred' },
  { icon: MessageSquare, label: 'Saved Messages' },
  { icon: Download, label: 'Downloads' },
  { icon: Clock, label: 'Recent' },
]
