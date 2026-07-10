import { useState, useEffect } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { formatSize } from '@/lib/dashboard-utils'
import { FileIcon } from '@/components/file-icon'
import type { FSItem } from '@/vite-env'

type Props = {
  items: FSItem[]
  onClick: (item: FSItem) => void
  onRename: (item: FSItem) => void
  onDelete: (item: FSItem) => void
  onMove: (itemId: string, targetFolderId: string) => void
}

export function FileGridView({ items, onClick, onRename, onDelete, onMove }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [folderIcon, setFolderIcon] = useState<string | null>(null)

  useEffect(() => {
    window.electronAPI?.icon.getFolder().then(r => {
      if (r.success && r.data) setFolderIcon(`data:image/png;base64,${r.data}`)
    })
  }, [])

  const handleDragStart = (e: React.DragEvent, item: FSItem) => {
    e.dataTransfer.setData('text/plain', item.Id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, item: FSItem) => {
    if (!item.IsFolder) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, folder: FSItem) => {
    e.preventDefault()
    setDragOverId(null)
    const draggedId = e.dataTransfer.getData('text/plain')
    if (draggedId && draggedId !== folder.Id) {
      onMove(draggedId, folder.Id)
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-3">
      {items.map((file) => (
        <div
          key={file.Id}
          draggable
          className={`group relative flex flex-col items-center gap-1 p-3 rounded-xl transition-all cursor-pointer ${
            dragOverId === file.Id
              ? 'ring-2 ring-primary bg-primary/10'
              : selectedId === file.Id
              ? 'ring-1 ring-primary bg-primary/5'
              : 'hover:bg-accent/30'
          }`}
          onClick={() => setSelectedId(file.Id)}
          onDoubleClick={() => onClick(file)}
          onDragStart={(e) => handleDragStart(e, file)}
          onDragOver={(e) => handleDragOver(e, file)}
          onDragEnter={(e) => { if (file.IsFolder) { e.preventDefault(); setDragOverId(file.Id) } }}
          onDragLeave={() => setDragOverId(null)}
          onDrop={(e) => handleDrop(e, file)}
        >
          <div className="w-full h-36 flex items-center justify-center -m-3 mb-0 overflow-hidden rounded-t-xl">
            {file.IsFolder ? (
              <img src={folderIcon} alt="" className="size-32 shrink-0" />
            ) : file.ThumbnailUrl && (file.Type === 'image' || file.Type === 'video') ? (
              <img
                src={file.ThumbnailUrl}
                alt={file.Name}
                className="w-full h-full object-cover"
              />
            ) : (
              <FileIcon dataUrl={file.Icon} ext={file.Extention} type={file.Type} className="size-32" />
            )}
          </div>
          <span className="text-xs text-center leading-tight line-clamp-2 break-all max-w-full px-1">
            {file.Name}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {file.IsFolder ? 'folder' : formatSize(file.Size)}
          </span>
          {!file.IsFolder && (
            <div className="hidden group-hover:flex absolute top-1 right-1 gap-1">
              <button
                className="p-1 rounded bg-background border border-border hover:bg-accent cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onRename(file) }}
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                className="p-1 rounded bg-background border border-border hover:bg-destructive hover:text-destructive-foreground cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onDelete(file) }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
