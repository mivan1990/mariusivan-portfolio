import { useState } from 'react'
import LoginScreen from './components/xp/LoginScreen'
import Desktop from './pages/Desktop'

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false)

  if (!loggedIn) return <LoginScreen onContinue={() => setLoggedIn(true)} />
  return <Desktop />
}
