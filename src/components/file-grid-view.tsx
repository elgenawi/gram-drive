import { Pencil, Trash2 } from 'lucide-react'
import { fileIcon, formatSize } from '@/lib/dashboard-utils'
import type { FSItem } from '@/vite-env'

type Props = {
  items: FSItem[]
  onClick: (item: FSItem) => void
  onRename: (item: FSItem) => void
  onDelete: (item: FSItem) => void
}

export function FileGridView({ items, onClick, onRename, onDelete }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {items.map((file) => (
        <div
          key={file.Id}
          className="group relative flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-accent/30 transition-all cursor-pointer"
          onClick={() => onClick(file)}
        >
          <div className="size-14 flex items-center justify-center rounded-xl bg-muted/50 group-hover:bg-muted transition-colors overflow-hidden">
            {file.ThumbnailUrl ? (
              <img src={file.ThumbnailUrl} alt={file.Name} className="size-full object-cover" />
            ) : fileIcon(file.Type, file.IsFolder)}
          </div>
          <span className="text-xs text-center leading-tight line-clamp-2 break-all">
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
