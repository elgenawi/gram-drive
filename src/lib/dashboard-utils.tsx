import { HardDrive, Star, MessageSquare, Download, Clock } from 'lucide-react'

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
