import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { api, type MatchDetail, type MatchPlayer } from '../api/client'
import Avatar from '../components/Avatar'

function PlayerRow({ player }: { player: MatchPlayer }) {
  return (
    <tr className="border-t border-gray-800 hover:bg-gray-800/30 transition-colors">
      <td className="px-4 py-3">
        <Link to={`/players/${player.id}`} className="flex items-center gap-3 hover:text-yellow-400">
          <Avatar url={player.avatar_url} name={player.name} size="sm" />
          <div>
            <div className="font-medium text-white text-sm">{player.name}</div>
            <div className="text-xs text-gray-500">{player.steam_nickname}</div>
          </div>
        </Link>
      </td>
      <td className="px-4 py-3 text-center font-bold">
        <span className={player.kd_ratio >= 1 ? 'text-green-400' : 'text-red-400'}>
          {player.kills}
        </span>
        <span className="text-gray-600 mx-1">/</span>
        <span className="text-red-400">{player.deaths}</span>
        <span className="text-gray-600 mx-1">/</span>
        <span className="text-gray-400">{player.assists}</span>
      </td>
      <td className="px-4 py-3 text-center font-bold">
        <span className={player.kd_ratio >= 2 ? 'text-green-400' : player.kd_ratio >= 1 ? 'text-yellow-400' : 'text-red-400'}>
          {player.kd_ratio.toFixed(2)}
        </span>
      </td>
      <td className="px-4 py-3 text-center text-gray-300">{player.hs_percent}%</td>
      <td className="px-4 py-3 text-center text-gray-300">{player.adr}</td>
      <td className="px-4 py-3 text-center text-gray-300">{player.damage}</td>
      <td className="px-4 py-3 text-center text-yellow-500">{player.mvps}</td>
      <td className="px-4 py-3 text-center text-gray-400">{player.utility_damage}</td>
      <td className="px-4 py-3 text-center text-gray-400">{player.first_kills}</td>
      <td className="px-4 py-3 text-center text-gray-400">{player.clutch_1v1_wins}</td>
    </tr>
  )
}

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: match, isLoading, error } = useQuery<MatchDetail>({
    queryKey: ['match', id],
    queryFn: () => api.get(`/api/matches/${id}`).then((r) => r.data),
  })

  if (isLoading) return <div className="text-center text-gray-500 py-20">Se incarca...</div>
  if (error || !match) return <div className="text-center text-red-400 py-20">Meciul nu a fost gasit.</div>

  const team1 = match.players.filter((p) => p.team === 1)
  const team2 = match.players.filter((p) => p.team === 2)
  const date = match.timestamp
    ? new Date(match.timestamp).toLocaleDateString('ro-RO', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : 'Data necunoscuta'

  const t1Won = match.team1_score > match.team2_score
  const t2Won = match.team2_score > match.team1_score
  const t1Label = match.team1_name ?? 'Team 1'
  const t2Label = match.team2_name ?? 'Team 2'

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link to="/matches" className="text-gray-500 hover:text-white text-sm mb-6 block">
        ← Inapoi la meciuri
      </Link>

      {/* Score header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6 text-center">
        <div className="text-xs text-gray-500 mb-1 font-mono uppercase">{match.map_name}</div>
        <div className="text-xs text-gray-600 mb-4">{date}</div>

        <div className="flex items-center justify-center gap-8">
          <div className="text-right">
            <div className="text-sm font-bold text-gray-300 mb-1">{t1Label}</div>
            <div className={`text-5xl font-black ${t1Won ? 'text-green-400' : 'text-gray-500'}`}>
              {match.team1_score}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {match.first_half_team1} — {match.second_half_team1}
            </div>
            {t1Won && <div className="text-xs text-green-500 font-bold mt-1">VICTORIE</div>}
          </div>

          <div className="text-gray-600 text-2xl">:</div>

          <div className="text-left">
            <div className="text-sm font-bold text-gray-300 mb-1">{t2Label}</div>
            <div className={`text-5xl font-black ${t2Won ? 'text-green-400' : 'text-gray-500'}`}>
              {match.team2_score}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {match.first_half_team2} — {match.second_half_team2}
            </div>
            {t2Won && <div className="text-xs text-green-500 font-bold mt-1">VICTORIE</div>}
          </div>
        </div>

        <div className="text-xs text-gray-600 mt-3">{match.rounds_played} runde jucate</div>
      </div>

      {/* Stats tables */}
      {[
        { players: team1, label: t1Label, won: t1Won },
        { players: team2, label: t2Label, won: t2Won },
      ].map(({ players, label, won }) => (
        <div key={label} className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide">
              {label}
            </h2>
            {won && (
              <span className="text-xs bg-green-900/50 text-green-400 border border-green-800 px-2 py-0.5 rounded">
                Victorie
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
                  <th className="text-center px-4 py-2">MVPs</th>
                  <th className="text-center px-4 py-2">UD</th>
                  <th className="text-center px-4 py-2">FK</th>
                  <th className="text-center px-4 py-2">CL</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => <PlayerRow key={p.id} player={p} />)}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="text-xs text-gray-700 text-center mt-4">
        UD = Utility Damage | FK = First Kills | CL = Clutch 1v1 Wins
      </div>
    </div>
  )
}
