interface StatBadgeProps {
  label: string
  value: string | number
  highlight?: boolean
  sub?: string
}

export default function StatBadge({ label, value, highlight, sub }: StatBadgeProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 text-center">
      <div className={`text-2xl font-bold ${highlight ? 'text-yellow-400' : 'text-white'}`}>
        {value}
        {sub && <span className="text-sm text-gray-400 ml-1">{sub}</span>}
      </div>
      <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">{label}</div>
    </div>
  )
}
