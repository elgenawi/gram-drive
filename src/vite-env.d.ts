/// <reference types="vite/client" />

type FSItem = {
  Id: string
  IdInMessage?: number | null
  IsActive?: number
  ParentId?: string
  MimeType?: string | null
  Name?: string
  IsFolder?: number
  TimeCreation?: number
  TimeUpdate?: number
  Size?: number
  IsSelected?: number
  Extention?: string | null
  MessageId?: number | null
  LocalUrl?: string | null
  Icon?: string | null
  Type?: string | null
  ThumbnailUrl?: string | null
  RemoteId?: string | null
  RemoteUniqueId?: string | null
  Note?: string | null
  SizeNormal?: string | null
  DateNormal?: string | null
  ExtentionNormal?: string | null
}

type TelegramAPI = {
  checkAuth: () => Promise<{ authenticated: boolean; hasSession: boolean; error?: string }>
  sendCode: (phone: string) => Promise<{ success: boolean; phoneCodeHash?: string; timeout?: number; error?: string }>
  verifyCode: (code: string) => Promise<{ success: boolean; passwordNeeded?: boolean; session?: string; error?: string }>
  checkPassword: (password: string) => Promise<{ success: boolean; session?: string; error?: string }>
  signOut: () => Promise<{ success: boolean; error?: string }>
}

type DatabaseAPI = {
  init: () => Promise<{ success: boolean; error?: string }>
  getItems: (parentId?: string) => Promise<{ success: boolean; items?: FSItem[]; error?: string }>
  getItem: (id: string) => Promise<{ success: boolean; item?: FSItem; error?: string }>
  getAll: () => Promise<{ success: boolean; items?: FSItem[]; count?: number; error?: string }>
}

type SyncAPI = {
  upload: () => Promise<{ success: boolean; messageId?: number; error?: string }>
  download: () => Promise<{ success: boolean; found?: boolean; messageId?: number; indexed?: number; error?: string }>
  indexTelegram: () => Promise<{ success: boolean; indexed?: number; error?: string }>
  startAutoIndex: () => Promise<{ success: boolean; error?: string }>
  stopAutoIndex: () => Promise<{ success: boolean }>
  status: () => Promise<{ success: boolean; synced?: boolean; messageId?: number | null; itemCount?: number; error?: string }>
}

type FolderAPI = {
  create: (parentId: string | undefined, name: string) => Promise<{ success: boolean; id?: string; synced?: boolean; error?: string }>
  rename: (id: string, name: string) => Promise<{ success: boolean; synced?: boolean; error?: string }>
  delete: (id: string) => Promise<{ success: boolean; synced?: boolean; error?: string }>
}

type FileAPI = {
  upload: (parentId?: string) => Promise<{ success: boolean; canceled?: boolean; items?: FSItem[]; synced?: boolean; error?: string }>
  download: (itemId: string) => Promise<{ success: boolean; canceled?: boolean; path?: string; error?: string }>
  preview: (item: FSItem) => Promise<{ success: boolean; url?: string; mimeType?: string; error?: string; isStream?: boolean }>
}

  interface Window {
    electronAPI?: {
      platform: string
      minimize: () => void
      maximize: () => void
      close: () => void
      focus: () => void
    telegram: TelegramAPI
    db: DatabaseAPI
    sync: SyncAPI
    folder: FolderAPI
    file: FileAPI
  }
}
