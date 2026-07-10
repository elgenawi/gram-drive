import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

export function SplashPage() {
  const navigate = useNavigate()
  const [progress, setProgress] = useState(0)
  const api = window.electronAPI?.telegram

  useEffect(() => {
    const start = Date.now()
    const duration = 800
    const timer = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.min((elapsed / duration) * 100, 100)
      setProgress(pct)
      if (pct >= 100) {
        clearInterval(timer)
        if (api) {
          api.checkAuth().then((res) => {
            navigate(res.authenticated ? "/drive" : "/login", { replace: true })
          })
        } else {
          navigate("/login", { replace: true })
        }
      }
    }, 30)
    return () => clearInterval(timer)
  }, [navigate, api])

  return (
    <div className="h-svh flex flex-col items-center justify-center gap-6 bg-background app-region-drag">
      <div className="flex flex-col items-center gap-2">
        <div className="size-12 rounded-xl bg-primary flex items-center justify-center">
          <span className="text-primary-foreground text-2xl font-bold">G</span>
        </div>
        <h1 className="text-xl font-semibold text-foreground">Gram Drive</h1>
      </div>

      <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-100 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-xs text-muted-foreground">Loading...</p>
    </div>
  )
}
