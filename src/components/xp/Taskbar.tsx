import { useState, useEffect } from 'react'

interface OpenWindow {
  id: string
  title: string
  icon?: string
}

interface TaskbarProps {
  openWindows: OpenWindow[]
  activeId: string | null
  onWindowClick: (id: string) => void
}

export default function Taskbar({ openWindows, activeId, onWindowClick }: TaskbarProps) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const timeStr = time.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
  const dateStr = time.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div
      className="fixed bottom-0 left-0 right-0 h-10 flex items-center px-1 gap-1 select-none z-[9999]"
      style={{
        background: 'linear-gradient(180deg, #245edb 0%, #1448bc 8%, #1448bc 92%, #0c3494 100%)',
        borderTop: '1px solid #5ba8f5',
      }}
    >
      {/* Start button */}
      <button
        className="h-8 px-3 rounded flex items-center gap-2 font-bold text-white text-sm flex-shrink-0"
        style={{
          background: 'linear-gradient(180deg, #5cb85c 0%, #3d8b3d 50%, #2d6a2d 100%)',
          border: '1px solid #1f4d1f',
          boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
        }}
      >
        <span className="text-base">🪟</span>
        <span>start</span>
      </button>

      <div className="w-px h-7 bg-white/20 mx-1" />

      {/* Open windows */}
      <div className="flex-1 flex items-center gap-1 overflow-hidden">
        {openWindows.map((w) => (
          <button
            key={w.id}
            onClick={() => onWindowClick(w.id)}
            className={`h-8 px-2 rounded flex items-center gap-1.5 text-xs text-white truncate max-w-[160px] flex-shrink-0 transition-all ${
              activeId === w.id
                ? 'bg-white/30 border border-white/40 shadow-inner'
                : 'bg-white/10 hover:bg-white/20 border border-white/20'
            }`}
          >
            {w.icon && <span className="text-sm flex-shrink-0">{w.icon}</span>}
            <span className="truncate">{w.title}</span>
          </button>
        ))}
      </div>

      {/* System tray / clock */}
      <div
        className="flex-shrink-0 flex flex-col items-end justify-center px-3 h-8 text-white"
        style={{
          background: 'rgba(0,0,80,0.3)',
          border: '1px inset rgba(0,0,0,0.3)',
          borderRadius: 2,
          minWidth: 80,
        }}
      >
        <span className="text-xs font-bold leading-none">{timeStr}</span>
        <span className="text-[10px] leading-none opacity-70">{dateStr}</span>
      </div>
    </div>
  )
}
