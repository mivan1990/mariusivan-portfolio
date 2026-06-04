import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, type LeaderboardPlayer, type TeamLeaderboard, type BetLeaderboard } from '../api/client'
import Avatar from '../components/Avatar'

type MainTab = 'players' | 'teams' | 'bets'
type SortKey = 'kd_ratio' | 'kills' | 'adr' | 'hs_percent' | 'wins' | 'mvps' | 'win_rate'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'kd_ratio', label: 'K/D' },
  { key: 'adr', label: 'ADR' },
  { key: 'kills', label: 'Kills' },
  { key: 'hs_percent', label: 'HS%' },
  { key: 'wins', label: 'Victorii' },
  { key: 'mvps', label: 'MVPs' },
]

function RankBadge({ idx }: { idx: number }) {
  if (idx === 0) return <span className="text-yellow-400 text-base">🥇</span>
  if (idx === 1) return <span className="text-gray-300 text-base">🥈</span>
  if (idx === 2) return <span className="text-amber-600 text-base">🥉</span>
  return <span className="text-gray-500 font-mono text-sm">{idx + 1}</span>
}

// --- Tab: Jucatori ---

function PlayersTab() {
  const [sortBy, setSortBy] = useState<SortKey>('kd_ratio')

  const { data: players, isLoading, error } = useQuery<LeaderboardPlayer[]>({
    queryKey: ['leaderboard', sortBy],
    queryFn: () => api.get(`/api/leaderboard?sort_by=${sortBy}`).then((r) => r.data),
  })

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-5">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              sortBy === opt.key ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading && <div className="text-center text-gray-500 py-20">Se incarca...</div>}
      {error && <div className="text-center text-red-400 py-20">Eroare la incarcare.</div>}
      {players?.length === 0 && (
        <div className="text-center text-gray-500 py-20">
          <p className="text-lg">Niciun jucator inca.</p>
          <p className="text-sm mt-2">Incarca primul meci din panoul de admin.</p>
        </div>
      )}

      {players && players.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">#</th>
                <th className="text-left px-4 py-3">Jucator</th>
                <th className="text-center px-4 py-3">M</th>
                <th className="text-center px-4 py-3">Win%</th>
                <th className="text-center px-4 py-3">K</th>
                <th className="text-center px-4 py-3">D</th>
                <th className="text-center px-4 py-3">K/D</th>
                <th className="text-center px-4 py-3">HS%</th>
                <th className="text-center px-4 py-3">ADR</th>
                <th className="text-center px-4 py-3">MVPs</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, idx) => (
                <tr key={player.id} className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3"><RankBadge idx={idx} /></td>
                  <td className="px-4 py-3">
                    <Link to={`/players/${player.id}`} className="flex items-center gap-3 hover:text-yellow-400 transition-colors">
                      <Avatar url={player.avatar_url} name={player.real_name || player.steam_nickname} size="sm" />
                      <div>
                        <div className="font-medium text-white">{player.real_name || player.steam_nickname}</div>
                        {player.real_name && <div className="text-xs text-gray-500">{player.steam_nickname}</div>}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">{player.matches_played}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={player.win_rate >= 60 ? 'text-green-400 font-medium' : player.win_rate >= 40 ? 'text-yellow-400 font-medium' : 'text-red-400 font-medium'}>
                      {player.win_rate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">{player.kills}</td>
                  <td className="px-4 py-3 text-center text-gray-300">{player.deaths}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={player.kd_ratio >= 1 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                      {player.kd_ratio.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={player.hs_percent >= 50 ? 'text-orange-400 font-medium' : 'text-gray-300'}>
                      {player.hs_percent}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">{player.adr}</td>
                  <td className="px-4 py-3 text-center text-yellow-500">{player.mvps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// --- Tab: Echipe ---

function TeamsTab() {
  const { data: teams, isLoading } = useQuery<TeamLeaderboard[]>({
    queryKey: ['leaderboard-teams'],
    queryFn: () => api.get('/api/leaderboard/teams').then((r) => r.data),
  })

  if (isLoading) return <div className="text-center text-gray-500 py-20">Se incarca...</div>
  if (!teams?.length) return (
    <div className="text-center text-gray-500 py-20">
      <p>Nicio echipa inca.</p>
      <p className="text-xs mt-2">Atribuie echipe jucatorilor din panoul de admin.</p>
    </div>
  )

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-900 text-gray-500 text-xs uppercase tracking-wide">
            <th className="text-left px-4 py-3">#</th>
            <th className="text-left px-4 py-3">Echipa</th>
            <th className="text-center px-4 py-3">MJ</th>
            <th className="text-center px-4 py-3">V</th>
            <th className="text-center px-4 py-3">E</th>
            <th className="text-center px-4 py-3">I</th>
            <th className="text-center px-4 py-3">RF</th>
            <th className="text-center px-4 py-3">RA</th>
            <th className="text-center px-4 py-3">RD</th>
            <th className="text-center px-4 py-3 text-yellow-500">Pct</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, idx) => (
            <tr
              key={team.team_name}
              className={`border-t border-gray-800 transition-colors ${
                idx === 0 ? 'bg-yellow-500/5 hover:bg-yellow-500/10' : 'hover:bg-gray-800/50'
              }`}
            >
              <td className="px-4 py-4"><RankBadge idx={idx} /></td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  {idx === 0 && <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-700 px-2 py-0.5 rounded">Lider</span>}
                  <span className="font-bold text-white text-base">{team.team_name}</span>
                </div>
              </td>
              <td className="px-4 py-4 text-center text-gray-400">{team.matches_played}</td>
              <td className="px-4 py-4 text-center text-green-400 font-medium">{team.wins}</td>
              <td className="px-4 py-4 text-center text-yellow-400 font-medium">{team.draws}</td>
              <td className="px-4 py-4 text-center text-red-400 font-medium">{team.losses}</td>
              <td className="px-4 py-4 text-center text-gray-300">{team.rounds_for}</td>
              <td className="px-4 py-4 text-center text-gray-300">{team.rounds_against}</td>
              <td className="px-4 py-4 text-center">
                <span className={team.round_diff > 0 ? 'text-green-400' : team.round_diff < 0 ? 'text-red-400' : 'text-gray-500'}>
                  {team.round_diff > 0 ? '+' : ''}{team.round_diff}
                </span>
              </td>
              <td className="px-4 py-4 text-center">
                <span className="text-yellow-400 font-black text-lg">{team.points}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-2 bg-gray-900/50 border-t border-gray-800 text-xs text-gray-600">
        MJ = Meciuri Jucate &nbsp;·&nbsp; V/E/I = Victorii/Egal/Infrangeri &nbsp;·&nbsp; RF/RA = Runde Marcate/Primite &nbsp;·&nbsp; RD = Diferenta Runde &nbsp;·&nbsp; Pct = Puncte (V=3, E=1, I=0)
      </div>
    </div>
  )
}

// --- Tab: Clasament Pariuri ---

function BetsTab() {
  const { data: users, isLoading } = useQuery<BetLeaderboard[]>({
    queryKey: ['leaderboard-bets'],
    queryFn: () => api.get('/api/leaderboard/bets').then((r) => r.data),
  })

  if (isLoading) return <div className="text-center text-gray-500 py-20">Se incarca...</div>
  if (!users?.length) return (
    <div className="text-center text-gray-500 py-20">
      <p>Niciun pariu inca.</p>
      <p className="text-xs mt-2">Pariurile apar dupa ce userii se inregistreaza si pariaza pe meciuri.</p>
    </div>
  )

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-900 text-gray-500 text-xs uppercase tracking-wide">
            <th className="text-left px-4 py-3">#</th>
            <th className="text-left px-4 py-3">Jucator</th>
            <th className="text-center px-4 py-3 text-yellow-500">Puncte</th>
            <th className="text-center px-4 py-3">Total</th>
            <th className="text-center px-4 py-3">Castigate</th>
            <th className="text-center px-4 py-3">Egal</th>
            <th className="text-center px-4 py-3">Pierdute</th>
            <th className="text-center px-4 py-3">In asteptare</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, idx) => (
            <tr
              key={user.id}
              className={`border-t border-gray-800 transition-colors ${
                idx === 0 ? 'bg-yellow-500/5 hover:bg-yellow-500/10' : 'hover:bg-gray-800/50'
              }`}
            >
              <td className="px-4 py-4"><RankBadge idx={idx} /></td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  {idx === 0 && <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-700 px-2 py-0.5 rounded">Lider</span>}
                  <span className="font-medium text-white">{user.display_name}</span>
                </div>
              </td>
              <td className="px-4 py-4 text-center">
                <span className="text-yellow-400 font-black text-lg">{user.points}</span>
              </td>
              <td className="px-4 py-4 text-center text-gray-400">{user.bets_total}</td>
              <td className="px-4 py-4 text-center text-green-400 font-medium">{user.bets_won}</td>
              <td className="px-4 py-4 text-center text-yellow-400 font-medium">{user.bets_draw}</td>
              <td className="px-4 py-4 text-center text-red-400 font-medium">{user.bets_lost}</td>
              <td className="px-4 py-4 text-center text-gray-500">{user.bets_pending}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-2 bg-gray-900/50 border-t border-gray-800 text-xs text-gray-600">
        Puncte: Pariu castigat = +3 &nbsp;·&nbsp; Egal = +1 &nbsp;·&nbsp; Pierdut = +0
      </div>
    </div>
  )
}

// --- Main page ---

export default function Leaderboard() {
  const [tab, setTab] = useState<MainTab>('players')

  const tabBtn = (t: MainTab, label: string) => (
    <button
      key={t}
      onClick={() => setTab(t)}
      className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
        tab === t ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
          <p className="text-gray-500 text-sm mt-1">Competitie 2v2 Counter-Strike 2</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {tabBtn('players', 'Jucatori')}
        {tabBtn('teams', 'Echipe')}
        {tabBtn('bets', 'Clasament Pariuri')}
      </div>

      {tab === 'players' && <PlayersTab />}
      {tab === 'teams' && <TeamsTab />}
      {tab === 'bets' && <BetsTab />}
    </div>
  )
}
