import Avatar from './Avatar'
import { dummyMatches } from '../../data/dummyData'

function MapBadge({ map }: { map: string }) {
  return (
    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded font-mono">
      {map}
    </span>
  )
}

function ScoreDisplay({ t1, t2 }: { t1: number; t2: number }) {
  const winner = t1 > t2 ? 1 : t2 > t1 ? 2 : 0
  return (
    <div className="flex items-center gap-2 text-xl font-bold">
      <span className={winner === 1 ? 'text-green-400' : winner === 2 ? 'text-red-400' : 'text-gray-400'}>{t1}</span>
      <span className="text-gray-600 text-sm">—</span>
      <span className={winner === 2 ? 'text-green-400' : winner === 1 ? 'text-red-400' : 'text-gray-400'}>{t2}</span>
    </div>
  )
}

export default function CS2Matches() {
  return (
    <div className="px-4 py-6 bg-gray-950 min-h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-white">Rezultate Meciuri</h2>
        <span className="text-xs text-gray-600 bg-gray-800 px-2 py-1 rounded">Demo Data</span>
      </div>

      <div className="space-y-4">
        {dummyMatches.map((match) => {
          const team1Players = match.players.filter((p) => p.team === 1)
          const team2Players = match.players.filter((p) => p.team === 2)
          const t1Label = match.team1_name ?? 'Team 1'
          const t2Label = match.team2_name ?? 'Team 2'
          const date = match.timestamp
            ? new Date(match.timestamp).toLocaleDateString('ro-RO', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })
            : 'Data necunoscuta'

          return (
            <div
              key={match.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-yellow-500/50 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <MapBadge map={match.map_name} />
                  <span className="text-xs text-gray-500">{date}</span>
                </div>
                <span className="text-xs text-gray-600">{match.rounds_played} runde</span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1 flex-1">
                  <span className="text-xs font-bold text-yellow-500/80">{t1Label}</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {team1Players.map((p) => (
                      <div key={p.id} className="flex items-center gap-1">
                        <Avatar url={p.avatar_url} name={p.name} size="sm" />
                        <span className="text-xs text-gray-300">{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <ScoreDisplay t1={match.team1_score} t2={match.team2_score} />
                <div className="flex flex-col gap-1 flex-1 items-end">
                  <span className="text-xs font-bold text-yellow-500/80">{t2Label}</span>
                  <div className="flex items-center gap-2 flex-wrap flex-row-reverse">
                    {team2Players.map((p) => (
                      <div key={p.id} className="flex items-center gap-1 flex-row-reverse">
                        <Avatar url={p.avatar_url} name={p.name} size="sm" />
                        <span className="text-xs text-gray-300">{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
