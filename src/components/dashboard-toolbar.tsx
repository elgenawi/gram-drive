import { ChevronRight, Search, Grid3X3, List } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { FSItem } from '@/vite-env'

type Props = {
  breadcrumbs: FSItem[]
  searchQuery: string
  viewMode: 'grid' | 'list'
  onNavigateHome: () => void
  onNavigateBreadcrumb: (index: number) => void
  onSearchChange: (value: string) => void
  onViewModeChange: (mode: 'grid' | 'list') => void
}

export function DashboardToolbar({ breadcrumbs, searchQuery, viewMode, onNavigateHome, onNavigateBreadcrumb, onSearchChange, onViewModeChange }: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border">
      <div className="flex items-center gap-1 text-muted-foreground">
        <button
          className="p-1 rounded hover:bg-accent cursor-pointer disabled:opacity-30"
          disabled={breadcrumbs.length === 0}
          onClick={() => onNavigateBreadcrumb(-1)}
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <button className="hover:text-foreground transition-colors cursor-pointer" onClick={onNavigateHome}>
          My Drive
        </button>
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.Id} className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3" />
            <button className="hover:text-foreground transition-colors cursor-pointer" onClick={() => onNavigateBreadcrumb(i)}>
              {crumb.Name}
            </button>
          </span>
        ))}
      </div>

      <div className="flex-1" />

      <div className="relative w-64">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search files..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      <div className="flex items-center border-l border-border pl-2 gap-1">
        <button
          className={`p-1.5 rounded cursor-pointer ${viewMode === 'grid' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => onViewModeChange('grid')}
        >
          <Grid3X3 className="h-4 w-4" />
        </button>
        <button
          className={`p-1.5 rounded cursor-pointer ${viewMode === 'list' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => onViewModeChange('list')}
        >
          <List className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
