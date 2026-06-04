import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

interface LivePlayer {
  steam_account_id: string
  steam_nickname: string
  team: number
  kills: number
  deaths: number
  assists: number
  headshot_kills: number
  damage: number
  rounds_played: number
}

interface LiveState {
  is_live: boolean
  map_name?: string
  rounds_played?: number
  team1_score?: number
  team2_score?: number
  players?: LivePlayer[]
  seconds_ago?: number
  reason?: string
}

function PlayerRow({ player }: { player: LivePlayer }) {
  const kd = (player.kills / Math.max(player.deaths, 1)).toFixed(2)
  const adr = (player.damage / Math.max(player.rounds_played, 1)).toFixed(1)
  const hs = player.kills > 0
    ? Math.round((player.headshot_kills / player.kills) * 100)
    : 0

  return (
    <tr className="border-t border-gray-800">
      <td className="px-4 py-3 font-medium text-white">{player.steam_nickname}</td>
      <td className="px-4 py-3 text-center">
        <span className="text-white font-bold">{player.kills}</span>
        <span className="text-gray-600">/</span>
        <span className="text-red-400">{player.deaths}</span>
        <span className="text-gray-600">/</span>
        <span className="text-gray-400">{player.assists}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={parseFloat(kd) >= 1 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
          {kd}
        </span>
      </td>
      <td className="px-4 py-3 text-center text-gray-300">{hs}%</td>
      <td className="px-4 py-3 text-center text-gray-300">{adr}</td>
      <td className="px-4 py-3 text-center text-gray-400">{player.damage}</td>
    </tr>
  )
}

export default function LiveMatch() {
  const { data, isLoading } = useQuery<LiveState>({
    queryKey: ['live'],
    queryFn: () => api.get('/api/live').then((r) => r.data),
    refetchInterval: 10_000,
  })

  if (isLoading) {
    return <div className="text-center text-gray-500 py-20">Se incarca...</div>
  }

  if (!data?.is_live) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🎮</div>
        <h1 className="text-xl font-bold text-white mb-2">Niciun meci live</h1>
        <p className="text-gray-500 text-sm">
          {data?.reason || 'Pagina se actualizeaza automat la fiecare 10 secunde.'}
        </p>
      </div>
    )
  }

  const team1 = data.players?.filter((p) => p.team === 1) || []
  const team2 = data.players?.filter((p) => p.team === 2) || []
  const t1Won = (data.team1_score || 0) > (data.team2_score || 0)
  const t2Won = (data.team2_score || 0) > (data.team1_score || 0)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Live badge */}
      <div className="flex items-center gap-3 mb-6">
        <span className="flex items-center gap-2 bg-red-900/40 border border-red-700 text-red-400 text-sm font-bold px-3 py-1 rounded-full">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          LIVE
        </span>
        {data.seconds_ago !== undefined && (
          <span className="text-xs text-gray-600">
            actualizat acum {data.seconds_ago}s
          </span>
        )}
      </div>

      {/* Scor */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center mb-6">
        <div className="text-xs text-gray-500 font-mono uppercase mb-4">{data.map_name}</div>
        <div className="flex items-center justify-center gap-10">
          <div>
            <div className={`text-6xl font-black ${t1Won ? 'text-green-400' : 'text-gray-400'}`}>
              {data.team1_score}
            </div>
            <div className="text-xs text-gray-600 mt-1">Team 1</div>
          </div>
          <div className="text-gray-700 text-2xl">—</div>
          <div>
            <div className={`text-6xl font-black ${t2Won ? 'text-green-400' : 'text-gray-400'}`}>
              {data.team2_score}
            </div>
            <div className="text-xs text-gray-600 mt-1">Team 2</div>
          </div>
        </div>
        <div className="text-xs text-gray-600 mt-3">Runda {data.rounds_played}</div>
      </div>

      {/* Stats tabele */}
      {[
        { players: team1, label: 'Team 1', won: t1Won },
        { players: team2, label: 'Team 2', won: t2Won },
      ].map(({ players, label, won }) => (
        <div key={label} className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-bold text-gray-400 uppercase">{label}</h2>
            {won && (
              <span className="text-xs bg-green-900/30 text-green-400 border border-green-800 px-2 py-0.5 rounded">
                In avantaj
              </span>
            )}
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-gray-500 text-xs uppercase">
                  <th className="text-left px-4 py-2">Jucator</th>
                  <th className="text-center px-4 py-2">K/D/A</th>
                  <th className="text-center px-4 py-2">KD</th>
                  <th className="text-center px-4 py-2">HS%</th>
                  <th className="text-center px-4 py-2">ADR</th>
                  <th className="text-center px-4 py-2">DMG</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <PlayerRow key={p.steam_account_id} player={p} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <p className="text-xs text-gray-700 text-center mt-6">
        Datele se actualizeaza automat la fiecare 10 secunde
      </p>
    </div>
  )
}
