import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Folder, CloudOff } from 'lucide-react'
import { TitleBar } from '@/components/title-bar'
import { PreviewModal } from '@/components/preview-modal'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardToolbar } from '@/components/dashboard-toolbar'
import { FileGridView } from '@/components/file-grid-view'
import { FileListView } from '@/components/file-list-view'
import { NameDialog } from '@/components/name-dialog'

const api = () => window.electronAPI

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
  const [nameDialog, setNameDialog] = useState<{ mode: 'create' | 'rename'; item?: FSItem } | null>(null)
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
    if (s.synced) setSynced(true)
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

  const navigateHome = () => {
    setCurrentParent('-1')
    setBreadcrumbs([])
    loadItems('-1')
  }

  const handleNewFolder = () => {
    setNameDialog({ mode: 'create' })
  }

  const handleRename = (item: FSItem) => {
    setNameDialog({ mode: 'rename', item })
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

  const handleMove = async (itemId: string, targetFolderId: string) => {
    const res = await api()!.folder!.move(itemId, targetFolderId)
    if (!res.success) { setSyncWarn('Move failed: ' + (res.error || 'unknown error')); return }
    if (res.synced === false) setSyncWarn('Item moved locally but database upload to cloud failed')
    await loadItems(currentParent)
  }

  const handleNameConfirm = async (name: string) => {
    if (!nameDialog) return
    if (nameDialog.mode === 'create') {
      const res = await api()!.folder!.create(currentParent === '-1' ? undefined : currentParent, name)
      if (res.synced === false) setSyncWarn('Folder created locally but database upload to cloud failed')
    } else if (nameDialog.mode === 'rename' && nameDialog.item) {
      if (name === nameDialog.item.Name) { setNameDialog(null); return }
      const res = await api()!.folder!.rename(nameDialog.item.Id, name)
      if (res.synced === false) setSyncWarn('Rename saved locally but database upload to cloud failed')
    }
    setNameDialog(null)
    await loadItems(currentParent)
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
        <DashboardSidebar
          currentParent={currentParent}
          indexing={indexing}
          synced={synced}
          onNewFolder={handleNewFolder}
          onUpload={handleUpload}
          onNavigateHome={navigateHome}
          onSync={handleSync}
          onIndexTelegram={handleIndexTelegram}
          onSignOut={handleSignOut}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <DashboardToolbar
            breadcrumbs={breadcrumbs}
            searchQuery={searchQuery}
            viewMode={viewMode}
            onNavigateHome={navigateHome}
            onNavigateBreadcrumb={navigateBreadcrumb}
            onSearchChange={setSearchQuery}
            onViewModeChange={setViewMode}
          />

          {syncWarn && (
            <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-600">
              <CloudOff className="h-3 w-3 shrink-0" />
              <span className="flex-1">{syncWarn}</span>
              <button className="hover:text-amber-800 cursor-pointer" onClick={() => setSyncWarn('')}>✕</button>
            </div>
          )}

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
              <FileGridView items={filteredItems} onClick={handleClick} onRename={handleRename} onDelete={handleDelete} onMove={handleMove} />
            ) : (
              <FileListView items={filteredItems} onClick={handleClick} onRename={handleRename} onDelete={handleDelete} onMove={handleMove} />
            )}
          </div>

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

      <NameDialog
        open={nameDialog !== null}
        title={nameDialog?.mode === 'create' ? 'Create Folder' : 'Rename'}
        initialValue={nameDialog?.mode === 'rename' ? nameDialog.item?.Name ?? '' : ''}
        placeholder="Folder name"
        onConfirm={handleNameConfirm}
        onCancel={() => setNameDialog(null)}
      />
    </div>
  )
}
