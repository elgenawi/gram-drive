import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TitleBar } from '@/components/title-bar'
import {
  Folder,
  File,
  Image,
  Film,
  Music,
  FileArchive,
  FileText,
  HardDrive,
  Search,
  Grid3X3,
  List,
  LogOut,
  ChevronRight,
  Settings,
  Star,
  MessageSquare,
  Download,
  Clock,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type FileItem = {
  id: string
  name: string
  type: 'folder' | 'document' | 'image' | 'video' | 'audio' | 'archive'
  size: string
  modified: string
  items?: number
}

const mockFiles: FileItem[] = [
  { id: '1', name: 'Documents', type: 'folder', size: '--', modified: '2026-07-08 14:23', items: 12 },
  { id: '2', name: 'Images', type: 'folder', size: '--', modified: '2026-07-07 09:15', items: 48 },
  { id: '3', name: 'Videos', type: 'folder', size: '--', modified: '2026-07-05 18:42', items: 6 },
  { id: '4', name: 'Music', type: 'folder', size: '--', modified: '2026-07-03 11:30', items: 24 },
  { id: '5', name: 'Archives', type: 'folder', size: '--', modified: '2026-07-01 20:10', items: 3 },
  { id: '6', name: 'report-q2.pdf', type: 'document', size: '2.4 MB', modified: '2026-07-09 16:00' },
  { id: '7', name: 'photo_2026-07-01.jpg', type: 'image', size: '3.1 MB', modified: '2026-07-01 12:00' },
  { id: '8', name: 'demo-video.mp4', type: 'video', size: '156 MB', modified: '2026-06-28 22:15' },
  { id: '9', name: 'podcast-episode.mp3', type: 'audio', size: '45 MB', modified: '2026-06-25 08:30' },
  { id: '10', name: 'project-backup.zip', type: 'archive', size: '89 MB', modified: '2026-06-20 14:00' },
  { id: '11', name: 'Presentation.pptx', type: 'document', size: '5.7 MB', modified: '2026-06-18 10:45' },
  { id: '12', name: 'screenshot-2026-06-15.png', type: 'image', size: '1.8 MB', modified: '2026-06-15 16:20' },
]

const fileIcon = (type: FileItem['type']) => {
  switch (type) {
    case 'folder': return <Folder className="h-5 w-5 text-amber-400" />
    case 'document': return <FileText className="h-5 w-5 text-blue-400" />
    case 'image': return <Image className="h-5 w-5 text-emerald-400" />
    case 'video': return <Film className="h-5 w-5 text-purple-400" />
    case 'audio': return <Music className="h-5 w-5 text-rose-400" />
    case 'archive': return <FileArchive className="h-5 w-5 text-orange-400" />
  }
}

const sidebarItems = [
  { icon: HardDrive, label: 'My Drive', active: true },
  { icon: Star, label: 'Starred' },
  { icon: MessageSquare, label: 'Saved Messages' },
  { icon: Download, label: 'Downloads' },
  { icon: Clock, label: 'Recent' },
]

export function DashboardPage() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const api = window.electronAPI?.telegram

  useEffect(() => {
    if (api) {
      api.checkAuth().then((res) => {
        if (!res.authenticated) {
          navigate('/login', { replace: true })
        } else {
          setChecking(false)
        }
      })
    } else {
      setChecking(false)
    }
  }, [api, navigate])

  const handleSignOut = async () => {
    if (api) await api.signOut()
    navigate('/login', { replace: true })
  }

  const filteredFiles = searchQuery
    ? mockFiles.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : mockFiles

  if (checking) {
    return (
      <div className="h-svh flex flex-col bg-background">
        <TitleBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-svh flex flex-col bg-background">
      <TitleBar />

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-border bg-muted/20 flex flex-col">
          <div className="p-3">
            <Button className="w-full justify-start gap-2 h-9 text-sm" onClick={() => {}}>
              <Plus className="h-4 w-4" />
              New Folder
            </Button>
          </div>

          <nav className="flex-1 px-2 space-y-0.5">
            {sidebarItems.map((item) => (
              <button
                key={item.label}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                  item.active
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-3 border-t border-border">
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors cursor-pointer"
              onClick={handleSignOut}>
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>

          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <HardDrive className="h-3 w-3" />
              <span className="flex-1">Telegram Storage</span>
              <span>0 B / 2 GB</span>
            </div>
            <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary/30 rounded-full" style={{ width: '0%' }} />
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border">
            <div className="flex items-center gap-1 text-muted-foreground">
              <button className="p-1 rounded hover:bg-accent cursor-pointer disabled:opacity-30" disabled>
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>
              <button className="p-1 rounded hover:bg-accent cursor-pointer disabled:opacity-30" disabled>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span className="text-foreground font-medium">My Drive</span>
            </div>

            <div className="flex-1" />

            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>

            <div className="flex items-center border-l border-border pl-2 gap-1">
              <button
                className={`p-1.5 rounded cursor-pointer ${viewMode === 'grid' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                className={`p-1.5 rounded cursor-pointer ${viewMode === 'list' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* File area */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredFiles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Folder className="h-12 w-12 opacity-20" />
                <p className="text-sm">No files found</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className="group flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-accent/30 transition-all cursor-pointer"
                  >
                    <div className="size-14 flex items-center justify-center rounded-xl bg-muted/50 group-hover:bg-muted transition-colors">
                      {fileIcon(file.type)}
                    </div>
                    <span className="text-xs text-center leading-tight line-clamp-2 break-all">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {file.type === 'folder' ? `${file.items} items` : file.size}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/30 border-b border-border">
                  <div className="col-span-5 flex items-center gap-2">
                    <span>Name</span>
                  </div>
                  <div className="col-span-2">Size</div>
                  <div className="col-span-3">Modified</div>
                  <div className="col-span-2">Type</div>
                </div>
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className="grid grid-cols-12 gap-2 px-4 py-2.5 text-sm border-b border-border last:border-0 hover:bg-accent/30 transition-colors cursor-pointer"
                  >
                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                      {fileIcon(file.type)}
                      <span className="truncate">{file.name}</span>
                    </div>
                    <div className="col-span-2 text-muted-foreground text-xs self-center">
                      {file.type === 'folder' ? `${file.items} items` : file.size}
                    </div>
                    <div className="col-span-3 text-muted-foreground text-xs self-center">
                      {file.modified}
                    </div>
                    <div className="col-span-2 text-muted-foreground text-xs self-center capitalize">
                      {file.type}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between px-4 py-1 border-t border-border text-xs text-muted-foreground">
            <span>{filteredFiles.length} items</span>
            <span>Gram Drive</span>
          </div>
        </div>
      </div>
    </div>
  )
}
