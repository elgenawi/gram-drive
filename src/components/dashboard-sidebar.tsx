import { Plus, Upload, RefreshCw, Download, LogOut, Cloud, CloudOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sidebarItems } from '@/lib/dashboard-utils'

type Props = {
  currentParent: string
  indexing: boolean
  synced: boolean
  onNewFolder: () => void
  onUpload: () => void
  onNavigateHome: () => void
  onSync: () => void
  onIndexTelegram: () => void
  onSignOut: () => void
}

export function DashboardSidebar({ currentParent, indexing, synced, onNewFolder, onUpload, onNavigateHome, onSync, onIndexTelegram, onSignOut }: Props) {
  return (
    <aside className="w-56 shrink-0 border-r border-border bg-muted/20 flex flex-col">
      <div className="p-3 space-y-2">
        <Button className="w-full justify-start gap-2 h-9 text-sm" onClick={onNewFolder}>
          <Plus className="h-4 w-4" />
          New Folder
        </Button>
        <Button className="w-full justify-start gap-2 h-9 text-sm" variant="outline" onClick={onUpload}>
          <Upload className="h-4 w-4" />
          Upload Files
        </Button>
      </div>

      <nav className="flex-1 px-2 space-y-0.5">
        {sidebarItems.map((item) => (
          <button
            key={item.label}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
              item.value === currentParent
                ? 'bg-accent text-accent-foreground font-medium'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
            }`}
            onClick={() => { if (item.value === '-1') onNavigateHome() }}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-border space-y-2">
        <button
          className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors cursor-pointer"
          onClick={onSync}
        >
          <RefreshCw className="h-4 w-4 shrink-0" />
          <span>Sync Now</span>
        </button>
        <button
          className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
          onClick={onIndexTelegram}
          disabled={indexing}
        >
          <Download className="h-4 w-4 shrink-0" />
          <span>{indexing ? 'Indexing...' : 'Index from Telegram'}</span>
        </button>
        <button
          className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors cursor-pointer"
          onClick={onSignOut}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {synced ? <Cloud className="h-3 w-3" /> : <CloudOff className="h-3 w-3" />}
          <span className="flex-1">{synced ? 'Synced' : 'Not synced'}</span>
        </div>
      </div>
    </aside>
  )
}
