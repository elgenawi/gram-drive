import { Minus, Square, X } from 'lucide-react'

const buttonClass =
  'flex items-center justify-center w-11 h-9 transition-colors cursor-pointer text-muted-foreground hover:bg-accent hover:text-foreground [&:not(:has(*))]:app-region-no-drag'

export function TitleBar() {
  const api = window.electronAPI

  return (
    <div className="flex items-center justify-between h-9 bg-background select-none shrink-0 app-region-drag">
      <div className="flex items-center gap-2 pl-4">
        <span className="text-sm font-medium text-muted-foreground">Gram Drive</span>
      </div>
      <div className="flex app-region-no-drag">
        <button className={buttonClass} onClick={() => api?.minimize()}>
          <Minus className="h-4 w-4" />
        </button>
        <button className={buttonClass} onClick={() => api?.maximize()}>
          <Square className="h-3.5 w-3.5" />
        </button>
        <button
          className={`${buttonClass} hover:bg-destructive hover:text-destructive-foreground`}
          onClick={() => api?.close()}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
