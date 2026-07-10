import { Pencil, Trash2 } from 'lucide-react'
import { fileIcon, formatSize, formatDate } from '@/lib/dashboard-utils'
import type { FSItem } from '@/vite-env'

type Props = {
  items: FSItem[]
  onClick: (item: FSItem) => void
  onRename: (item: FSItem) => void
  onDelete: (item: FSItem) => void
}

export function FileListView({ items, onClick, onRename, onDelete }: Props) {
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
          className="grid grid-cols-12 gap-2 px-4 py-2.5 text-sm border-b border-border last:border-0 hover:bg-accent/30 transition-colors cursor-pointer"
          onClick={() => onClick(file)}
        >
          <div className="col-span-5 flex items-center gap-3 min-w-0">
            {file.ThumbnailUrl ? (
              <img src={file.ThumbnailUrl} alt={file.Name} className="size-8 rounded object-cover shrink-0" />
            ) : fileIcon(file.Type, file.IsFolder)}
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
