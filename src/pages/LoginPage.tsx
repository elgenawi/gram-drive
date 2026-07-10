import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { countries, type Country } from '@/data/countries'
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
import { TitleBar } from '@/components/title-bar'

type Step = 'phone' | 'verify' | 'password' | 'loading'

export function LoginPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Country>(() => countries.find(c => c.code === 'us')!)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [error, setError] = useState('')
  const [phoneCodeHash, setPhoneCodeHash] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const api = window.electronAPI?.telegram

  useEffect(() => {
    if (api) {
      api.checkAuth().then((res) => {
        if (res.authenticated) {
          navigate('/', { replace: true })
        }
      })
    }
  }, [api, navigate])

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

  const handleSendCode = async () => {
    if (!phone.trim()) {
      setError('Please enter your phone number')
      return
    }
    setError('')
    const fullPhone = `+${selected.phoneCode}${phone}`
    setStep('loading')
    if (!api) {
      setError('Telegram API not available (running in browser?)')
      setStep('phone')
      return
    }
    const result = await api.sendCode(fullPhone)
    if (!result.success) {
      setError(result.error || 'Failed to send code')
      setStep('phone')
      return
    }
    setPhoneCodeHash(result.phoneCodeHash || '')
    setStep('verify')
  }

  const handleVerifyCode = async () => {
    if (code.length < 3) {
      setError('Please enter the verification code')
      return
    }
    setError('')
    setStep('loading')
    if (!api) {
      setError('Telegram API not available')
      setStep('verify')
      return
    }
    const result = await api.verifyCode(code)
    if (result.passwordNeeded) {
      setStep('password')
      return
    }
    if (!result.success) {
      setError(result.error || 'Invalid code')
      setStep('verify')
      return
    }
    navigate('/', { replace: true })
  }

  const handlePassword = async () => {
    if (!password.trim()) {
      setError('Please enter your password')
      return
    }
    setError('')
    setStep('loading')
    if (!api) {
      setError('Telegram API not available')
      setStep('password')
      return
    }
    const result = await api.checkPassword(password)
    if (!result.success) {
      setError(result.error || 'Invalid password')
      setStep('password')
      return
    }
    navigate('/', { replace: true })
  }

  const handleBack = () => {
    setStep('phone')
    setCode('')
    setPassword('')
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

  return (
    <div className="h-svh flex flex-col bg-background">
      <TitleBar />
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm relative">

          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Gram Drive</CardTitle>
            {step === 'phone' && (
              <CardDescription className="text-sm leading-relaxed">
                Enter your phone number to sign in
              </CardDescription>
            )}
            {step === 'verify' && (
              <CardDescription>
                We've sent a code to <strong>+{selected.phoneCode} {phone}</strong>
              </CardDescription>
            )}
            {step === 'password' && (
              <CardDescription>
                This account has 2FA enabled. Enter your password.
              </CardDescription>
            )}
            {step === 'loading' && (
              <CardDescription>
                {step === 'loading' && code ? 'Verifying your code...' : 'Sending code...'}
              </CardDescription>
            )}
          </CardHeader>

          <CardContent>
            {step === 'phone' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/30">
                    <div className="relative flex-shrink-0">
                      <div
                        className="flex items-center gap-2 h-12 px-3 border-2 border-border rounded-lg cursor-pointer bg-background hover:border-primary/50 transition-colors min-w-[120px]"
                        onClick={() => setDropdownOpen(prev => !prev)}
                      >
                        <img
                          src={flagUrl(selected.code)}
                          alt=""
                          className="w-7 h-5 rounded-sm object-cover flex-shrink-0"
                        />
                        <span className="text-base font-medium flex-1 truncate">+{selected.phoneCode}</span>
                        <span className="text-xs text-muted-foreground">&#9662;</span>
                      </div>

                      {dropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                          <div className="absolute top-13 left-0 w-72 max-h-64 overflow-y-auto bg-popover border border-border rounded-lg shadow-xl z-20">
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
                                  className={`flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer transition-colors ${
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

                    <div className="w-px h-8 bg-border flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                      <input
                        type="tel"
                        placeholder="Phone number"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                        onKeyDown={e => e.key === 'Enter' && handleSendCode()}
                        className="w-full h-12 bg-transparent text-base outline-none placeholder:text-muted-foreground/60"
                      />
                    </div>
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>

                <Button className="w-full h-11 text-base" disabled={!phone.trim()} onClick={handleSendCode}>
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

            {step === 'password' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">2FA Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handlePassword()}
                    className={error ? 'border-destructive' : ''}
                    autoFocus
                  />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>

                <Button className="w-full" disabled={!password.trim()} onClick={handlePassword}>
                  Sign In
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
                <p className="text-sm text-muted-foreground">Please wait...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
