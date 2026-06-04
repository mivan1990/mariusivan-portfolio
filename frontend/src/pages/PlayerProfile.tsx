import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { api, type PlayerProfile } from '../api/client'
import Avatar from '../components/Avatar'
import StatBadge from '../components/StatBadge'

export default function PlayerProfile() {
  const { id } = useParams<{ id: string }>()
  const { data: player, isLoading, error } = useQuery<PlayerProfile>({
    queryKey: ['player', id],
    queryFn: () => api.get(`/api/players/${id}`).then((r) => r.data),
  })

  if (isLoading) return <div className="text-center text-gray-500 py-20">Se incarca...</div>
  if (error || !player) return <div className="text-center text-red-400 py-20">Jucatorul nu a fost gasit.</div>

  const c = player.career

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link to="/" className="text-gray-500 hover:text-white text-sm mb-6 block">
        ← Inapoi la leaderboard
      </Link>

      {/* Player header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-5">
          <Avatar
            url={player.avatar_url}
            name={player.real_name || player.steam_nickname}
            size="lg"
          />
          <div>
            <h1 className="text-2xl font-bold text-white">
              {player.real_name || player.steam_nickname}
            </h1>
            {player.real_name && (
              <div className="text-gray-500 text-sm">{player.steam_nickname}</div>
            )}
            {player.team_name && (
              <div className="inline-block mt-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs px-3 py-1 rounded-full">
                {player.team_name}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatBadge label="K/D Ratio" value={c.kd_ratio.toFixed(2)} highlight />
        <StatBadge label="ADR" value={c.adr.toFixed(1)} />
        <StatBadge label="HS%" value={`${c.hs_percent}%`} />
        <StatBadge label="Win Rate" value={`${c.win_rate}%`} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatBadge label="Meciuri" value={c.matches_played} />
        <StatBadge label="Victorii" value={c.wins} />
        <StatBadge label="Kills" value={c.kills} />
        <StatBadge label="MVPs" value={c.mvps} />
      </div>

      {/* Advanced stats */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4">
          Stats Avansate
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-3 text-sm">
          {[
            { label: 'Kills Totale', value: c.kills },
            { label: 'Deaths Totale', value: c.deaths },
            { label: 'Assists', value: c.assists },
            { label: 'Headshot Kills', value: c.headshot_kills },
            { label: 'Damage Total', value: c.kills * 0 || c.kills_2k !== undefined ? 'N/A' : '—' },
            { label: 'Utility Damage', value: c.utility_damage },
            { label: 'Entry Wins', value: c.entry_wins },
            { label: 'Clutch 1v1', value: c.clutch_1v1_wins },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between border-b border-gray-800 pb-2">
              <span className="text-gray-500">{label}</span>
              <span className="text-white font-medium">{value}</span>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Multi-Kill Rounds</h3>
          <div className="flex gap-4">
            {[
              { label: '2K', value: c.kills_2k, color: 'text-blue-400' },
              { label: '3K', value: c.kills_3k, color: 'text-purple-400' },
              { label: '4K', value: c.kills_4k, color: 'text-orange-400' },
              { label: '5K', value: c.kills_5k, color: 'text-red-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <div className={`text-xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-gray-600">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Match history */}
      {player.match_history.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">
            Istoric Meciuri
          </h2>
          <div className="space-y-2">
            {player.match_history.map((match) => {
              const date = match.timestamp
                ? new Date(match.timestamp).toLocaleDateString('ro-RO', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })
                : '—'
              return (
                <Link
                  key={match.match_id}
                  to={`/matches/${match.match_id}`}
                  className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 hover:border-yellow-500/50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        match.won
                          ? 'bg-green-900/50 text-green-400 border border-green-800'
                          : 'bg-red-900/50 text-red-400 border border-red-800'
                      }`}
                    >
                      {match.won ? 'W' : 'L'}
                    </span>
                    <span className="text-xs font-mono text-gray-500">{match.map_name}</span>
                    <span className="text-xs text-gray-600">{date}</span>
                    <span className="text-xs text-gray-500">
                      {match.team1_score} — {match.team2_score}
                    </span>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-gray-300">
                      <span className="text-white font-medium">{match.kills}</span>
                      <span className="text-gray-600">/</span>
                      <span className="text-red-400">{match.deaths}</span>
                      <span className="text-gray-600">/</span>
                      <span className="text-gray-400">{match.assists}</span>
                    </span>
                    <span className="text-gray-500 hidden sm:block">
                      KD: <span className={match.kd_ratio >= 1 ? 'text-green-400' : 'text-red-400'}>{match.kd_ratio.toFixed(2)}</span>
                    </span>
                    <span className="text-gray-500 hidden sm:block">
                      ADR: <span className="text-gray-300">{match.adr.toFixed(1)}</span>
                    </span>
                    <span className="text-gray-500 hidden sm:block">
                      HS: <span className="text-gray-300">{match.hs_percent}%</span>
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
