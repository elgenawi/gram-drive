import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Moon, Sun } from 'lucide-react'
import { countries, type Country } from './data/countries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { useTheme } from '@/components/theme-provider'

type Step = 'phone' | 'verify' | 'loading'

function App() {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Country>(() => countries.find(c => c.code === 'us')!)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [error, setError] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const { theme, setTheme } = useTheme()

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return countries
    return countries.filter(
      c => c.name.toLowerCase().includes(q) || c.phoneCode.includes(q) || c.code.includes(q),
    )
  }, [search])

  const flagUrl = (code: string) => `/Icons/Flags/${code}.png`

  const selectCountry = useCallback((c: Country) => {
    setSelected(c)
    setSearch(c.name)
    setDropdownOpen(false)
  }, [])

  const handleSendCode = () => {
    if (!phone.trim()) {
      setError('Please enter your phone number')
      return
    }
    setError('')
    setStep('verify')
  }

  const handleVerifyCode = () => {
    if (code.length < 3) {
      setError('Please enter the verification code')
      return
    }
    setError('')
    setStep('loading')
    setTimeout(() => {
      setStep('phone')
      setPhone('')
      setCode('')
    }, 2000)
  }

  const handleBack = () => {
    setStep('phone')
    setCode('')
    setError('')
  }

  useEffect(() => {
    if (dropdownOpen && searchRef.current) {
      searchRef.current.focus()
    }
  }, [dropdownOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="min-h-svh flex items-center justify-center p-4">
      <Card className="w-full max-w-sm relative">
        <button
          onClick={toggleTheme}
          className="absolute top-3 right-3 cursor-pointer"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute inset-0 h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </button>

        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Gram Drive</CardTitle>
          <CardDescription>
            {step === 'phone' && 'Enter your phone number to sign in'}
            {step === 'verify' && (
              <>
                We've sent a code to <strong>+{selected.phoneCode} {phone}</strong>
              </>
            )}
            {step === 'loading' && 'Verifying your code...'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 'phone' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <div className="flex gap-2">
                  <div className="relative flex-[0_0_140px]">
                    <div
                      className="flex items-center gap-2 h-10 px-3 border border-input rounded-md cursor-pointer bg-background hover:bg-accent/50 transition-colors"
                      onClick={() => setDropdownOpen(prev => !prev)}
                    >
                      <img
                        src={flagUrl(selected.code)}
                        alt=""
                        className="w-6 h-[18px] rounded-sm object-cover flex-shrink-0"
                      />
                      <span className="text-sm flex-1 truncate">+{selected.phoneCode}</span>
                      <span className="text-xs text-muted-foreground">&#9662;</span>
                    </div>

                    {dropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                        <div className="absolute top-11 left-0 right-0 max-h-64 overflow-y-auto bg-popover border border-border rounded-lg shadow-xl z-20">
                          <div className="sticky top-0 bg-popover p-2 border-b border-border">
                            <Input
                              ref={searchRef}
                              placeholder="Search country..."
                              value={search}
                              onChange={e => {
                                setSearch(e.target.value)
                                setDropdownOpen(true)
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                          {filtered.length === 0 ? (
                            <div className="p-3 text-sm text-muted-foreground text-center">
                              No countries found
                            </div>
                          ) : (
                            filtered.map(c => (
                              <div
                                key={c.code}
                                className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer transition-colors ${
                                  c.code === selected.code
                                    ? 'bg-accent text-accent-foreground'
                                    : 'hover:bg-accent/50'
                                }`}
                                onClick={() => selectCountry(c)}
                              >
                                <img
                                  src={flagUrl(c.code)}
                                  alt=""
                                  className="w-6 h-[18px] rounded-sm object-cover flex-shrink-0"
                                />
                                <span className="flex-1 truncate">{c.name}</span>
                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                  +{c.phoneCode}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex-1">
                    <Input
                      type="tel"
                      placeholder="Phone number"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      onKeyDown={e => e.key === 'Enter' && handleSendCode()}
                      className={error ? 'border-destructive' : ''}
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <Button className="w-full" disabled={!phone.trim()} onClick={handleSendCode}>
                Next
              </Button>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && handleVerifyCode()}
                  className={`text-center text-2xl tracking-[8px] font-semibold ${
                    error ? 'border-destructive' : ''
                  }`}
                  autoFocus
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <Button className="w-full" disabled={code.length < 3} onClick={handleVerifyCode}>
                Verify
              </Button>

              <div className="text-center">
                <button
                  onClick={handleBack}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  Change phone number
                </button>
              </div>
            </div>
          )}

          {step === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Verifying code...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default App
