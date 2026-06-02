import { useState, useCallback } from 'react'
import Window from './Window'
import Taskbar from './Taskbar'
import DesktopIcon from './DesktopIcon'
import CS2Leaderboard from '../cs2/Leaderboard'
import CS2Matches from '../cs2/Matches'

interface OpenWindow {
  id: string
  title: string
  icon: string
  content: React.ReactNode
  width?: number
  height?: number
}

const DESKTOP_ICONS = [
  {
    id: 'cs2-leaderboard',
    icon: '🎮',
    label: 'CS2 Leaderboard',
    window: {
      title: 'CS2 Leaderboard - 2v2 Competition',
      icon: '🎮',
      content: <CS2Leaderboard />,
      width: 860,
      height: 560,
    },
  },
  {
    id: 'cs2-matches',
    icon: '📊',
    label: 'CS2 Meciuri',
    window: {
      title: 'CS2 Meciuri - Rezultate',
      icon: '📊',
      content: <CS2Matches />,
      width: 700,
      height: 520,
    },
  },
  {
    id: 'github',
    icon: '🐙',
    label: 'GitHub',
    link: 'https://github.com/mivan1990',
  },
  {
    id: 'my-computer',
    icon: '🖥️',
    label: 'My Computer',
    window: {
      title: 'My Computer',
      icon: '🖥️',
      content: <MyComputerContent />,
      width: 520,
      height: 360,
    },
  },
]

function MyComputerContent() {
  return (
    <div className="p-6 bg-white min-h-full">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Marius Ivan - Developer</h2>
      <div className="space-y-3 text-sm text-gray-600">
        <p>👋 Salut! Sunt Marius, un developer full-stack.</p>
        <p>💻 Lucrez cu React, TypeScript, Python, și mai mult.</p>
        <p>🎮 Unul din proiectele mele este CS2 Leaderboard - un sistem de scoreboard pentru meciuri 2v2.</p>
        <p>📫 Contact: ivanmarius1990@gmail.com</p>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="border border-gray-200 rounded p-3">
          <div className="text-2xl mb-1">⚛️</div>
          <div className="font-medium text-xs">React / TypeScript</div>
        </div>
        <div className="border border-gray-200 rounded p-3">
          <div className="text-2xl mb-1">🐍</div>
          <div className="font-medium text-xs">Python / FastAPI</div>
        </div>
        <div className="border border-gray-200 rounded p-3">
          <div className="text-2xl mb-1">🗄️</div>
          <div className="font-medium text-xs">PostgreSQL / SQLite</div>
        </div>
        <div className="border border-gray-200 rounded p-3">
          <div className="text-2xl mb-1">🐧</div>
          <div className="font-medium text-xs">Linux / VPS</div>
        </div>
      </div>
    </div>
  )
}

export default function Desktop() {
  const [openWindows, setOpenWindows] = useState<OpenWindow[]>([])
  const [zOrder, setZOrder] = useState<string[]>([])
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null)

  const openWindow = useCallback((iconId: string) => {
    const iconDef = DESKTOP_ICONS.find((i) => i.id === iconId)
    if (!iconDef) return

    if ('link' in iconDef && iconDef.link) {
      window.open(iconDef.link, '_blank')
      return
    }

    if (!('window' in iconDef) || !iconDef.window) return

    if (openWindows.find((w) => w.id === iconId)) {
      bringToFront(iconId)
      return
    }

    const newWindow: OpenWindow = {
      id: iconId,
      title: iconDef.window.title,
      icon: iconDef.icon,
      content: iconDef.window.content,
      width: iconDef.window.width,
      height: iconDef.window.height,
    }

    setOpenWindows((prev) => [...prev, newWindow])
    setZOrder((prev) => [...prev.filter((id) => id !== iconId), iconId])
  }, [openWindows])

  const closeWindow = useCallback((id: string) => {
    setOpenWindows((prev) => prev.filter((w) => w.id !== id))
    setZOrder((prev) => prev.filter((zId) => zId !== id))
  }, [])

  const bringToFront = useCallback((id: string) => {
    setZOrder((prev) => [...prev.filter((zId) => zId !== id), id])
  }, [])

  const activeId = zOrder.length > 0 ? zOrder[zOrder.length - 1] : null

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #1a6b2a 0%, #2d8a3e 40%, #246b30 100%)',
        backgroundImage: `
          radial-gradient(ellipse at 30% 40%, rgba(255,255,255,0.05) 0%, transparent 60%),
          linear-gradient(180deg, #1a6b2a 0%, #2d8a3e 40%, #246b30 100%)
        `,
      }}
      onClick={() => setSelectedIcon(null)}
    >
      {/* Desktop icons - left column */}
      <div
        className="absolute top-4 left-4 flex flex-col gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        {DESKTOP_ICONS.map((icon) => (
          <DesktopIcon
            key={icon.id}
            icon={icon.icon}
            label={icon.label}
            selected={selectedIcon === icon.id}
            onSelect={() => setSelectedIcon(icon.id)}
            onDoubleClick={() => openWindow(icon.id)}
          />
        ))}
      </div>

      {/* Windows */}
      {openWindows.map((w) => {
        const zIdx = zOrder.indexOf(w.id)
        return (
          <Window
            key={w.id}
            title={w.title}
            icon={w.icon}
            onClose={() => closeWindow(w.id)}
            onFocus={() => bringToFront(w.id)}
            zIndex={100 + zIdx}
            initialWidth={w.width}
            initialHeight={w.height}
          >
            {w.content}
          </Window>
        )
      })}

      {/* Taskbar */}
      <Taskbar
        openWindows={openWindows.map((w) => ({ id: w.id, title: w.title, icon: w.icon }))}
        activeId={activeId}
        onWindowClick={bringToFront}
      />
    </div>
  )
}
