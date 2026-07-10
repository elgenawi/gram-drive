/// <reference types="vite/client" />

interface TelegramAPI {
  checkAuth: () => Promise<{ authenticated: boolean; hasSession: boolean; error?: string }>
  sendCode: (phone: string) => Promise<{ success: boolean; phoneCodeHash?: string; timeout?: number; error?: string }>
  verifyCode: (code: string) => Promise<{ success: boolean; passwordNeeded?: boolean; session?: string; error?: string }>
  checkPassword: (password: string) => Promise<{ success: boolean; session?: string; error?: string }>
  signOut: () => Promise<{ success: boolean; error?: string }>
}

interface Window {
  electronAPI?: {
    platform: string
    minimize: () => void
    maximize: () => void
    close: () => void
    telegram: TelegramAPI
  }
}
