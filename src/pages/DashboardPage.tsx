import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { TitleBar } from '@/components/title-bar'
import {
  Folder,
  FileText,
  Image,
  Film,
  Music,
  FileArchive,
  HardDrive,
  Search,
  Grid3X3,
  List,
  LogOut,
  ChevronRight,
  Star,
  MessageSquare,
  Download,
  Clock,
  Plus,
  Upload,
  Trash2,
  Pencil,
  RefreshCw,
  Cloud,
  CloudOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PreviewModal } from '@/components/preview-modal'

const api = () => window.electronAPI

const fileIcon = (type: string | undefined | null, isFolder: number | undefined | null) => {
  if (isFolder) return <Folder className="h-5 w-5 text-amber-400" />
  switch (type) {
    case 'image': return <Image className="h-5 w-5 text-emerald-400" />
    case 'video': return <Film className="h-5 w-5 text-purple-400" />
    case 'audio': return <Music className="h-5 w-5 text-rose-400" />
    case 'archive': return <FileArchive className="h-5 w-5 text-orange-400" />
    default: return <FileText className="h-5 w-5 text-blue-400" />
  }
}

const formatSize = (bytes: number | undefined | null) => {
  if (!bytes) return '--'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const formatDate = (ts: number | undefined | null) => {
  if (!ts) return '--'
  return new Date(ts * 1000).toLocaleDateString()
}

const sidebarItems = [
  { icon: HardDrive, label: 'My Drive', value: '-1' },
  { icon: Star, label: 'Starred' },
  { icon: MessageSquare, label: 'Saved Messages' },
  { icon: Download, label: 'Downloads' },
  { icon: Clock, label: 'Recent' },
]

export function DashboardPage() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<FSItem[]>([])
  const [currentParent, setCurrentParent] = useState('-1')
  const [breadcrumbs, setBreadcrumbs] = useState<FSItem[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [synced, setSynced] = useState(false)
  const [syncWarn, setSyncWarn] = useState('')
  const [indexing, setIndexing] = useState(false)
  const [previewItem, setPreviewItem] = useState<FSItem | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    if (api()?.telegram) {
      api()!.telegram!.checkAuth().then((res) => {
        if (!res.authenticated) {
          navigate('/login', { replace: true })
          return
        }
        initApp()
      })
    } else {
      setChecking(false)
      setLoading(false)
    }
  }, [])

  const runSyncAndIndex = async () => {
    const s0 = await api()!.sync!.status()
    if (s0.synced) {
      const up = await api()!.sync!.upload()
      if (!up.success) { setSyncWarn('Sync failed: ' + up.error); return }
      const idx = await api()!.sync!.indexTelegram()
      if (idx.success && idx.indexed > 0) {
        setSyncWarn('Indexed ' + idx.indexed + ' new files from Telegram')
        await loadItems(currentParent)
      }
    } else {
      const dl = await api()!.sync!.download()
      if (dl.found) {
        if (dl.indexed > 0) setSyncWarn('Indexed ' + dl.indexed + ' new files')
        await loadItems(currentParent)
      } else {
        const up = await api()!.sync!.upload()
        if (!up.success) { setSyncWarn('Initial sync failed: ' + up.error); return }
      }
    }
    const s = await api()!.sync!.status()
    setSynced(!!s.synced)
    await api()!.sync!.startAutoIndex()
  }

  const initApp = async () => {
    await api()!.db!.init()
    const s = await api()!.sync!.status()
    if (s.synced) {
      setSynced(true)
    }
    await loadItems('-1')
    setChecking(false)
    setLoading(false)
    runSyncAndIndex()
    setTimeout(() => window.electronAPI?.focus(), 500)
  }

  const loadItems = async (parentId: string) => {
    const res = await api()!.db!.getItems(parentId)
    if (res.items) setItems(res.items)
  }

  const navigateTo = useCallback(async (folder: FSItem) => {
    setCurrentParent(folder.Id)
    setBreadcrumbs(prev => [...prev, folder])
    setLoading(true)
    await loadItems(folder.Id)
    setLoading(false)
  }, [])

  const navigateBreadcrumb = async (index: number) => {
    const target = index === -1 ? { Id: '-1' as string } : breadcrumbs[index]
    setCurrentParent(target.Id)
    setBreadcrumbs(prev => prev.slice(0, index + 1))
    setLoading(true)
    await loadItems(target.Id)
    setLoading(false)
  }

  const handleNewFolder = async () => {
    const name = prompt('Folder name:')
    if (!name?.trim()) return
    const res = await api()!.folder!.create(currentParent === '-1' ? undefined : currentParent, name.trim())
    if (res.synced === false) setSyncWarn('Folder created locally but database upload to cloud failed')
    await loadItems(currentParent)
  }

  const handleRename = async (item: FSItem) => {
    const name = prompt('New name:', item.Name)
    if (!name?.trim() || name === item.Name) return
    const res = await api()!.folder!.rename(item.Id, name.trim())
    if (res.synced === false) setSyncWarn('Rename saved locally but database upload to cloud failed')
    await loadItems(currentParent)
  }

  const handleDelete = async (item: FSItem) => {
    if (!confirm(`Delete "${item.Name}"?`)) return
    const res = await api()!.folder!.delete(item.Id)
    if (res.synced === false) setSyncWarn('Delete saved locally but database upload to cloud failed')
    await loadItems(currentParent)
  }

  const handleUpload = async () => {
    const res = await api()!.file!.upload(currentParent === '-1' ? undefined : currentParent)
    if (res.synced === false) setSyncWarn('Files uploaded locally but DB sync failed')
    if (res.error) setSyncWarn('Upload error: ' + res.error)
    await loadItems(currentParent)
  }

  const handleClick = async (item: FSItem) => {
    if (item.IsFolder) {
      navigateTo(item)
      return
    }
    const isMedia = item.Type === 'image' || item.Type === 'video' || item.MimeType?.startsWith('image/') || item.MimeType?.startsWith('video/')
    if (isMedia) {
      const res = await api()!.file!.preview(item)
      if (res.success && res.url) {
        setPreviewUrl(res.url)
        setPreviewItem(item)
      }
      return
    }
    await api()!.file!.download(item.Id)
  }

  const handleSync = async () => {
    const up = await api()!.sync!.upload()
    if (!up.success) { setSyncWarn('Sync upload failed: ' + up.error); return }
    const idx = await api()!.sync!.indexTelegram()
    if (idx.success && idx.indexed > 0) {
      setSyncWarn('Indexed ' + idx.indexed + ' new files from Telegram')
      await loadItems(currentParent)
    } else {
      setSyncWarn('Database synced')
      setTimeout(() => setSyncWarn(''), 3000)
    }
    const s = await api()!.sync!.status()
    setSynced(!!s.synced)
    api()!.sync!.startAutoIndex()
  }

  const handleIndexTelegram = async () => {
    setIndexing(true)
    const r = await api()!.sync!.indexTelegram()
    if (r.success && r.indexed > 0) {
      setSyncWarn('Indexed ' + r.indexed + ' new files from Telegram')
      await loadItems(currentParent)
    } else if (r.success && r.indexed === 0) {
      setSyncWarn('No new files found on Telegram')
      setTimeout(() => setSyncWarn(''), 3000)
    } else if (!r.success) {
      setSyncWarn('Index failed: ' + r.error)
    }
    setIndexing(false)
  }

  const handleSignOut = async () => {
    await api()!.sync!.stopAutoIndex()
    await api()!.telegram!.signOut()
    navigate('/login', { replace: true })
  }

  const filteredItems = searchQuery
    ? items.filter(f => f.Name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : items

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
          <div className="p-3 space-y-2">
            <Button className="w-full justify-start gap-2 h-9 text-sm" onClick={handleNewFolder}>
              <Plus className="h-4 w-4" />
              New Folder
            </Button>
            <Button className="w-full justify-start gap-2 h-9 text-sm" variant="outline" onClick={handleUpload}>
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
                onClick={() => {
                  if (item.value === '-1') {
                    setCurrentParent('-1')
                    setBreadcrumbs([])
                    loadItems('-1')
                  }
                }}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-3 border-t border-border space-y-2">
            <button
              className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors cursor-pointer"
              onClick={handleSync}
            >
              <RefreshCw className="h-4 w-4 shrink-0" />
              <span>Sync Now</span>
            </button>
            <button
              className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
              onClick={handleIndexTelegram}
              disabled={indexing}
            >
              <Download className="h-4 w-4 shrink-0" />
              <span>{indexing ? 'Indexing...' : 'Index from Telegram'}</span>
            </button>
            <button
              className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors cursor-pointer"
              onClick={handleSignOut}
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

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border">
            <div className="flex items-center gap-1 text-muted-foreground">
              <button
                className="p-1 rounded hover:bg-accent cursor-pointer disabled:opacity-30"
                disabled={breadcrumbs.length === 0}
                onClick={() => navigateBreadcrumb(-1)}
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <button
                className="hover:text-foreground transition-colors cursor-pointer"
                onClick={() => {
                  setCurrentParent('-1')
                  setBreadcrumbs([])
                  loadItems('-1')
                }}
              >
                My Drive
              </button>
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.Id} className="flex items-center gap-1.5">
                  <ChevronRight className="h-3 w-3" />
                  <button
                    className="hover:text-foreground transition-colors cursor-pointer"
                    onClick={() => navigateBreadcrumb(i)}
                  >
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

          {syncWarn && (
            <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-600">
              <CloudOff className="h-3 w-3 shrink-0" />
              <span className="flex-1">{syncWarn}</span>
              <button className="hover:text-amber-800 cursor-pointer" onClick={() => setSyncWarn('')}>✕</button>
            </div>
          )}
          {/* File area */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Folder className="h-12 w-12 opacity-20" />
                <p className="text-sm">This folder is empty</p>
                <p className="text-xs">Upload files or create a folder to get started</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredItems.map((file) => (
                    <div
                      key={file.Id}
                      className="group relative flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-accent/30 transition-all cursor-pointer"
                      onClick={() => handleClick(file)}
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
                          onClick={(e) => { e.stopPropagation(); handleRename(file) }}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          className="p-1 rounded bg-background border border-border hover:bg-destructive hover:text-destructive-foreground cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); handleDelete(file) }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/30 border-b border-border">
                  <div className="col-span-5 flex items-center gap-2">Name</div>
                  <div className="col-span-2">Size</div>
                  <div className="col-span-3">Modified</div>
                  <div className="col-span-2">Actions</div>
                </div>
                {filteredItems.map((file) => (
                  <div
                    key={file.Id}
                    className="grid grid-cols-12 gap-2 px-4 py-2.5 text-sm border-b border-border last:border-0 hover:bg-accent/30 transition-colors cursor-pointer"
                    onClick={() => handleClick(file)}
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
                        onClick={(e) => { e.stopPropagation(); handleRename(file) }}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-destructive hover:text-destructive-foreground cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); handleDelete(file) }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between px-4 py-1 border-t border-border text-xs text-muted-foreground">
            <span>{filteredItems.length} items</span>
            <span>Gram Drive {synced ? '| Synced' : '| Not synced'}</span>
          </div>
        </div>
      </div>
      {previewUrl && (
        <PreviewModal
          item={previewItem}
          url={previewUrl}
          onClose={() => { setPreviewUrl(''); setPreviewItem(null) }}
        />
      )}
    </div>
  )
}
