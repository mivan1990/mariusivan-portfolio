import { useState, useRef, useCallback, useEffect } from 'react'

interface WindowProps {
  title: string
  icon?: string
  children: React.ReactNode
  onClose: () => void
  onFocus: () => void
  zIndex: number
  initialWidth?: number
  initialHeight?: number
  initialX?: number
  initialY?: number
}

export default function Window({
  title,
  icon,
  children,
  onClose,
  onFocus,
  zIndex,
  initialWidth = 800,
  initialHeight = 540,
  initialX,
  initialY,
}: WindowProps) {
  const [pos, setPos] = useState({
    x: initialX ?? Math.max(40, (window.innerWidth - initialWidth) / 2),
    y: initialY ?? Math.max(40, (window.innerHeight - initialHeight) / 3),
  })
  const [size, setSize] = useState({ w: initialWidth, h: initialHeight })
  const [maximized, setMaximized] = useState(false)
  const [preMaxPos, setPreMaxPos] = useState(pos)
  const [preMaxSize, setPreMaxSize] = useState(size)
  const [isMinimized, setIsMinimized] = useState(false)

  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null)

  const onDragStart = useCallback((e: React.MouseEvent) => {
    if (maximized) return
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }
    onFocus()
  }, [maximized, pos, onFocus])

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: size.w, origH: size.h }
    onFocus()
  }, [size, onFocus])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragRef.current) {
        const dx = e.clientX - dragRef.current.startX
        const dy = e.clientY - dragRef.current.startY
        setPos({
          x: Math.max(0, dragRef.current.origX + dx),
          y: Math.max(0, dragRef.current.origY + dy),
        })
      }
      if (resizeRef.current) {
        const dx = e.clientX - resizeRef.current.startX
        const dy = e.clientY - resizeRef.current.startY
        setSize({
          w: Math.max(400, resizeRef.current.origW + dx),
          h: Math.max(300, resizeRef.current.origH + dy),
        })
      }
    }
    const onUp = () => {
      dragRef.current = null
      resizeRef.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const toggleMaximize = () => {
    if (maximized) {
      setPos(preMaxPos)
      setSize(preMaxSize)
      setMaximized(false)
    } else {
      setPreMaxPos(pos)
      setPreMaxSize(size)
      setMaximized(true)
    }
  }

  const windowStyle = maximized
    ? { left: 0, top: 0, width: '100vw', height: 'calc(100vh - 40px)', zIndex }
    : { left: pos.x, top: pos.y, width: size.w, height: isMinimized ? 32 : size.h, zIndex }

  return (
    <div
      className="absolute flex flex-col shadow-2xl rounded-t overflow-hidden select-none"
      style={windowStyle}
      onMouseDown={onFocus}
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-1 px-2 py-0 h-8 flex-shrink-0 cursor-default"
        style={{
          background: 'linear-gradient(180deg, #1e7bde 0%, #1464c8 50%, #0e55b8 100%)',
          borderTop: '1px solid #5ba8f5',
          borderLeft: '1px solid #5ba8f5',
          borderRight: '1px solid #0a3d82',
        }}
        onMouseDown={onDragStart}
        onDoubleClick={toggleMaximize}
      >
        {icon && <span className="text-sm mr-1">{icon}</span>}
        <span className="text-white text-xs font-bold flex-1 truncate drop-shadow">{title}</span>

        <div className="flex items-center gap-0.5 ml-2 flex-shrink-0">
          <button
            className="w-6 h-5 bg-[#3a8dee] hover:bg-[#5ba8f5] border border-[#1255a8] rounded-sm text-white text-xs font-bold flex items-center justify-center"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setIsMinimized(!isMinimized)}
          >_</button>
          <button
            className="w-6 h-5 bg-[#3a8dee] hover:bg-[#5ba8f5] border border-[#1255a8] rounded-sm text-white text-xs font-bold flex items-center justify-center"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={toggleMaximize}
          >□</button>
          <button
            className="w-6 h-5 bg-[#c8312a] hover:bg-[#e04040] border border-[#8b1a15] rounded-sm text-white text-xs font-bold flex items-center justify-center"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onClose}
          >✕</button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div
          className="flex-1 overflow-auto"
          style={{
            background: '#fff',
            borderLeft: '2px solid #0e55b8',
            borderRight: '2px solid #0e55b8',
            borderBottom: '2px solid #0e55b8',
          }}
        >
          {children}
        </div>
      )}

      {/* Resize handle */}
      {!maximized && !isMinimized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={onResizeStart}
          style={{ zIndex: 10 }}
        >
          <svg width="16" height="16" style={{ opacity: 0.4 }}>
            <path d="M 0 16 L 16 0 M 4 16 L 16 4 M 8 16 L 16 8" stroke="#000" strokeWidth="1" />
          </svg>
        </div>
      )}
    </div>
  )
}
