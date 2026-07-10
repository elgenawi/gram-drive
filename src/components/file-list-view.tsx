import { useState } from 'react'
import { Pencil, Trash2, Image } from 'lucide-react'
import { formatSize, formatDate } from '@/lib/dashboard-utils'
import { FileIcon } from '@/components/file-icon'
import type { FSItem } from '@/vite-env'

type Props = {
  items: FSItem[]
  onClick: (item: FSItem) => void
  onRename: (item: FSItem) => void
  onDelete: (item: FSItem) => void
  onMove: (itemId: string, targetFolderId: string) => void
}

export function FileListView({ items, onClick, onRename, onDelete, onMove }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

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
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/30 border-b border-border">
        <div className="col-span-5 flex items-center gap-2">Name</div>
        <div className="col-span-2">Size</div>
        <div className="col-span-3">Modified</div>
        <div className="col-span-2">Actions</div>
      </div>
      {items.map((file) => (
        <div
          key={file.Id}
          draggable
          className={`grid grid-cols-12 gap-2 px-4 py-2.5 text-sm border-b border-border last:border-0 transition-colors cursor-pointer ${
            dragOverId === file.Id
              ? 'border-primary border-2 bg-primary/10'
              : selectedId === file.Id
              ? 'bg-primary/5'
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
          <div className="col-span-5 flex items-center gap-3 min-w-0">
            {file.ThumbnailUrl ? (
              <img src={file.ThumbnailUrl} alt={file.Name} className="size-8 rounded object-contain shrink-0" />
            ) : file.Icon ? (
              <FileIcon dataUrl={file.Icon} ext={file.Extention} type={file.Type} className="size-8" />
            ) : (
              <Image className="size-8 text-muted-foreground/40" />
            )}
            <span className="truncate">{file.Name}</span>
          </div>
          <div className="col-span-2 text-muted-foreground text-xs self-center">
            {file.IsFolder ? 'folder' : formatSize(file.Size)}
          </div>
          <div className="col-span-3 text-muted-foreground text-xs self-center">
            {formatDate(file.TimeUpdate)}
          </div>
          <div className="col-span-2 flex items-center gap-1 self-center">
            <button
              className="p-1 rounded hover:bg-accent cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onRename(file) }}
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              className="p-1 rounded hover:bg-destructive hover:text-destructive-foreground cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onDelete(file) }}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
