interface LoginScreenProps {
  onContinue: () => void
}

export default function LoginScreen({ onContinue }: LoginScreenProps) {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-between select-none cursor-pointer"
      style={{ background: 'linear-gradient(180deg, #1a3c6e 0%, #0d2247 40%, #051530 100%)' }}
      onClick={onContinue}
    >
      {/* Top bar */}
      <div className="w-full flex items-center justify-center py-3"
        style={{ background: 'linear-gradient(180deg, #2457c8 0%, #1a3c8a 100%)', borderBottom: '2px solid #0a246a' }}>
        <span className="text-white font-bold text-sm tracking-widest uppercase"
          style={{ fontFamily: 'Trebuchet MS, sans-serif', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
          Windows XP Professional
        </span>
      </div>

      {/* Center */}
      <div className="flex flex-col items-center gap-8">
        <div className="flex items-center gap-3">
          <img src="/windows_xp_logo.png" alt="Windows XP" style={{ width: 64, height: 64, objectFit: 'contain' }} />
          <div>
            <div className="text-white font-black tracking-tight"
              style={{ fontSize: 42, fontFamily: 'Trebuchet MS, sans-serif', textShadow: '2px 2px 8px rgba(0,0,0,0.6)' }}>
              Windows <span style={{ color: '#f5c040' }}>XP</span>
            </div>
            <div className="text-blue-300 text-sm tracking-widest" style={{ fontFamily: 'Trebuchet MS' }}>
              Professional
            </div>
          </div>
        </div>

        <div className="w-96 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }} />

        <div className="flex flex-col items-center gap-4">
          <img src="/avatar.png" alt="Marius Ivan"
            className="w-24 h-24 rounded-full object-cover object-top"
            style={{ border: '3px solid rgba(255,255,255,0.4)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }} />
          <div className="text-white text-xl font-bold" style={{ fontFamily: 'Trebuchet MS', textShadow: '1px 1px 4px rgba(0,0,0,0.8)' }}>
            DEMO
          </div>
          <div className="text-blue-200 text-sm" style={{ fontFamily: 'Trebuchet MS' }}>
            Marius Ivan
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="text-blue-200 text-sm italic" style={{ fontFamily: 'Trebuchet MS', color: 'rgba(180,210,255,0.75)' }}>
            Former Developer · Future Prompt Engineer
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="text-white text-base font-semibold animate-pulse"
            style={{ fontFamily: 'Trebuchet MS', textShadow: '1px 1px 4px rgba(0,0,0,0.8)', letterSpacing: 2 }}>
            Click to begin
          </div>
          <div className="text-blue-300 text-xs" style={{ letterSpacing: 1 }}>▼</div>
        </div>

        <div className="flex flex-col items-center gap-2 px-8 py-4 rounded-lg text-center max-w-md"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.stopPropagation()}>
          <div className="text-yellow-300 font-bold text-sm">⚠ Portofoliu — Date Demo</div>
          <div className="text-blue-200 text-xs leading-relaxed">
            Acesta este un portofoliu interactiv. Aplicațiile afișate conțin <strong>date fictive</strong> pentru demonstrație.
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="w-full flex items-center justify-between px-6 py-2"
        style={{ background: 'linear-gradient(180deg, #1a3c8a 0%, #0d2247 100%)', borderTop: '2px solid #0a246a' }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 16 }}>🔒</span>
          <span className="text-blue-300 text-xs" style={{ fontFamily: 'Trebuchet MS' }}>mariusivan.ro</span>
        </div>
        <div className="text-blue-400 text-xs" style={{ fontFamily: 'Trebuchet MS' }}>© 2026 Marius Ivan</div>
      </div>
    </div>
  )
}
