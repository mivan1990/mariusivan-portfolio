import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, type MatchSummary, type ScheduledMatch } from '../api/client'
import Avatar from '../components/Avatar'

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
      <span className={winner === 1 ? 'text-green-400' : winner === 2 ? 'text-red-400' : 'text-gray-400'}>
        {t1}
      </span>
      <span className="text-gray-600 text-sm">—</span>
      <span className={winner === 2 ? 'text-green-400' : winner === 1 ? 'text-red-400' : 'text-gray-400'}>
        {t2}
      </span>
    </div>
  )
}

function ScheduledCard({ sm }: { sm: ScheduledMatch }) {
  const date = new Date(sm.scheduled_at)
  const now = new Date()
  const isPast = date < now
  const isToday = date.toDateString() === now.toDateString()

  const dateStr = date.toLocaleDateString('ro-RO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const statusBadge = sm.match_id
    ? <span className="text-xs bg-green-900/30 text-green-400 border border-green-800 px-2 py-0.5 rounded">Finalizat</span>
    : isToday
    ? <span className="text-xs bg-yellow-900/30 text-yellow-400 border border-yellow-800 px-2 py-0.5 rounded">Azi</span>
    : isPast
    ? <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded">Trecut</span>
    : <span className="text-xs bg-blue-900/30 text-blue-400 border border-blue-800 px-2 py-0.5 rounded">Programat</span>

  return (
    <div className={`bg-gray-900 border rounded-xl p-4 ${sm.match_id ? 'border-green-900/40' : isToday ? 'border-yellow-700/40' : 'border-gray-800'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {statusBadge}
          <span className="text-xs text-gray-500">{dateStr}</span>
        </div>
        {sm.result && <MapBadge map={sm.result.map_name} />}
      </div>

      <div className="flex items-center justify-between">
        <span className="font-bold text-white">{sm.team_a}</span>

        {sm.result ? (
          <div className="flex flex-col items-center gap-1">
            <ScoreDisplay t1={sm.result.team1_score} t2={sm.result.team2_score} />
            <span className="text-xs text-gray-600">{sm.result.rounds_played} runde</span>
            {sm.match_id && (
              <Link to={`/matches/${sm.match_id}`} className="text-xs text-yellow-500 hover:text-yellow-400">
                Vezi statistici →
              </Link>
            )}
          </div>
        ) : (
          <span className="text-gray-600 text-lg font-bold">vs</span>
        )}

        <span className="font-bold text-white">{sm.team_b}</span>
      </div>
    </div>
  )
}

export default function Matches() {
  const { data: matches, isLoading, error } = useQuery<MatchSummary[]>({
    queryKey: ['matches'],
    queryFn: () => api.get('/api/matches').then((r) => r.data),
  })

  const { data: scheduled } = useQuery<ScheduledMatch[]>({
    queryKey: ['scheduled'],
    queryFn: () => api.get('/api/scheduled').then((r) => r.data),
  })

  const upcoming = scheduled?.filter((sm) => !sm.match_id && new Date(sm.scheduled_at) >= new Date()) ?? []
  const past = scheduled?.filter((sm) => sm.match_id || new Date(sm.scheduled_at) < new Date()) ?? []

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

      {/* Meciuri programate viitoare */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Meciuri Programate</h2>
          <div className="space-y-3">
            {upcoming.map((sm) => <ScheduledCard key={sm.id} sm={sm} />)}
          </div>
        </section>
      )}

      {/* Rezultate */}
      <section>
        <h2 className="text-lg font-bold text-white mb-4">Rezultate</h2>

        {/* Meciuri programate cu rezultat */}
        {past.length > 0 && (
          <div className="space-y-3 mb-6">
            {past
              .slice()
              .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
              .map((sm) => <ScheduledCard key={sm.id} sm={sm} />)}
          </div>
        )}

        {/* Meciuri fara meci programat asociat */}
        {isLoading && <div className="text-center text-gray-500 py-10">Se incarca...</div>}
        {error && <div className="text-center text-red-400 py-10">Eroare la incarcare.</div>}

        {matches && matches.length === 0 && past.length === 0 && (
          <div className="text-center text-gray-500 py-10">
            <p>Niciun meci inca. Incarca un fisier din admin.</p>
          </div>
        )}

        <div className="space-y-4">
          {matches
            ?.filter((m) => !past.some((sm) => sm.match_id === m.id))
            .map((match) => {
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
                <Link
                  key={match.id}
                  to={`/matches/${match.id}`}
                  className="block bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-yellow-500/50 transition-all"
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
                </Link>
              )
            })}
        </div>
      </section>
    </div>
  )
}
