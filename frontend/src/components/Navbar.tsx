import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export default function Navbar() {
  const location = useLocation()
  const isAdmin = !!localStorage.getItem('admin_token')

  const { data: live } = useQuery({
    queryKey: ['live'],
    queryFn: () => api.get('/api/live').then((r) => r.data),
    refetchInterval: 10_000,
    staleTime: 5_000,
  })

  const isLive = live?.is_live === true

  const linkClass = (path: string) =>
    `px-4 py-2 rounded text-sm font-medium transition-colors ${
      location.pathname === path
        ? 'bg-yellow-500 text-black'
        : 'text-gray-400 hover:text-white'
    }`

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(10,25,100,0.70)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.15)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-yellow-500 font-bold text-lg tracking-wide">
            CS2 LEADERBOARD
          </span>
          <span className="text-gray-600 text-xs hidden sm:block">2v2 Competition</span>
        </Link>

        <div className="flex items-center gap-1">
          <Link to="/" className={linkClass('/')}>
            Leaderboard
          </Link>
          <Link to="/matches" className={linkClass('/matches')}>
            Meciuri
          </Link>
          <Link to="/live" className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
            location.pathname === '/live'
              ? 'bg-red-600 text-white'
              : isLive
              ? 'text-red-400 hover:text-red-300'
              : 'text-gray-400 hover:text-white'
          }`}>
            {isLive && (
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
            Live
          </Link>
          <Link to="/desktop" className={linkClass('/desktop')}>
            Desktop
          </Link>
          {isAdmin ? (
            <Link to="/admin/upload" className={linkClass('/admin/upload')}>
              Admin
            </Link>
          ) : (
            <Link to="/admin/login" className={linkClass('/admin/login')}>
              Admin
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
