import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Navbar from './components/Navbar'
import Matches from './pages/Matches'
import MatchDetail from './pages/MatchDetail'
import PlayerProfile from './pages/PlayerProfile'
import AdminUpload from './pages/admin/Upload'
import LiveMatch from './pages/LiveMatch'
import Desktop from './pages/Desktop'
import LoginScreen from './components/xp/LoginScreen'
import { api } from './api/client'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

function XPLoginScreen() {
  const navigate = useNavigate()

  async function handleEnter() {
    try {
      const res = await api.post('/api/auth/demo')
      localStorage.setItem('user_token', res.data.access_token)
      localStorage.setItem('admin_token', res.data.admin_token)
    } catch {}
    navigate('/desktop')
  }

  return <LoginScreen onContinue={handleEnter} />
}

function Layout() {
  const location = useLocation()

  if (location.pathname.startsWith('/desktop')) {
    return (
      <Routes>
        <Route path="/desktop" element={<Desktop />} />
      </Routes>
    )
  }

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div style={{
          position: 'absolute', bottom: '-30%', left: '-18%',
          width: '75%', height: '140%',
          background: 'linear-gradient(140deg, #1240c0 0%, #1e58e0 60%, #2868f0 100%)',
          borderRadius: '0 120% 90% 0 / 0 100% 70% 0',
          transform: 'rotate(-10deg)', opacity: 0.5,
        }} />
        <div style={{
          position: 'absolute', bottom: '-25%', right: '-18%',
          width: '65%', height: '120%',
          background: 'linear-gradient(130deg, #091a78 0%, #122090 60%, #0c1878 100%)',
          borderRadius: '85% 0 0 85% / 65% 0 0 65%',
          transform: 'rotate(6deg)', opacity: 0.4,
        }} />
      </div>
      <div className="relative z-10">
        <Navbar />
        <Routes>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/matches/:id" element={<MatchDetail />} />
          <Route path="/players/:id" element={<PlayerProfile />} />
          <Route path="/live" element={<LiveMatch />} />
          <Route path="/admin/upload" element={<AdminUpload />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<XPLoginScreen />} />
          <Route path="/desktop" element={<Desktop />} />
          <Route path="*" element={<Layout />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
