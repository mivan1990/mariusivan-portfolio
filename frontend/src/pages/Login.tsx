import { useState, useEffect, type KeyboardEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'

type Phase = 'locked' | 'login' | 'register'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [phase, setPhase] = useState<Phase>(searchParams.get('register') !== null ? 'register' : 'locked')
  const [time, setTime] = useState(new Date())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('user_token')) {
      navigate('/desktop', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const timeStr = time.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
  const dateStr = time.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  async function handleLogin() {
    if (!email || !password) return
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/api/auth/login', { email, password })
      localStorage.setItem('user_token', data.access_token)
      if (data.admin_token) localStorage.setItem('admin_token', data.admin_token)
      navigate('/desktop', { replace: true })
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e?.response?.data?.detail || 'Email sau parola incorecta')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister() {
    if (!email || !password) return
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/api/auth/register', {
        email,
        password,
        display_name: displayName || undefined,
      })
      localStorage.setItem('user_token', data.access_token)
      navigate('/desktop', { replace: true })
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e?.response?.data?.detail || 'Eroare la inregistrare')
    } finally {
      setLoading(false)
    }
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter') phase === 'login' ? handleLogin() : handleRegister()
  }

  function switchPhase(p: Phase) {
    setPhase(p)
    setError('')
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden flex flex-col"
      style={{
        background: 'radial-gradient(ellipse at center, #1e3c7b 0%, #0d1f4a 55%, #050e28 100%)',
      }}
    >
      {/* XP top bar */}
      <div
        className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{
          background: 'linear-gradient(to bottom, #1c4fc4 0%, #0a2ea8 40%, #082898 100%)',
          borderBottom: '2px solid #0a1e78',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}
      >
        {/* Windows XP logo area */}
        <div className="flex items-center gap-3">
          <img src="/win11_logo.png" alt="" className="w-8 h-8 object-contain" />
          <div>
            <div className="text-white font-bold text-lg leading-none" style={{ fontFamily: 'Trebuchet MS, sans-serif' }}>
              Windows <span className="italic font-normal">XP</span>
            </div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>CS2 IVAN Edition</div>
          </div>
        </div>

        {/* Clock */}
        <div className="text-right">
          <div className="text-white font-bold text-base">{timeStr}</div>
          <div className="text-xs capitalize" style={{ color: 'rgba(255,255,255,0.6)' }}>{dateStr}</div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center">

        {/* Lock screen */}
        <div
          className={`flex flex-col items-center transition-all duration-500 ${
            phase === 'locked' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none absolute'
          }`}
        >
          {/* Welcome panel */}
          <div
            className="rounded-lg overflow-hidden shadow-2xl cursor-pointer"
            style={{
              width: '420px',
              border: '2px solid #4a7fd4',
              boxShadow: '0 0 0 1px #0a246a, 0 8px 32px rgba(0,0,0,0.6)',
            }}
            onClick={() => switchPhase('login')}
          >
            {/* Panel header */}
            <div
              className="px-6 py-4 text-center"
              style={{
                background: 'linear-gradient(to bottom, #2563c8 0%, #1a50b8 100%)',
                borderBottom: '1px solid #0a246a',
              }}
            >
              <div className="text-white text-xl font-bold" style={{ fontFamily: 'Trebuchet MS, sans-serif' }}>
                Bine ai venit
              </div>
              <div className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Sistemul de operare IVAN
              </div>
            </div>

            {/* Panel body */}
            <div
              className="px-8 py-6 flex flex-col items-center gap-4"
              style={{ background: 'linear-gradient(to bottom, #dce8fc 0%, #c8dcf8 100%)' }}
            >
              {/* User avatar */}
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #4a90d4 0%, #1a5cb8 100%)',
                  border: '3px solid #0a246a',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}
              >
                <svg viewBox="0 0 24 24" className="w-12 h-12 fill-white">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
              </div>

              <div className="text-center">
                <div className="font-bold text-lg" style={{ color: '#0a246a', fontFamily: 'Trebuchet MS, sans-serif' }}>
                  Utilizator
                </div>
                <div className="text-sm mt-1" style={{ color: '#336699' }}>
                  Click pentru a te conecta
                </div>
              </div>

              <div className="text-xs text-center animate-pulse" style={{ color: '#336699' }}>
                ▼ Click oriunde pentru a continua ▼
              </div>
            </div>
          </div>
        </div>

        {/* Login / Register panel */}
        <div
          className={`transition-all duration-500 ${
            phase !== 'locked' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none absolute'
          }`}
        >
          <div
            className="rounded-lg overflow-hidden shadow-2xl"
            style={{
              width: '380px',
              border: '2px solid #4a7fd4',
              boxShadow: '0 0 0 1px #0a246a, 0 8px 32px rgba(0,0,0,0.6)',
            }}
          >
            {/* Panel header */}
            <div
              className="px-6 py-3 flex items-center gap-3"
              style={{
                background: 'linear-gradient(to bottom, #2563c8 0%, #1a50b8 100%)',
                borderBottom: '1px solid #0a246a',
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
              </div>
              <div>
                <div className="text-white font-bold text-sm" style={{ fontFamily: 'Trebuchet MS, sans-serif' }}>
                  {phase === 'login' ? 'Conectare' : 'Cont nou'}
                </div>
                <div className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>Sistemul de operare IVAN</div>
              </div>
            </div>

            {/* Panel body */}
            <div
              className="px-6 py-5 space-y-3"
              style={{ background: 'linear-gradient(to bottom, #dce8fc 0%, #c8dcf8 100%)' }}
            >
              {phase === 'register' && (
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: '#0a246a' }}>Nume afisat (optional)</label>
                  <input
                    className="w-full px-3 py-1.5 text-sm outline-none"
                    style={{
                      background: 'white',
                      border: '2px inset #a0b8d8',
                      color: '#000',
                    }}
                    placeholder="Numele tau"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onKeyDown={onKey}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: '#0a246a' }}>Adresa de email</label>
                <input
                  type="email"
                  className="w-full px-3 py-1.5 text-sm outline-none"
                  style={{
                    background: 'white',
                    border: '2px inset #a0b8d8',
                    color: '#000',
                  }}
                  placeholder="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={onKey}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: '#0a246a' }}>Parola</label>
                <input
                  type="password"
                  className="w-full px-3 py-1.5 text-sm outline-none"
                  style={{
                    background: 'white',
                    border: '2px inset #a0b8d8',
                    color: '#000',
                  }}
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={onKey}
                />
              </div>

              {error && (
                <div
                  className="text-xs px-3 py-2 rounded"
                  style={{ background: '#ffd0d0', border: '1px solid #c04040', color: '#800000' }}
                >
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => switchPhase('locked')}
                  className="text-xs px-3 py-1 transition-all"
                  style={{
                    background: 'linear-gradient(to bottom, #e8e8e8, #d0d0d0)',
                    border: '1px solid #888',
                    color: '#333',
                    boxShadow: '1px 1px 0 rgba(255,255,255,0.8) inset',
                  }}
                >
                  ← Inapoi
                </button>

                <div className="flex items-center gap-2">
                  {phase === 'login' && (
                    <button
                      onClick={() => switchPhase('register')}
                      className="text-xs px-4 py-2 font-bold transition-all"
                      style={{
                        background: 'linear-gradient(to bottom, #2a7ad8 0%, #1a5cc0 100%)',
                        border: '1px solid #0a246a',
                        color: 'white',
                        boxShadow: '0 0 0 1px rgba(255,255,255,0.2) inset, 0 3px 8px rgba(0,0,0,0.35)',
                        textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                        borderRadius: '3px',
                      }}
                    >
                      + Cont nou
                    </button>
                  )}

                  <button
                    disabled={loading || !email || !password}
                    onClick={phase === 'login' ? handleLogin : handleRegister}
                    className="text-sm px-6 py-2 font-black transition-all disabled:opacity-50"
                    style={{
                      background: loading || !email || !password
                        ? 'linear-gradient(to bottom, #b8a040, #9a8030)'
                        : 'linear-gradient(to bottom, #f5c400 0%, #e0a800 50%, #c89000 100%)',
                      border: '1px solid #8a6000',
                      color: '#1a0000',
                      boxShadow: loading || !email || !password
                        ? 'none'
                        : '0 0 0 1px rgba(255,255,255,0.4) inset, 0 4px 12px rgba(200,144,0,0.5)',
                      textShadow: 'none',
                      borderRadius: '3px',
                      letterSpacing: '0.3px',
                    }}
                  >
                    {loading ? '...' : phase === 'login' ? 'Conectare →' : 'Creeaza cont →'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* XP bottom bar */}
      <div
        className="flex items-center justify-center py-2 flex-shrink-0"
        style={{
          background: 'linear-gradient(to bottom, #1a4bc0 0%, #1040b0 100%)',
          borderTop: '2px solid #4a7fd4',
        }}
      >
        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Microsoft Windows XP — CS2 IVAN Edition
        </div>
      </div>
    </div>
  )
}
