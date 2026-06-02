interface DesktopIconProps {
  icon: string
  label: string
  onDoubleClick: () => void
  selected: boolean
  onSelect: () => void
}

export default function DesktopIcon({ icon, label, onDoubleClick, selected, onSelect }: DesktopIconProps) {
  return (
    <div
      className="flex flex-col items-center gap-1 cursor-pointer w-20 p-2 rounded select-none"
      style={{
        background: selected ? 'rgba(49, 106, 197, 0.4)' : 'transparent',
        outline: selected ? '1px dotted rgba(255,255,255,0.6)' : 'none',
      }}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
    >
      <span className="text-4xl drop-shadow-md">{icon}</span>
      <span
        className="text-white text-xs text-center leading-tight break-words w-full"
        style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.8)' }}
      >
        {label}
      </span>
    </div>
  )
}
