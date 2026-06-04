import React, { useState, useEffect, useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type LeaderboardPlayer, type TeamLeaderboard, type ScheduledMatch, type Bet, type PlayerBet, type MatchSummary, type WorldCupMatch, type WCOutcome } from '../api/client'

interface LivePlayer {
  steam_account_id: string
  steam_nickname: string
  real_name?: string | null
  team_name?: string | null
  team: number
  kills: number
  deaths: number
  assists: number
  headshot_kills: number
  damage: number
  mvps: number
  rounds_played: number
}

interface LiveState {
  is_live: boolean
  map_name?: string
  rounds_played?: number
  team1_score?: number
  team2_score?: number
  team1_name?: string
  team2_name?: string
  players?: LivePlayer[]
  seconds_ago?: number
  reason?: string
}

interface SessionInfo { active: boolean; started_at: string | null }
interface AdminUserItem { id: number; email: string; display_name: string; is_admin: boolean; points: number; created_at: string }
interface LogEntry { id: number; action: string; detail: string | null; user_id: number | null; ip_address: string | null; created_at: string }
interface BackupEntry { filename: string; size_kb: number; created_at: string }
interface AdminPlayerItem { id: number; steam_account_id: string; steam_nickname: string; real_name: string | null; team_name: string | null; avatar_url: string | null; aliases: string; matches_played: number }
interface AdminScheduledMatch { id: number; team_a: string; team_b: string; scheduled_at: string; match_id: number | null; winner: string | null; bets_processed: boolean; bracket_round: number | null; bracket_position: number | null }
type AdminSection = 'session' | 'meciuri' | 'players_cs' | 'teams_cs' | 'users' | 'logs' | 'database' | 'general_message' | 'bet_logs' | 'matches_history'

interface UserInfo {
  id: number
  email: string
  display_name: string
  points: number
  is_admin: boolean
}

// --- XP Window component ---

const XP_BTN: React.CSSProperties = {
  width: '21px', height: '21px', border: '1px solid #0a246a',
  color: 'white', fontSize: '12px', fontWeight: 'bold', lineHeight: '19px',
  textAlign: 'center', cursor: 'pointer', flexShrink: 0,
}

function DesktopWindow({ title, imgSrc, onClose, onMinimize, children, width = '90vw', maxWidth = '950px' }: {
  title: string
  imgSrc?: string
  onClose: () => void
  onMinimize: () => void
  children: ReactNode
  width?: string
  maxWidth?: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2">
      <div className="absolute inset-0 bg-black/30" onClick={onMinimize} />
      <div
        className="relative flex flex-col"
        style={{
          width, maxWidth, height: '82vh',
          background: '#ece9d8',
          border: '3px solid #0a246a',
          boxShadow: '6px 6px 20px rgba(0,0,0,0.7)',
          outline: '2px solid #7aa4e8',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div
          className="flex items-center gap-1.5 pl-2 pr-1 flex-shrink-0"
          style={{
            height: '28px',
            background: 'linear-gradient(to bottom, #3070e0 0%, #1c58d0 45%, #1448c0 100%)',
            borderBottom: '1px solid #0a246a',
          }}
        >
          {imgSrc && <img src={imgSrc} alt="" className="w-4 h-4 object-cover rounded-sm flex-shrink-0" />}
          <span className="text-white font-bold text-sm flex-1 select-none truncate" style={{ fontFamily: 'Trebuchet MS, sans-serif', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
            {title}
          </span>
          <div className="flex items-center gap-0.5">
            <button onClick={onMinimize} style={{ ...XP_BTN, background: 'linear-gradient(to bottom, #d0d0d0, #a8a8a8)' }}>_</button>
            <button style={{ ...XP_BTN, background: 'linear-gradient(to bottom, #d0d0d0, #a8a8a8)' }}>□</button>
            <button
              onClick={onClose}
              style={{ ...XP_BTN, background: 'linear-gradient(to bottom, #e86060, #c02020)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'linear-gradient(to bottom, #ff8080, #e03030)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'linear-gradient(to bottom, #e86060, #c02020)')}
            >✕</button>
          </div>
        </div>

        {/* Menu bar */}
        <div
          className="flex items-center gap-0 px-2 flex-shrink-0"
          style={{ height: '22px', background: '#ece9d8', borderBottom: '1px solid #a8a8a8', fontSize: '12px' }}
        >
          {['Fisier', 'Editare', 'Vizualizare', 'Instrumente', 'Ajutor'].map((m) => (
            <span
              key={m}
              className="px-2 py-0.5 cursor-default select-none"
              style={{ color: '#000' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#316ac5'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#000' }}
            >{m}</span>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden" style={{ background: 'white' }}>
          {children}
        </div>

        {/* Status bar */}
        <div
          className="flex items-center px-3 flex-shrink-0 select-none"
          style={{ height: '20px', background: '#ece9d8', borderTop: '1px solid #a8a8a8', fontSize: '11px', color: '#444' }}
        />
      </div>
    </div>
  )
}

// --- CS2 Scoreboard window content ---

const TEAM_PALETTE = [
  { circle: '#4e90d4', border: 'rgba(78,144,212,0.5)', bg: 'rgba(78,144,212,0.08)', text: '#7ab8ff', label: 'rgba(78,144,212,0.25)' },
  { circle: '#c8961e', border: 'rgba(200,150,30,0.5)', bg: 'rgba(200,150,30,0.08)', text: '#f5c040', label: 'rgba(200,150,30,0.25)' },
  { circle: '#5aad5a', border: 'rgba(90,173,90,0.5)',  bg: 'rgba(90,173,90,0.08)',  text: '#80e080', label: 'rgba(90,173,90,0.25)' },
  { circle: '#c44040', border: 'rgba(196,64,64,0.5)',  bg: 'rgba(196,64,64,0.08)',  text: '#ff8888', label: 'rgba(196,64,64,0.25)' },
  { circle: '#9060cc', border: 'rgba(144,96,204,0.5)', bg: 'rgba(144,96,204,0.08)', text: '#c090ff', label: 'rgba(144,96,204,0.25)' },
]

const ROW_BLUE = '#7ab8ff'
const ROW_GOLD = '#f5c040'

function PlayerRow({ p, rank }: {
  p: LeaderboardPlayer
  rank: number
}) {
  const nameColor = rank % 2 === 1 ? ROW_BLUE : ROW_GOLD

  return (
    <div
      className="flex items-center select-none transition-colors"
      style={{
        background: 'rgba(255,255,255,0.055)',
        borderBottom: '1px solid rgba(0,0,0,0.35)',
        marginBottom: '2px',
        cursor: 'default',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.11)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.055)')}
    >
      <div className="w-8 text-right pr-2 text-xs font-mono flex-shrink-0" style={{ color: 'rgba(255,255,255,0.6)' }}>{rank}</div>
      <div className="w-8 h-8 my-1 mx-2 rounded-sm overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {p.avatar_url
          ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>?</div>
        }
      </div>
      <div className="flex-1 min-w-0 pr-2">
        <div className="text-sm font-bold truncate" style={{ color: nameColor, textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
          {p.steam_nickname}
        </div>
      </div>
      <div className="w-28 text-sm truncate pr-2 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.8)' }}>
        {p.real_name || <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>}
      </div>
      <div className="w-24 text-sm truncate pr-2 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.65)' }}>
        {p.team_name || <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>}
      </div>
      <div className="w-9 text-center text-sm flex-shrink-0" style={{ color: 'rgba(255,255,255,0.75)' }}>{p.matches_played}</div>
      <div className="w-9 text-center text-sm font-medium flex-shrink-0" style={{ color: nameColor }}>{p.kills}</div>
      <div className="w-9 text-center text-sm flex-shrink-0" style={{ color: 'rgba(255,255,255,0.75)' }}>{p.deaths}</div>
      <div className="w-9 text-center text-sm flex-shrink-0" style={{ color: 'rgba(255,255,255,0.75)' }}>{p.assists}</div>
      <div className={`w-12 text-center text-sm font-bold flex-shrink-0 ${p.kd_ratio >= 1 ? 'text-green-400' : p.matches_played === 0 ? '' : 'text-red-400'}`}
        style={p.matches_played === 0 ? { color: 'rgba(255,255,255,0.4)' } : undefined}
      >
        {p.matches_played === 0 ? '—' : p.kd_ratio.toFixed(2)}
      </div>
      <div className="w-11 text-center text-sm flex-shrink-0" style={{ color: 'rgba(255,255,255,0.85)' }}>
        {p.matches_played === 0 ? <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span> : `${p.hs_percent.toFixed(0)}%`}
      </div>
      <div className="w-12 text-center text-sm flex-shrink-0" style={{ color: 'rgba(255,255,255,0.85)' }}>
        {p.matches_played === 0 ? <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span> : p.adr.toFixed(0)}
      </div>
      <div className="w-10 text-center text-sm font-medium pr-1 flex-shrink-0" style={{ color: '#f5c040' }}>
        {p.mvps > 0 ? `★${p.mvps}` : <span style={{ color: 'rgba(255,255,255,0.45)' }}>0</span>}
      </div>
    </div>
  )
}

function ColHeader() {
  return (
    <div
      className="flex items-center text-xs uppercase px-0 py-1"
      style={{ color: 'rgba(255,255,255,0.7)', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.25)' }}
    >
      <div className="w-8 flex-shrink-0" />
      <div className="w-8 mx-2 flex-shrink-0" />
      <div className="flex-1 pl-0">Jucator</div>
      <div className="w-28 flex-shrink-0">Nume</div>
      <div className="w-24 flex-shrink-0">Echipa</div>
      <div className="w-9 text-center flex-shrink-0">M</div>
      <div className="w-9 text-center flex-shrink-0">K</div>
      <div className="w-9 text-center flex-shrink-0">D</div>
      <div className="w-9 text-center flex-shrink-0">A</div>
      <div className="w-12 text-center flex-shrink-0">K/D</div>
      <div className="w-11 text-center flex-shrink-0">HS%</div>
      <div className="w-12 text-center flex-shrink-0">ADR</div>
      <div className="w-10 text-center pr-1 flex-shrink-0">MVPs</div>
    </div>
  )
}

function InlineMatchDetail({ matchId, onBack }: { matchId: number; onBack: () => void }) {
  const { data: match, isLoading } = useQuery({
    queryKey: ['match', matchId],
    queryFn: () => api.get(`/api/matches/${matchId}`).then((r) => r.data),
  })

  if (isLoading) return <div className="text-center py-16" style={{ color: 'rgba(255,255,255,0.3)' }}>Se incarca...</div>
  if (!match) return <div className="text-center py-16 text-red-400">Meciul nu a fost gasit.</div>

  type MP = { id: number; name: string; steam_nickname: string; team: number; kills: number; deaths: number; assists: number; kd_ratio: number; hs_percent: number; adr: number; score: number }
  const isSpectator = (p: MP) => p.kills === 0 && p.deaths === 0
  const team1 = match.players.filter((p: MP) => p.team === 1 && !isSpectator(p))
  const team2 = match.players.filter((p: MP) => p.team === 2 && !isSpectator(p))
  const spectators = match.players.filter((p: MP) => isSpectator(p))
  const t1Won = match.team1_score > match.team2_score
  const t2Won = match.team2_score > match.team1_score
  const date = match.timestamp
    ? new Date(match.timestamp).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  const TeamTable = ({ players, palette }: { players: typeof team1; palette: typeof TEAM_PALETTE[0] }) => (
    <div className="mb-4">
      <div className="grid text-xs uppercase px-3 py-1" style={{
        gridTemplateColumns: '1fr 44px 44px 44px 54px 48px 54px',
        color: 'rgba(255,255,255,0.35)', background: 'rgba(0,0,0,0.3)',
      }}>
        <span>Jucator</span>
        <span className="text-center">K</span>
        <span className="text-center">D</span>
        <span className="text-center">A</span>
        <span className="text-center">K/D</span>
        <span className="text-center">HS%</span>
        <span className="text-center">ADR</span>
      </div>
      {players.map((p: { steam_account_id?: string; id: number; name: string; steam_nickname: string; kills: number; deaths: number; assists: number; kd_ratio: number; hs_percent: number; adr: number }) => (
        <div key={p.id} className="grid items-center px-3 py-1.5"
          style={{ gridTemplateColumns: '1fr 44px 44px 44px 54px 48px 54px', borderBottom: '1px solid rgba(0,0,0,0.25)', background: 'rgba(255,255,255,0.03)' }}>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: palette.text }}>{p.name || p.steam_nickname}</div>
            {p.name && <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{p.steam_nickname}</div>}
          </div>
          <span className="text-center text-sm font-bold text-white">{p.kills}</span>
          <span className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{p.deaths}</span>
          <span className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{p.assists}</span>
          <span className={`text-center text-sm font-bold ${p.kd_ratio >= 1 ? 'text-green-400' : 'text-red-400'}`}>{p.kd_ratio.toFixed(2)}</span>
          <span className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{p.hs_percent}%</span>
          <span className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{p.adr}</span>
        </div>
      ))}
    </div>
  )

  return (
    <div className="p-4">
      <button onClick={onBack} className="text-xs mb-4 flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.4)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#f5c040')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
        ← Inapoi la meciuri
      </button>

      <div className="flex items-center justify-center gap-10 mb-5 py-4 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)' }}>
        <div className="text-right">
          <div className={`text-5xl font-black ${t1Won ? 'text-green-400' : 'text-red-400'}`}>{match.team1_score}</div>
          <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{match.first_half_team1} — {match.second_half_team1}</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-mono uppercase mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{match.map_name}</div>
          <div className="text-xl" style={{ color: 'rgba(255,255,255,0.2)' }}>:</div>
          {date && <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>{date}</div>}
        </div>
        <div className="text-left">
          <div className={`text-5xl font-black ${t2Won ? 'text-green-400' : 'text-red-400'}`}>{match.team2_score}</div>
          <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{match.first_half_team2} — {match.second_half_team2}</div>
        </div>
      </div>

      <TeamTable players={team1} palette={TEAM_PALETTE[0]} />
      <TeamTable players={team2} palette={TEAM_PALETTE[1]} />

      {spectators.length > 0 && (
        <div className="mt-2">
          <div className="px-3 py-1 text-xs uppercase font-bold tracking-wider"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)', borderLeft: '3px solid rgba(255,255,255,0.15)' }}>
            Spectatori ({spectators.length})
          </div>
          {spectators.map((p: MP) => (
            <div key={p.id} className="flex items-center px-3 py-1.5 gap-2"
              style={{ borderBottom: '1px solid rgba(0,0,0,0.2)', background: 'rgba(255,255,255,0.02)' }}>
              <div className="text-sm truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {p.name || p.steam_nickname}
                {p.name && <span className="text-xs ml-1" style={{ color: 'rgba(255,255,255,0.2)' }}>{p.steam_nickname}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CS2Content({ isAdmin }: { isAdmin: boolean }) {
  const [view, setView] = useState<'players' | 'teams' | 'live' | 'meciuri' | 'bracket'>('players')

  const { data: players, isLoading: loadingP } = useQuery<LeaderboardPlayer[]>({
    queryKey: ['leaderboard'],
    queryFn: () => api.get('/api/leaderboard').then((r) => r.data),
  })

  const { data: teams, isLoading: loadingT } = useQuery<TeamLeaderboard[]>({
    queryKey: ['leaderboard-teams'],
    queryFn: () => api.get('/api/leaderboard/teams').then((r) => r.data),
  })

  const { data: live } = useQuery<LiveState>({
    queryKey: ['live'],
    queryFn: () => api.get('/api/live').then((r) => r.data),
    refetchInterval: 10_000,
    enabled: view === 'live',
  })

  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null)
  const [bracketEdit, setBracketEdit] = useState<Record<number, { team_a: string; team_b: string }>>({})
  const [bracketSaved, setBracketSaved] = useState<Record<number, boolean>>({})
  const qcCs2 = useQueryClient()

  const createBracketSlot = useMutation({
    mutationFn: ({ team_a, team_b, bracket_round, bracket_position }: { team_a: string; team_b: string; bracket_round: number; bracket_position: number }) => {
      const adminToken = localStorage.getItem('admin_token') ?? ''
      return api.post('/api/admin/scheduled', { team_a, team_b, bracket_round, bracket_position }, { headers: { Authorization: `Bearer ${adminToken}` } }).then((r) => r.data)
    },
    onSuccess: () => {
      qcCs2.invalidateQueries({ queryKey: ['scheduled'] })
      qcCs2.invalidateQueries({ queryKey: ['admin-scheduled'] })
    },
  })

  const saveBracketTeams = useMutation({
    mutationFn: ({ id, team_a, team_b }: { id: number; team_a: string; team_b: string }) => {
      const adminToken = localStorage.getItem('admin_token') ?? ''
      return api.put(`/api/admin/scheduled/${id}`, { team_a, team_b }, { headers: { Authorization: `Bearer ${adminToken}` } }).then((r) => r.data)
    },
    onSuccess: (_data, vars) => {
      qcCs2.invalidateQueries({ queryKey: ['scheduled'] })
      qcCs2.invalidateQueries({ queryKey: ['admin-scheduled'] })
      setBracketSaved((prev) => ({ ...prev, [vars.id]: true }))
      setTimeout(() => setBracketSaved((prev) => { const n = { ...prev }; delete n[vars.id]; return n }), 2500)
    },
  })

  const setChampion = useMutation({
    mutationFn: ({ smId, champion }: { smId: number; champion: 'team_a' | 'team_b' }) => {
      const adminToken = localStorage.getItem('admin_token') ?? ''
      return api.put(`/api/admin/scheduled/${smId}/champion`, { champion }, { headers: { Authorization: `Bearer ${adminToken}` } }).then((r) => r.data)
    },
    onSuccess: () => {
      qcCs2.invalidateQueries({ queryKey: ['scheduled'] })
      qcCs2.invalidateQueries({ queryKey: ['admin-scheduled'] })
    },
  })

  const { data: matches, isLoading: loadingM } = useQuery<MatchSummary[]>({
    queryKey: ['matches'],
    queryFn: () => api.get('/api/matches').then((r) => r.data),
    enabled: view === 'meciuri',
  })

  const { data: scheduled } = useQuery<ScheduledMatch[]>({
    queryKey: ['scheduled'],
    queryFn: () => api.get('/api/scheduled').then((r) => r.data),
    enabled: view === 'meciuri' || view === 'bracket',
  })

  const playersByTeam = useMemo(() => {
    if (!players) return new Map<string, LeaderboardPlayer[]>()
    const map = new Map<string, LeaderboardPlayer[]>()
    players.forEach((p) => {
      const key = p.team_name ?? '__none__'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    })
    return map
  }, [players])

  const CS2_BG = '#16130a'
  const CS2_HEADER_BG = '#0e0b04'

  return (
    <div style={{ background: CS2_BG, height: '100%', overflowY: 'auto' }}>
      {/* Tab bar */}
      <div
        className="flex items-center gap-0 sticky top-0 z-10"
        style={{ background: CS2_HEADER_BG, borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        {([
          ['players', 'Jucatori'],
          ['live',    'Live'],
          ['meciuri', 'Meciuri'],
          ['bracket', 'Bracket'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className="px-6 py-3 text-sm font-semibold transition-colors tracking-wide uppercase flex items-center gap-2"
            style={{
              color: view === key ? '#f5c040' : 'rgba(255,255,255,0.35)',
              borderBottom: view === key ? '2px solid #f5c040' : '2px solid transparent',
              letterSpacing: '0.08em',
            }}
          >
            {key === 'live' && (
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: live?.is_live ? '#4ade80' : 'rgba(255,255,255,0.2)' }} />
            )}
            {label}
          </button>
        ))}
      </div>

      {/* ── PLAYERS VIEW ── */}
      {view === 'players' && (
        <>
          {loadingP && <div className="text-center py-16" style={{ color: 'rgba(255,255,255,0.3)' }}>Se incarca...</div>}
          {!loadingP && !players?.length && (
            <div className="text-center py-16" style={{ color: 'rgba(255,255,255,0.2)' }}>Nicio data inca.</div>
          )}
          {players && players.length > 0 && (
            <>
              <ColHeader />
              {players.map((p, idx) => <PlayerRow key={p.id} p={p} rank={idx + 1} />)}
            </>
          )}
        </>
      )}

      {/* ── TEAMS VIEW ── */}
      {view === 'teams' && (
        <>
          {loadingT && <div className="text-center py-16" style={{ color: 'rgba(255,255,255,0.3)' }}>Se incarca...</div>}
          {!loadingT && !teams?.length && (
            <div className="text-center py-16" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Nicio echipa inca. Atribuie echipe jucatorilor din admin.
            </div>
          )}

          {teams && teams.length > 0 && teams.map((t, i) => {
            const palette = TEAM_PALETTE[i % TEAM_PALETTE.length]
            const grp = playersByTeam.get(t.team_name) ?? []

            return (
              <div
                key={t.team_name}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  borderLeft: `3px solid ${palette.circle}`,
                  background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
                }}
              >
                {/* Rank */}
                <div className="w-6 text-center font-mono text-sm flex-shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {i + 1}
                </div>

                {/* Team name + players */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm uppercase tracking-wide truncate" style={{ color: palette.text }}>
                    {t.team_name}
                  </div>
                  {grp.length > 0 && (
                    <div className="flex flex-wrap gap-x-3 mt-0.5">
                      {grp.map((p) => (
                        <span key={p.id} className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                          {p.steam_nickname}{p.real_name ? ` · ${p.real_name}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 flex-shrink-0 text-sm">
                  <div className="text-center w-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>MJ</div>
                    {t.matches_played}
                  </div>
                  <div className="text-center w-7 text-green-400 font-semibold">
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>V</div>
                    {t.wins}
                  </div>
                  <div className="text-center w-7 text-yellow-400 font-semibold">
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>E</div>
                    {t.draws}
                  </div>
                  <div className="text-center w-7 text-red-400 font-semibold">
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>I</div>
                    {t.losses}
                  </div>
                  <div className="text-center w-10 font-semibold" style={{ color: t.round_diff > 0 ? '#4ade80' : t.round_diff < 0 ? '#f87171' : 'rgba(255,255,255,0.35)' }}>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>RD</div>
                    {t.round_diff > 0 ? '+' : ''}{t.round_diff}
                  </div>
                  <div className="text-center w-10 font-black text-lg" style={{ color: palette.text }}>
                    <div className="text-xs font-normal" style={{ color: 'rgba(255,255,255,0.25)' }}>Pct</div>
                    {t.points}
                  </div>
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* ── LIVE VIEW ── */}
      {view === 'live' && (
        <div className="p-4">
          {!live && <div className="text-center py-16" style={{ color: 'rgba(255,255,255,0.3)' }}>Se incarca...</div>}

          {live && !live.is_live && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
              <div className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {live.reason ?? 'Niciun meci live in acest moment.'}
              </div>
            </div>
          )}

          {live?.is_live && (() => {
            const t1 = live.team1_name ?? 'Echipa 1'
            const t2 = live.team2_name ?? 'Echipa 2'
            const p1 = live.players?.filter((p) => p.team === 1) ?? []
            const p2 = live.players?.filter((p) => p.team === 2) ?? []

            const TeamTable = ({ players, palette }: { players: LivePlayer[], palette: typeof TEAM_PALETTE[0] }) => (
              <div>
                <div className="grid text-xs uppercase px-3 py-1" style={{
                  gridTemplateColumns: '1fr 44px 44px 44px 54px 48px 54px 44px',
                  color: 'rgba(255,255,255,0.35)', background: 'rgba(0,0,0,0.3)',
                }}>
                  <span>Jucator</span>
                  <span className="text-center">K</span>
                  <span className="text-center">D</span>
                  <span className="text-center">A</span>
                  <span className="text-center">K/D</span>
                  <span className="text-center">HS%</span>
                  <span className="text-center">ADR</span>
                  <span className="text-center">MVP</span>
                </div>
                {players.map((p) => {
                  const kd = (p.kills / Math.max(p.deaths, 1)).toFixed(2)
                  const adr = (p.damage / Math.max(p.rounds_played, 1)).toFixed(0)
                  const hs = p.kills > 0 ? Math.round((p.headshot_kills / p.kills) * 100) : 0
                  return (
                    <div key={p.steam_account_id} className="grid items-center px-3 py-1.5"
                      style={{
                        gridTemplateColumns: '1fr 44px 44px 44px 54px 48px 54px 44px',
                        background: 'rgba(255,255,255,0.04)',
                        borderBottom: '1px solid rgba(0,0,0,0.25)',
                      }}>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate" style={{ color: palette.text }}>
                          {p.real_name || p.steam_nickname}
                        </div>
                        {p.real_name && (
                          <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{p.steam_nickname}</div>
                        )}
                      </div>
                      <span className="text-center text-sm font-bold text-white">{p.kills}</span>
                      <span className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{p.deaths}</span>
                      <span className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{p.assists}</span>
                      <span className={`text-center text-sm font-bold ${parseFloat(kd) >= 1 ? 'text-green-400' : 'text-red-400'}`}>{kd}</span>
                      <span className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{hs}%</span>
                      <span className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{adr}</span>
                      <span className="text-center text-sm font-bold" style={{ color: p.mvps > 0 ? '#f5c040' : 'rgba(255,255,255,0.3)' }}>
                        {p.mvps > 0 ? `★${p.mvps}` : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )

            return (
              <>
                {/* Header: harta + LIVE */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="text-xs uppercase tracking-widest font-bold" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {live.map_name}
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded" style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs font-bold text-green-400">LIVE</span>
                  </div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Runda {live.rounds_played}
                  </div>
                </div>

                {/* Scor principal */}
                <div className="flex items-stretch justify-center mb-5" style={{ gap: '2px' }}>
                  {/* Echipa 1 */}
                  <div className="flex-1 flex flex-col items-center justify-center py-3 px-4 rounded-l"
                    style={{ background: 'rgba(78,144,212,0.12)', border: '1px solid rgba(78,144,212,0.3)', borderRight: 'none' }}>
                    <div className="text-base font-bold mb-1" style={{ color: TEAM_PALETTE[0].text }}>{t1}</div>
                    <div className="text-5xl font-black" style={{ color: TEAM_PALETTE[0].circle, lineHeight: 1 }}>
                      {live.team1_score}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {live.team1_score === 1 ? 'runda castigata' : 'runde castigate'}
                    </div>
                  </div>

                  {/* VS separator */}
                  <div className="flex flex-col items-center justify-center px-4"
                    style={{ background: 'rgba(0,0,0,0.3)', minWidth: '48px' }}>
                    <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.2)' }}>VS</span>
                  </div>

                  {/* Echipa 2 */}
                  <div className="flex-1 flex flex-col items-center justify-center py-3 px-4 rounded-r"
                    style={{ background: 'rgba(200,150,30,0.12)', border: '1px solid rgba(200,150,30,0.3)', borderLeft: 'none' }}>
                    <div className="text-base font-bold mb-1" style={{ color: TEAM_PALETTE[1].text }}>{t2}</div>
                    <div className="text-5xl font-black" style={{ color: TEAM_PALETTE[1].circle, lineHeight: 1 }}>
                      {live.team2_score}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {live.team2_score === 1 ? 'runda castigata' : 'runde castigate'}
                    </div>
                  </div>
                </div>

                {/* Tabel jucatori echipa 1 */}
                <div className="mb-3">
                  <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider"
                    style={{ background: TEAM_PALETTE[0].label, borderLeft: `3px solid ${TEAM_PALETTE[0].circle}`, color: TEAM_PALETTE[0].text }}>
                    {t1} — {p1.length} jucatori
                  </div>
                  <TeamTable players={p1} palette={TEAM_PALETTE[0]} />
                </div>

                {/* Tabel jucatori echipa 2 */}
                <div>
                  <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider"
                    style={{ background: TEAM_PALETTE[1].label, borderLeft: `3px solid ${TEAM_PALETTE[1].circle}`, color: TEAM_PALETTE[1].text }}>
                    {t2} — {p2.length} jucatori
                  </div>
                  <TeamTable players={p2} palette={TEAM_PALETTE[1]} />
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* ── BRACKET VIEW ── */}
      {view === 'bracket' && (() => {
        const bracketMatches = (scheduled ?? []).filter(sm => sm.bracket_round !== null && sm.bracket_position !== null)

        if (bracketMatches.length === 0) return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
            Niciun meci programat.
          </div>
        )

        const CARD_W = 176
        const CARD_H = 80
        const SLOT_BASE = 112
        const CONN_W = 60
        const ROUND_W = CARD_W + CONN_W
        const LABEL_H = 26

        const r1Matches = bracketMatches.filter(sm => sm.bracket_round === 1)
        const r1Size = r1Matches.length > 0 ? Math.max(...r1Matches.map(sm => (sm.bracket_position ?? 0))) + 1 : 1
        const maxRound = Math.ceil(Math.log2(r1Size)) + 1
        const totalH = r1Size * SLOT_BASE
        const totalW = maxRound * ROUND_W - CONN_W

        const matchMap = new Map<string, ScheduledMatch>()
        for (const sm of bracketMatches) {
          matchMap.set(`${sm.bracket_round}-${sm.bracket_position}`, sm)
        }

        const cardPos = (round: number, pos: number) => {
          const r = round - 1
          const slotH = SLOT_BASE * Math.pow(2, r)
          return { top: pos * slotH + (slotH - CARD_H) / 2, left: r * ROUND_W }
        }

        const roundLabel = (_round: number, count: number) => {
          if (count >= 4) return 'Sferturi'
          if (count === 2) return 'Semifinale'
          return 'Finală'
        }

        type BLine = { x1: number; y1: number; x2: number; y2: number; gold: boolean }
        const lines: BLine[] = []
        for (let round = 1; round < maxRound; round++) {
          const count = Math.ceil(r1Size / Math.pow(2, round - 1))
          for (let pos = 0; pos < count; pos += 2) {
            const matchA = matchMap.get(`${round}-${pos}`)
            const matchB = matchMap.get(`${round}-${pos + 1}`)
            const posA = cardPos(round, pos)
            const posB = cardPos(round, pos + 1)
            const posN = cardPos(round + 1, pos >> 1)
            const xA = posA.left + CARD_W, yA = posA.top + CARD_H / 2
            const xB = posB.left + CARD_W, yB = posB.top + CARD_H / 2
            const xMid = posA.left + CARD_W + CONN_W / 2
            const yN = posN.top + CARD_H / 2, xN = posN.left
            const goldA = !!matchA?.winner, goldB = !!matchB?.winner
            lines.push({ x1: xA, y1: yA, x2: xMid, y2: yA, gold: goldA })
            lines.push({ x1: xB, y1: yB, x2: xMid, y2: yB, gold: goldB })
            lines.push({ x1: xMid, y1: yA, x2: xMid, y2: yB, gold: goldA || goldB })
            lines.push({ x1: xMid, y1: yN, x2: xN, y2: yN, gold: goldA && goldB })
          }
        }

        const allTeams = Array.from(new Set([
          ...bracketMatches.flatMap(sm => [sm.team_a, sm.team_b]),
          ...(players ?? []).map(p => p.team_name).filter(Boolean) as string[],
        ].filter(Boolean) as string[])).sort()

        const BracketCard = ({ sm, round, pos }: { sm: ScheduledMatch | null; round: number; pos: number }) => {
          if (!sm) {
            if (isAdmin) {
              const newEdit = bracketEdit[-(round * 1000 + pos)] ?? { team_a: allTeams[0] ?? '', team_b: allTeams[1] ?? '' }
              const creating = createBracketSlot.isPending && createBracketSlot.variables?.bracket_round === round && createBracketSlot.variables?.bracket_position === pos
              return (
                <div style={{ width: CARD_W, background: 'rgba(20,18,10,0.97)', border: '1px dashed rgba(245,192,64,0.3)', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '3px 8px', borderBottom: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
                    <span style={{ fontSize: 9, color: 'rgba(245,192,64,0.4)', letterSpacing: '0.04em' }}>Admin — seteaza echipe</span>
                  </div>
                  {(['team_a', 'team_b'] as const).map((side, i) => (
                    <div key={side} style={{ padding: '4px 6px', borderBottom: i === 0 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                      <select
                        value={newEdit[side]}
                        onChange={(e) => setBracketEdit((prev) => ({ ...prev, [-(round * 1000 + pos)]: { ...newEdit, [side]: e.target.value } }))}
                        style={{ width: '100%', fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, color: '#fff', padding: '2px 4px' }}
                      >
                        {allTeams.map((t) => <option key={t} value={t} style={{ background: '#1a1a1a' }}>{t}</option>)}
                      </select>
                    </div>
                  ))}
                  <div style={{ padding: '4px 6px' }}>
                    <button
                      disabled={creating || newEdit.team_a === newEdit.team_b || !newEdit.team_a || !newEdit.team_b}
                      onClick={() => createBracketSlot.mutate({ team_a: newEdit.team_a, team_b: newEdit.team_b, bracket_round: round, bracket_position: pos })}
                      style={{ width: '100%', fontSize: 10, fontWeight: 700, background: creating ? 'rgba(245,192,64,0.2)' : 'rgba(245,192,64,0.85)', color: '#1a1a1a', border: 'none', borderRadius: 4, padding: '3px 0', cursor: creating ? 'not-allowed' : 'pointer', letterSpacing: '0.05em' }}
                    >
                      {creating ? 'Se salveaza...' : 'Salveaza'}
                    </button>
                  </div>
                </div>
              )
            }
            return (
              <div style={{ width: CARD_W, height: CARD_H, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.06em' }}>TBD</span>
              </div>
            )
          }
          const wonA = sm.winner === 'team_a', wonB = sm.winner === 'team_b'
          const dateStr = sm.scheduled_at
            ? new Date(sm.scheduled_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
            : sm.winner ? '\u2713 Terminat' : '\u2014 data nesetata \u2014'

          const showAdminEdit = isAdmin && !sm.winner
          const edit = bracketEdit[sm.id] ?? { team_a: sm.team_a, team_b: sm.team_b }
          const pending = saveBracketTeams.isPending && saveBracketTeams.variables?.id === sm.id
          const saved = !!bracketSaved[sm.id]

          if (showAdminEdit) {
            return (
              <div style={{ width: CARD_W, background: 'rgba(20,18,10,0.97)', border: saved ? '1.5px solid #4ade80' : '1px solid rgba(245,192,64,0.35)', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: saved ? '0 0 10px rgba(74,222,128,0.3)' : '0 2px 12px rgba(0,0,0,0.5)', transition: 'border 0.2s, box-shadow 0.2s' }}>
                <div style={{ padding: '3px 8px', borderBottom: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
                  <span style={{ fontSize: 9, color: saved ? '#4ade80' : 'rgba(245,192,64,0.55)', letterSpacing: '0.04em' }}>{saved ? '\u2713 Salvat!' : 'Admin \u2014 seteaza echipe'}</span>
                </div>
                {(['team_a', 'team_b'] as const).map((side, i) => (
                  <div key={side} style={{ padding: '4px 6px', borderBottom: i === 0 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                    <select
                      value={edit[side]}
                      onChange={(e) => setBracketEdit((prev) => ({ ...prev, [sm.id]: { ...edit, [side]: e.target.value } }))}
                      style={{ width: '100%', fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, color: '#fff', padding: '2px 4px' }}
                    >
                      {allTeams.map((t) => <option key={t} value={t} style={{ background: '#1a1a1a' }}>{t}</option>)}
                    </select>
                  </div>
                ))}
                <div style={{ padding: '4px 6px' }}>
                  <button
                    disabled={pending || edit.team_a === edit.team_b}
                    onClick={() => saveBracketTeams.mutate({ id: sm.id, team_a: edit.team_a, team_b: edit.team_b })}
                    style={{ width: '100%', fontSize: 10, fontWeight: 700, background: pending ? 'rgba(245,192,64,0.2)' : saved ? 'rgba(74,222,128,0.85)' : 'rgba(245,192,64,0.85)', color: '#1a1a1a', border: 'none', borderRadius: 4, padding: '3px 0', cursor: pending ? 'not-allowed' : 'pointer', letterSpacing: '0.05em', transition: 'background 0.2s' }}
                  >
                    {pending ? 'Se salveaza...' : saved ? '\u2713 Salvat' : 'Salveaza'}
                  </button>
                </div>
              </div>
            )
          }

          return (
            <div style={{ width: CARD_W, height: CARD_H, background: 'rgba(255,255,255,0.05)', border: sm.winner ? '1px solid rgba(245,192,64,0.5)' : '1px solid rgba(255,255,255,0.12)', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: sm.winner ? '0 0 14px rgba(245,192,64,0.12)' : 'none' }}>
              <div style={{ padding: '2px 8px', borderBottom: '1px solid rgba(255,255,255,0.07)', textAlign: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.04em' }}>{dateStr}</span>
              </div>
              {([
                { name: sm.team_a, won: wonA, lost: !!sm.winner && !wonA },
                { name: sm.team_b, won: wonB, lost: !!sm.winner && !wonB },
              ] as { name: string; won: boolean; lost: boolean }[]).map(({ name, won, lost }, i) => (
                <div key={i} style={{ flex: 1, padding: '0 10px', display: 'flex', alignItems: 'center', background: won ? 'rgba(245,192,64,0.13)' : 'transparent', borderBottom: i === 0 ? '1px solid rgba(255,255,255,0.06)' : 'none', opacity: lost ? 0.3 : 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: won ? '#f5c040' : 'rgba(255,255,255,0.88)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {won ? '\u2713 ' : ''}{name}
                  </span>
                </div>
              ))}
            </div>
          )
        }

        return (
          <div style={{ overflow: 'auto', minHeight: '100%', padding: '16px 24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: totalW, height: totalH + LABEL_H, flexShrink: 0 }}>
              {Array.from({ length: maxRound }, (_, r) => r + 1).map(round => {
                const count = Math.ceil(r1Size / Math.pow(2, round - 1))
                const { left } = cardPos(round, 0)
                return (
                  <div key={`lbl-${round}`} style={{ position: 'absolute', left, top: 0, width: CARD_W, textAlign: 'center', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: round === maxRound ? 'rgba(245,192,64,0.65)' : 'rgba(255,255,255,0.28)' }}>
                    {roundLabel(round, count)}
                  </div>
                )
              })}
              <svg style={{ position: 'absolute', top: LABEL_H, left: 0, width: totalW, height: totalH, pointerEvents: 'none' }}>
                {lines.map((l, i) => (
                  <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.gold ? 'rgba(245,192,64,0.6)' : 'rgba(255,255,255,0.14)'} strokeWidth={l.gold ? 2 : 1.5} />
                ))}
              </svg>
              {Array.from({ length: maxRound }, (_, r) => r + 1).map(round =>
                Array.from({ length: Math.ceil(r1Size / Math.pow(2, round - 1)) }, (_, pos) => {
                  const sm = matchMap.get(`${round}-${pos}`) ?? null
                  const { top, left } = cardPos(round, pos)
                  const isFinal = round === maxRound
                  return (
                    <div key={`${round}-${pos}`} style={{ position: 'absolute', top: top + LABEL_H, left }}>
                      {isFinal && sm && (
                        <div style={{ marginBottom: '8px', display: 'flex', gap: '4px' }}>
                          <select
                            value={sm.winner ?? ''}
                            onChange={(e) => setChampion.mutate({ smId: sm.id, champion: e.target.value as 'team_a' | 'team_b' })}
                            disabled={setChampion.isPending || !sm.team_a || !sm.team_b}
                            style={{
                              width: CARD_W,
                              fontSize: 10,
                              fontWeight: 700,
                              background: 'rgba(245,192,64,0.85)',
                              color: '#1a1a1a',
                              border: 'none',
                              borderRadius: 4,
                              padding: '4px 6px',
                              cursor: setChampion.isPending ? 'not-allowed' : 'pointer',
                              opacity: setChampion.isPending ? 0.6 : 1,
                            }}
                          >
                            <option value="">🏆 Setează Campion</option>
                            <option value="team_a">{sm.team_a}</option>
                            <option value="team_b">{sm.team_b}</option>
                          </select>
                        </div>
                      )}
                      <BracketCard sm={sm} round={round} pos={pos} />
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )
      })()}

      {/* ── MECIURI VIEW ── */}
      {view === 'meciuri' && (
        <div>
          {selectedMatchId ? (
            <InlineMatchDetail matchId={selectedMatchId} onBack={() => setSelectedMatchId(null)} />
          ) : (
            <div className="p-4">
              {loadingM && <div className="text-center py-16" style={{ color: 'rgba(255,255,255,0.3)' }}>Se incarca...</div>}

              {/* Programate viitoare */}
              {(() => {
                const upcoming = scheduled?.filter((sm) => !sm.match_id && new Date(sm.scheduled_at) >= new Date()) ?? []
                if (!upcoming.length) return null
                return (
                  <div className="mb-6">
                    <div className="text-xs uppercase font-bold tracking-wider mb-3 px-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Programate
                    </div>
                    <div className="space-y-2">
                      {upcoming.map((sm) => (
                        <div key={sm.id} className="flex items-center justify-between rounded-lg px-4 py-3"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <span className="font-bold text-sm text-white">{sm.team_a}</span>
                          <div className="text-center">
                            <div className="text-xs text-blue-400 font-semibold">
                              {new Date(sm.scheduled_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>vs</div>
                          </div>
                          <span className="font-bold text-sm text-white">{sm.team_b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Rezultate */}
              <div>
                <div className="text-xs uppercase font-bold tracking-wider mb-3 px-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Rezultate
                </div>
                <div className="space-y-2">
                  {scheduled
                    ?.filter((sm) => sm.match_id)
                    .slice().sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
                    .map((sm) => {
                      const aWon = sm.winner === 'team_a'
                      const bWon = sm.winner === 'team_b'
                      // determine which match team index belongs to team_a
                      const teamAIsTeam1 = sm.result
                        ? (aWon ? sm.result.team1_score > sm.result.team2_score : sm.result.team2_score > sm.result.team1_score)
                        : true
                      const scoreA = sm.result ? (teamAIsTeam1 ? sm.result.team1_score : sm.result.team2_score) : null
                      const scoreB = sm.result ? (teamAIsTeam1 ? sm.result.team2_score : sm.result.team1_score) : null
                      return (
                        <button key={sm.id}
                          onClick={() => setSelectedMatchId(sm.match_id!)}
                          className="w-full flex items-center justify-between rounded-lg px-4 py-3 transition-colors text-left"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(245,192,64,0.35)')}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}>
                          <span className={`font-bold text-sm w-1/3 text-left ${aWon ? 'text-green-400' : bWon ? 'text-red-400' : 'text-white'}`}>{sm.team_a}</span>
                          {sm.result ? (
                            <div className="text-center flex-shrink-0">
                              <div className="font-black text-lg">
                                <span className={aWon ? 'text-green-400' : bWon ? 'text-red-400' : 'text-white'}>{scoreA}</span>
                                <span className="mx-1" style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>
                                <span className={bWon ? 'text-green-400' : aWon ? 'text-red-400' : 'text-white'}>{scoreB}</span>
                              </div>
                              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{sm.result.map_name}</div>
                            </div>
                          ) : (
                            <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>
                          )}
                          <span className={`font-bold text-sm w-1/3 text-right ${bWon ? 'text-green-400' : aWon ? 'text-red-400' : 'text-white'}`}>{sm.team_b}</span>
                        </button>
                      )
                    })}

                  {matches
                    ?.filter((m) => !scheduled?.some((sm) => sm.match_id === m.id))
                    .map((m) => {
                      const t1Label = m.team1_name ?? m.players.filter((p) => p.team === 1).find((p) => p.team_name)?.team_name ?? 'Echipa 1'
                      const t2Label = m.team2_name ?? m.players.filter((p) => p.team === 2).find((p) => p.team_name)?.team_name ?? 'Echipa 2'
                      return (
                        <button key={m.id}
                          onClick={() => setSelectedMatchId(m.id)}
                          className="w-full flex items-center justify-between rounded-lg px-4 py-3 transition-colors text-left"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(245,192,64,0.35)')}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}>
                          <div className="w-1/3 text-left">
                            <div className="text-sm font-bold text-white truncate">{t1Label}</div>
                          </div>
                          <div className="text-center flex-shrink-0">
                            <div className="font-black text-lg">
                              <span className={m.team1_score > m.team2_score ? 'text-green-400' : 'text-red-400'}>{m.team1_score}</span>
                              <span className="mx-1" style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>
                              <span className={m.team2_score > m.team1_score ? 'text-green-400' : 'text-red-400'}>{m.team2_score}</span>
                            </div>
                            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{m.map_name}</div>
                          </div>
                          <div className="w-1/3 text-right">
                            <div className="text-sm font-bold text-white truncate">{t2Label}</div>
                          </div>
                        </button>
                      )
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// --- YouTube window content ---

function YouTubeContent({ link }: { link: string | null }) {
  if (!link) {
    return (
      <div className="flex flex-col items-center justify-center h-full" style={{ background: '#000' }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', textAlign: 'center' }}>
          Nu este setat niciun link YouTube
        </div>
      </div>
    )
  }

  const getYouTubeEmbedUrl = (url: string) => {
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    if (videoIdMatch?.[1]) {
      return `https://www.youtube.com/embed/${videoIdMatch[1]}`
    }
    return null
  }

  const embedUrl = getYouTubeEmbedUrl(link)

  return (
    <div style={{ background: '#000', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {embedUrl ? (
        <iframe
          width="100%"
          height="100%"
          src={embedUrl}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ background: '#000' }}
        />
      ) : (
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', textAlign: 'center' }}>
          Link YouTube invalid
        </div>
      )}
    </div>
  )
}

// --- Casa Pariurilor window content ---

function calcOdds(kd: number, winRate: number, adr: number): number {
  const skill = kd * 0.4 + (winRate / 100) * 0.35 + (adr / 100) * 0.25
  return Math.max(1.10, Math.min(5.00, parseFloat((3.5 / (skill + 0.15)).toFixed(2))))
}

function BettingContent() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'available' | 'history' | 'top_users'>('available')
  const [matchBetTab, setMatchBetTab] = useState<Record<number, 'echipe' | 'jucatori'>>({})
  const [teamSelection, setTeamSelection] = useState<Record<number, 'team_a' | 'team_b'>>({})
  const [playerSelection, setPlayerSelection] = useState<Record<number, number>>({})

  const { data: scheduled } = useQuery<ScheduledMatch[]>({
    queryKey: ['scheduled'],
    queryFn: () => api.get('/api/scheduled').then((r) => r.data),
  })

  const { data: myBets } = useQuery<Bet[]>({
    queryKey: ['my-bets'],
    queryFn: () => api.get('/api/bets/my').then((r) => r.data),
    refetchInterval: 30000,
  })

  const { data: myPlayerBets } = useQuery<PlayerBet[]>({
    queryKey: ['my-player-bets'],
    queryFn: () => api.get('/api/bets/player/my').then((r) => r.data),
    refetchInterval: 30000,
  })

  const { data: allPlayers } = useQuery<LeaderboardPlayer[]>({
    queryKey: ['leaderboard'],
    queryFn: () => api.get('/api/leaderboard').then((r) => r.data),
  })

  const { data: me } = useQuery<{ display_name: string; points: number }>({
    queryKey: ['me'],
    queryFn: () => api.get('/api/auth/me').then((r) => r.data),
    refetchInterval: 30000,
  })

  interface TopUser {
    id: number
    display_name: string
    points: number
    bets_total: number
    bets_won: number
    bets_draw: number
    bets_lost: number
    bets_pending: number
  }

  const { data: topUsers } = useQuery<TopUser[]>({
    queryKey: ['leaderboard-bets'],
    queryFn: () => api.get('/api/leaderboard/bets').then((r) => r.data),
    refetchInterval: 60000,
  })

  const placeBet = useMutation({
    mutationFn: (vars: { scheduled_match_id: number; predicted_winner: string }) =>
      api.post('/api/bets', vars).then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['my-bets'] })
      setTeamSelection((prev) => { const n = { ...prev }; delete n[vars.scheduled_match_id]; return n })
    },
  })

  const changeBet = useMutation({
    mutationFn: (vars: { bet_id: number; scheduled_match_id: number; predicted_winner: string }) =>
      api.put(`/api/bets/${vars.bet_id}`, { predicted_winner: vars.predicted_winner }).then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['my-bets'] })
      setTeamSelection((prev) => { const n = { ...prev }; delete n[vars.scheduled_match_id]; return n })
    },
  })

  const placePlayerBet = useMutation({
    mutationFn: (vars: { scheduled_match_id: number; predicted_player_id: number }) =>
      api.post('/api/bets/player', vars).then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['my-player-bets'] })
      setPlayerSelection((prev) => { const n = { ...prev }; delete n[vars.scheduled_match_id]; return n })
    },
  })

  const changePlayerBet = useMutation({
    mutationFn: (vars: { bet_id: number; scheduled_match_id: number; predicted_player_id: number }) =>
      api.put(`/api/bets/player/${vars.bet_id}`, { predicted_player_id: vars.predicted_player_id }).then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['my-player-bets'] })
      setPlayerSelection((prev) => { const n = { ...prev }; delete n[vars.scheduled_match_id]; return n })
    },
  })

  const deleteBet = useMutation({
    mutationFn: (bet_id: number) => api.delete(`/api/bets/${bet_id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-bets'] }),
  })

  const deletePlayerBet = useMutation({
    mutationFn: (bet_id: number) => api.delete(`/api/bets/player/${bet_id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-player-bets'] }),
  })

  const now = new Date()
  const upcoming = scheduled?.filter((sm) => !sm.winner && new Date(sm.scheduled_at) > now) ?? []
  const myBetsMap = new Map(myBets?.map((b) => [b.scheduled_match_id, b]) ?? [])
  const myPlayerBetsMap = new Map(myPlayerBets?.map((b) => [b.scheduled_match_id, b]) ?? [])

  const totalBets = (myBets?.length || 0) + (myPlayerBets?.length || 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#B71C1C' }}>
      {/* Header */}
      <div style={{ background: '#C62828', padding: '10px 16px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div className="flex gap-1">
            {(['available', 'history', 'top_users'] as const).map((t) => {
              const label = t === 'available' ? 'Pariuri disponibile' : t === 'history' ? `Biletele mele${totalBets > 0 ? ` (${totalBets})` : ''}` : 'Top Utilizatori'
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '8px 8px 0 0',
                    border: 'none',
                    cursor: 'pointer',
                    background: tab === t ? '#fff' : 'transparent',
                    color: tab === t ? '#B71C1C' : 'rgba(255,255,255,0.75)',
                    transition: 'all 0.15s',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
          {me && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '6px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{me.display_name}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.2 }}>{me.points} pct</div>
              </div>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#fff' }}>
                {me.display_name[0]?.toUpperCase()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '12px', background: '#f5f5f5', flex: 1, overflowY: 'auto' }}>

        {/* TAB: Pariuri disponibile */}
        {tab === 'available' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {upcoming.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#888' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎰</div>
                <div style={{ fontWeight: 600, color: '#444', marginBottom: '4px' }}>Niciun meci disponibil</div>
                <div style={{ fontSize: '13px' }}>Pariurile se deschid inaintea meciurilor programate.</div>
              </div>
            )}
            {upcoming.map((sm) => {
              const bet = myBetsMap.get(sm.id)
              const playerBet = myPlayerBetsMap.get(sm.id)
              const activeTab = matchBetTab[sm.id] ?? 'echipe'
              const dateStr = new Date(sm.scheduled_at).toLocaleDateString('ro-RO', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
              })
              const isPending = placeBet.isPending || changeBet.isPending
              const isPlayerPending = placePlayerBet.isPending || changePlayerBet.isPending
              const localTeam = teamSelection[sm.id]
              const localPlayer = playerSelection[sm.id]

              const matchPlayers = (allPlayers ?? []).filter(
                (p) => p.team_name === sm.team_a || p.team_name === sm.team_b
              ).sort((a, b) => calcOdds(a.kd_ratio, a.win_rate, a.adr) - calcOdds(b.kd_ratio, b.win_rate, b.adr))

              return (
                <div key={sm.id} style={{ background: '#fff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}>
                  {/* Card header */}
                  <div style={{ background: '#C62828', padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12px' }}>{dateStr}</span>
                    {(bet || playerBet) ? (
                      <span style={{ background: '#FDD835', color: '#000', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>
                        AI PARIAT
                      </span>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>Deschis</span>
                    )}
                  </div>

                  {/* Teams row */}
                  <div style={{ padding: '12px 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <span style={{ fontWeight: 700, fontSize: '15px', color: '#1a1a1a', flex: 1, textAlign: 'right' }}>{sm.team_a}</span>
                    <span style={{ color: '#999', fontSize: '12px', fontWeight: 600, padding: '3px 8px', background: '#f0f0f0', borderRadius: '6px' }}>VS</span>
                    <span style={{ fontWeight: 700, fontSize: '15px', color: '#1a1a1a', flex: 1, textAlign: 'left' }}>{sm.team_b}</span>
                  </div>

                  {/* Sub-tabs */}
                  <div style={{ display: 'flex', margin: '0 14px 10px', background: '#f0f0f0', borderRadius: '8px', padding: '3px' }}>
                    {(['echipe', 'jucatori'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setMatchBetTab((prev) => ({ ...prev, [sm.id]: t }))}
                        style={{
                          flex: 1, padding: '6px', fontSize: '12px', fontWeight: 600,
                          borderRadius: '6px', border: 'none', cursor: 'pointer',
                          background: activeTab === t ? '#C62828' : 'transparent',
                          color: activeTab === t ? '#fff' : '#666',
                          transition: 'all 0.15s',
                        }}
                      >
                        {t === 'echipe' ? 'Echipe' : 'Top Fragger'}
                      </button>
                    ))}
                  </div>

                  {/* ECHIPE tab */}
                  {activeTab === 'echipe' && (
                    <div style={{ padding: '0 14px 14px' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                        {(['team_a', 'team_b'] as const).map((side) => {
                          const label = side === 'team_a' ? sm.team_a : sm.team_b
                          const isLocalSel = localTeam === side
                          const isPlaced = !localTeam && bet?.predicted_winner === side
                          const highlight = isLocalSel || isPlaced
                          return (
                            <button
                              key={side}
                              disabled={isPending}
                              onClick={() => setTeamSelection((prev) => ({ ...prev, [sm.id]: side }))}
                              style={{
                                flex: 1, padding: '10px 8px', borderRadius: '8px',
                                border: highlight ? '2px solid #C62828' : '2px solid #e0e0e0',
                                background: highlight ? '#C62828' : '#fff',
                                color: highlight ? '#fff' : '#1a1a1a',
                                fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                                transition: 'all 0.15s',
                              }}
                            >
                              {label}
                              {isPlaced && !localTeam && <span style={{ marginLeft: '6px' }}>✓</span>}
                            </button>
                          )
                        })}
                      </div>
                      {/* Buton Parieaza / Salveaza */}
                      {localTeam && (
                        <button
                          disabled={isPending}
                          onClick={() => {
                            if (bet) {
                              changeBet.mutate({ bet_id: bet.id, scheduled_match_id: sm.id, predicted_winner: localTeam })
                            } else {
                              placeBet.mutate({ scheduled_match_id: sm.id, predicted_winner: localTeam })
                            }
                          }}
                          style={{
                            width: '100%', padding: '11px', borderRadius: '8px', border: 'none',
                            background: '#FDD835', color: '#000', fontWeight: 800, fontSize: '14px',
                            cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.7 : 1,
                            transition: 'all 0.15s',
                          }}
                        >
                          {isPending ? 'Se trimite...' : bet ? 'Salveaza modificarea' : 'Parieaza'}
                        </button>
                      )}
                      {bet && !localTeam && (
                        <p style={{ fontSize: '11px', color: '#999', textAlign: 'center', marginTop: '4px' }}>
                          Pariul tau: <strong>{bet.predicted_winner === 'team_a' ? sm.team_a : sm.team_b}</strong> • +3 castig / +0 pierdere
                        </p>
                      )}
                    </div>
                  )}

                  {/* JUCATORI tab */}
                  {activeTab === 'jucatori' && (
                    <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {matchPlayers.length === 0 && (
                        <p style={{ fontSize: '12px', color: '#999', textAlign: 'center', padding: '12px 0' }}>
                          Niciun jucator cu echipa setata pentru acest meci.
                        </p>
                      )}
                      {matchPlayers.map((p) => {
                        const odds = calcOdds(p.kd_ratio, p.win_rate, p.adr)
                        const isLocalSel = localPlayer === p.id
                        const isPlaced = !localPlayer && playerBet?.predicted_player_id === p.id
                        const highlight = isLocalSel || isPlaced
                        return (
                          <button
                            key={p.id}
                            disabled={isPlayerPending}
                            onClick={() => setPlayerSelection((prev) => ({ ...prev, [sm.id]: p.id }))}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '9px 12px', borderRadius: '8px', cursor: 'pointer',
                              border: highlight ? '2px solid #C62828' : '2px solid #e8e8e8',
                              background: highlight ? '#fff5f5' : '#fafafa',
                              transition: 'all 0.15s', textAlign: 'left',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {p.avatar_url ? (
                                <img src={p.avatar_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#666' }}>
                                  {(p.real_name || p.steam_nickname).charAt(0)}
                                </div>
                              )}
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: highlight ? '#C62828' : '#1a1a1a', lineHeight: 1.2 }}>
                                  {p.real_name || p.steam_nickname}
                                  {isPlaced && !localPlayer && <span style={{ marginLeft: '6px' }}>✓</span>}
                                </div>
                                <div style={{ fontSize: '11px', color: '#999', marginTop: '1px' }}>{p.team_name} • KD {p.kd_ratio.toFixed(2)}</div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '15px', fontWeight: 800, color: '#C62828' }}>{odds.toFixed(2)}</div>
                              <div style={{ fontSize: '10px', color: '#bbb' }}>cotă</div>
                            </div>
                          </button>
                        )
                      })}
                      {/* Buton Parieaza / Salveaza */}
                      {localPlayer && (
                        <button
                          disabled={isPlayerPending}
                          onClick={() => {
                            if (playerBet) {
                              changePlayerBet.mutate({ bet_id: playerBet.id, scheduled_match_id: sm.id, predicted_player_id: localPlayer })
                            } else {
                              placePlayerBet.mutate({ scheduled_match_id: sm.id, predicted_player_id: localPlayer })
                            }
                          }}
                          style={{
                            width: '100%', padding: '11px', borderRadius: '8px', border: 'none',
                            background: '#FDD835', color: '#000', fontWeight: 800, fontSize: '14px',
                            cursor: isPlayerPending ? 'not-allowed' : 'pointer', opacity: isPlayerPending ? 0.7 : 1,
                            marginTop: '4px', transition: 'all 0.15s',
                          }}
                        >
                          {isPlayerPending ? 'Se trimite...' : playerBet ? 'Salveaza modificarea' : 'Parieaza'}
                        </button>
                      )}
                      {playerBet && !localPlayer && (
                        <p style={{ fontSize: '11px', color: '#999', textAlign: 'center', marginTop: '4px' }}>
                          Pariul tau: <strong>{playerBet.predicted_player_name || playerBet.predicted_player_nickname}</strong> • +3 corect / +0 gresit
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* TAB: Biletele mele */}
        {tab === 'history' && (() => {
          const teamEntries = (myBets ?? []).map((b) => ({ kind: 'team' as const, key: `team-${b.id}`, ts: b.created_at, data: b }))
          const playerEntries = (myPlayerBets ?? []).map((pb) => ({ kind: 'player' as const, key: `player-${pb.id}`, ts: pb.created_at, data: pb }))
          const all = [...teamEntries, ...playerEntries].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {all.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px 0', color: '#888' }}>
                  <div style={{ fontSize: '13px' }}>Nu ai pariuri inca. Mergi la "Pariuri disponibile".</div>
                </div>
              )}
              {all.map((entry) => {
                if (entry.kind === 'team') {
                  const bet = entry.data
                  const m = bet.match
                  if (!m) return null
                  const isPast = new Date(m.scheduled_at) < now
                  const processed = m.bets_processed
                  const won = processed && bet.predicted_winner === m.winner
                  const lost = processed && bet.predicted_winner !== m.winner
                  const teamName = bet.predicted_winner === 'team_a' ? m.team_a : m.team_b
                  const canDelete = !processed && !isPast
                  return (
                    <div key={entry.key} style={{ background: '#fff', borderRadius: '10px', padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a1a' }}>
                          {m.team_a} <span style={{ color: '#bbb', fontWeight: 400 }}>vs</span> {m.team_b}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                          Echipa: <span style={{ color: '#C62828', fontWeight: 600 }}>{teamName}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#bbb', marginTop: '2px' }}>
                          {new Date(m.scheduled_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                        {!processed && !isPast && <span style={{ fontSize: '12px', background: '#e3f2fd', color: '#1565c0', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>In asteptare</span>}
                        {!processed && isPast && <span style={{ fontSize: '12px', background: '#f5f5f5', color: '#999', padding: '4px 10px', borderRadius: '20px' }}>Se proceseaza</span>}
                        {won && <span style={{ fontSize: '12px', background: '#e8f5e9', color: '#2e7d32', padding: '4px 10px', borderRadius: '20px', fontWeight: 700 }}>+3 puncte</span>}
                        {lost && <span style={{ fontSize: '12px', background: '#fce4ec', color: '#c62828', padding: '4px 10px', borderRadius: '20px' }}>0 puncte</span>}
                        {canDelete && <button disabled={deleteBet.isPending} onClick={() => deleteBet.mutate(bet.id)} style={{ fontSize: '11px', color: '#C62828', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>Sterge biletul</button>}
                      </div>
                    </div>
                  )
                } else {
                  const pb = entry.data
                  const m = pb.match
                  if (!m) return null
                  const isPast = new Date(m.scheduled_at) < now
                  const processed = m.bets_processed
                  const won = processed && pb.points_earned !== null && pb.points_earned > 0
                  const lost = processed && pb.points_earned !== null && pb.points_earned === 0
                  const playerName = pb.predicted_player_name || pb.predicted_player_nickname || 'Jucator'
                  const canDeletePb = !processed && !isPast
                  return (
                    <div key={entry.key} style={{ background: '#fff', borderRadius: '10px', padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a1a' }}>
                          {m.team_a} <span style={{ color: '#bbb', fontWeight: 400 }}>vs</span> {m.team_b}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                          Top Fragger: <span style={{ color: '#C62828', fontWeight: 600 }}>{playerName}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#bbb', marginTop: '2px' }}>
                          {new Date(m.scheduled_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                        {!processed && !isPast && <span style={{ fontSize: '12px', background: '#e3f2fd', color: '#1565c0', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>In asteptare</span>}
                        {!processed && isPast && <span style={{ fontSize: '12px', background: '#f5f5f5', color: '#999', padding: '4px 10px', borderRadius: '20px' }}>Se proceseaza</span>}
                        {won && <span style={{ fontSize: '12px', background: '#e8f5e9', color: '#2e7d32', padding: '4px 10px', borderRadius: '20px', fontWeight: 700 }}>+3 puncte</span>}
                        {lost && <span style={{ fontSize: '12px', background: '#fce4ec', color: '#c62828', padding: '4px 10px', borderRadius: '20px' }}>0 puncte</span>}
                        {canDeletePb && <button disabled={deletePlayerBet.isPending} onClick={() => deletePlayerBet.mutate(pb.id)} style={{ fontSize: '11px', color: '#C62828', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>Sterge biletul</button>}
                      </div>
                    </div>
                  )
                }
              })}
            </div>
          )
        })()}

        {/* TAB: Top Utilizatori */}
        {tab === 'top_users' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {!topUsers || topUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#888' }}>
                <div style={{ fontSize: '13px' }}>Nu exista date inca.</div>
              </div>
            ) : (
              topUsers.map((user, idx) => (
                <div
                  key={user.id}
                  style={{
                    background: '#fff',
                    borderRadius: '10px',
                    padding: '14px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderLeft: idx === 0 ? '4px solid #FFD700' : idx === 1 ? '4px solid #C0C0C0' : idx === 2 ? '4px solid #CD7F32' : '4px solid #e0e0e0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : '#e0e0e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '14px',
                        color: idx < 3 ? '#1a1a1a' : '#666',
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a1a' }}>{user.display_name}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#C62828' }}>{user.points}</div>
                    <div style={{ fontSize: '11px', color: '#999' }}>puncte</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// --- Fortuna window content ---

const TLA_TO_ISO2: Record<string, string> = {
  ALG: 'DZ', ARG: 'AR', AUS: 'AU', AUT: 'AT', BEL: 'BE',
  BIH: 'BA', BRA: 'BR', CAN: 'CA', CIV: 'CI', COD: 'CD',
  COL: 'CO', CPV: 'CV', CRO: 'HR', CUW: 'CW', CZE: 'CZ',
  ECU: 'EC', EGY: 'EG', ENG: 'GB', ESP: 'ES', FRA: 'FR',
  GER: 'DE', GHA: 'GH', HAI: 'HT', IRN: 'IR', IRQ: 'IQ',
  JOR: 'JO', JPN: 'JP', KOR: 'KR', KSA: 'SA', MAR: 'MA',
  MEX: 'MX', NED: 'NL', NOR: 'NO', NZL: 'NZ', PAN: 'PA',
  PAR: 'PY', POR: 'PT', QAT: 'QA', RSA: 'ZA', SCO: 'GB-SCT',
  SEN: 'SN', SUI: 'CH', SWE: 'SE', TUN: 'TN', TUR: 'TR',
  URY: 'UY', USA: 'US', UZB: 'UZ',
}

function teamFlag(tla: string | null): string {
  if (!tla) return '🏳️'
  const iso2 = TLA_TO_ISO2[tla]
  if (!iso2 || iso2.includes('-')) return tla === 'SCO' ? '🏴󠁧󠁢󠁳󠁣󠁴󠁿' : '🏳️'
  return [...iso2.toUpperCase()].map(c =>
    String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0))
  ).join('')
}


const OUTCOME_LABEL: Record<WCOutcome, string> = {
  home_win: '1',
  draw: 'X',
  away_win: '2',
}

const OUTCOME_FULL: Record<WCOutcome, string> = {
  home_win: 'Victorie acasa',
  draw: 'Egal',
  away_win: 'Victorie deplasare',
}

function FortunaContent() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'matches' | 'my'>('matches')
  const [selection, setSelection] = useState<Record<number, WCOutcome>>({})

  const { data: matches = [], isLoading } = useQuery<WorldCupMatch[]>({
    queryKey: ['wc-matches'],
    queryFn: () => api.get('/api/worldcup/matches').then((r) => r.data),
    refetchInterval: 60_000,
  })

  const placeBet = useMutation({
    mutationFn: (vars: { match_id: number; predicted_outcome: WCOutcome }) =>
      api.post('/api/worldcup/bets', vars).then((r) => r.data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['wc-matches'] })
      setSelection((prev) => { const n = { ...prev }; delete n[vars.match_id]; return n })
    },
  })

  const updateBet = useMutation({
    mutationFn: (vars: { bet_id: number; predicted_outcome: WCOutcome }) =>
      api.put(`/api/worldcup/bets/${vars.bet_id}`, { predicted_outcome: vars.predicted_outcome }).then((r) => r.data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['wc-matches'] })
      setSelection((prev) => { const n = { ...prev }; delete n[vars.bet_id]; return n })
    },
  })

  const deleteBet = useMutation({
    mutationFn: (bet_id: number) => api.delete(`/api/worldcup/bets/${bet_id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wc-matches'] }),
  })

  const now = new Date()
  const isLocked = (m: WorldCupMatch) =>
    new Date(m.scheduled_at) <= now || !['SCHEDULED', 'TIMED'].includes(m.status)

  const groups = useMemo(() => {
    const map: Record<string, WorldCupMatch[]> = {}
    for (const m of matches) {
      const key = m.scheduled_at.slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(m)
    }
    return Object.keys(map).sort().map((day) => ({ day, matches: map[day] }))
  }, [matches])

  const myBets = useMemo(() => matches.filter((m) => m.my_bet), [matches])

  // Fortuna modern palette
  const BG     = '#0c0c0c'
  const CARD   = 'rgba(255,255,255,0.03)'
  const GOLD   = '#f5c400'
  const DIM    = '#666'
  const BORDER = 'rgba(255,255,255,0.08)'

  // Gradient border trick via background clip
  const gradientBorder = {
    background: 'linear-gradient(#0c0c0c,#0c0c0c) padding-box, linear-gradient(135deg,#f5c400 0%,#b87800 50%,#f5c400 100%) border-box',
    border: '2px solid transparent',
  }

  const OutcomeBtn = ({ outcome, selected, onClick }: {
    outcome: WCOutcome; selected: boolean; onClick: () => void
  }) => (
    <button onClick={onClick} style={{
      flex: 1, padding: '9px 0', fontWeight: 800, fontSize: 14,
      background: selected
        ? 'linear-gradient(135deg,#f5c400 0%,#d4a000 100%)'
        : 'rgba(255,255,255,0.05)',
      color: selected ? '#111' : '#999',
      border: `1px solid ${selected ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
      borderRadius: 50, cursor: 'pointer', letterSpacing: 1,
      boxShadow: selected ? '0 2px 12px rgba(245,196,0,0.35)' : 'none',
      transition: 'all 0.15s',
    }}>
      {OUTCOME_LABEL[outcome]}
    </button>
  )

  if (isLoading) return (
    <div style={{ background: BG, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD, fontSize: 16, fontWeight: 700 }}>
      Se incarca meciurile...
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: BG, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #b87800 0%, #7a4e00 50%, #3d2800 100%)',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '1px solid rgba(245,196,0,0.15)',
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: 'linear-gradient(135deg,#f5c400,#b87800)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, boxShadow: '0 4px 12px rgba(245,196,0,0.4)',
        }}>⚽</div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18, color: '#fff', letterSpacing: 1 }}>FORTUNA</div>
          <div style={{ fontSize: 11, color: DIM, marginTop: 1 }}>FIFA World Cup 2026 · 104 meciuri</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <span style={{
            background: 'rgba(245,196,0,0.1)', color: GOLD,
            border: '1px solid rgba(245,196,0,0.2)',
            borderRadius: 20, fontSize: 11, fontWeight: 700,
            padding: '4px 12px', letterSpacing: 0.5,
          }}>+3 pct rezultat ghicit</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#0f0f0f', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 16px' }}>
        {([
          { id: 'matches' as const, label: 'Meciuri' },
          { id: 'my'      as const, label: `Biletele mele (${myBets.length})` },
        ]).map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '12px 20px', background: 'transparent', border: 'none',
            borderBottom: tab === id ? `2px solid ${GOLD}` : '2px solid transparent',
            color: tab === id ? '#fff' : DIM,
            fontWeight: tab === id ? 700 : 400, fontSize: 13, cursor: 'pointer',
            letterSpacing: 0.3,
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 48px' }}>

        {/* ── MATCHES TAB ── */}
        {tab === 'matches' && groups.map(({ day, matches: dayMatches }) => {
          const d = new Date(day + 'T12:00:00')
          const isToday = day === new Date().toISOString().slice(0, 10)
          const dayLabel = d.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })
          return (
            <div key={day} style={{ marginBottom: 16 }}>
              {/* Grouped container — gradient border */}
              <div style={{
                ...gradientBorder,
                borderRadius: 16, overflow: 'hidden', marginBottom: 4,
                boxShadow: '0 0 24px rgba(245,196,0,0.08), 0 4px 32px rgba(0,0,0,0.6)',
              }}>
              {/* Day header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px',
                background: isToday
                  ? 'linear-gradient(90deg, rgba(245,196,0,0.12) 0%, rgba(245,196,0,0.03) 100%)'
                  : 'rgba(255,255,255,0.03)',
                borderBottom: '1px solid rgba(245,196,0,0.15)',
              }}>
                <span style={{ fontSize: 15 }}>{isToday ? '⚡' : '📅'}</span>
                <span style={{ color: isToday ? GOLD : '#bbb', fontWeight: 700, fontSize: 13, textTransform: 'capitalize', letterSpacing: 0.3 }}>
                  {dayLabel}
                </span>
                {isToday && (
                  <span style={{
                    background: 'linear-gradient(135deg,#f5c400,#d4a000)', color: '#111',
                    borderRadius: 20, fontSize: 10, padding: '2px 9px', fontWeight: 900, letterSpacing: 0.5,
                  }}>AZI</span>
                )}
                <span style={{ marginLeft: 'auto', color: '#444', fontSize: 11 }}>{dayMatches.length} meciuri</span>
              </div>
              {dayMatches.map((m, midx) => {
                const locked = isLocked(m)
                const hasBet = !!m.my_bet
                const localSel = selection[m.id]
                const activeSel = localSel ?? (hasBet ? m.my_bet!.predicted_outcome : undefined)
                const timeStr = new Date(m.scheduled_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
                const finished = m.status === 'FINISHED'
                const live = m.status === 'IN_PLAY' || m.status === 'PAUSED'

                return (
                  <div key={m.id} style={{
                    background: midx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                    borderTop: midx > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    overflow: 'hidden',
                  }}>
                    {/* Match header bar */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '6px 14px',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      <span style={{ color: '#555', fontSize: 11, letterSpacing: 0.3 }}>
                        {m.group ? `${m.group} · ` : ''}{new Date(m.scheduled_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })} · {timeStr}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {live && <span style={{ background: '#cc0000', color: '#fff', borderRadius: 3, fontSize: 10, padding: '1px 6px', fontWeight: 800, letterSpacing: 1 }}>LIVE</span>}
                        {finished && <span style={{ color: DIM, fontSize: 11, fontWeight: 600 }}>Final</span>}
                        {hasBet && !finished && <span style={{ background: '#2a2000', color: GOLD, borderRadius: 3, fontSize: 10, padding: '1px 6px', fontWeight: 700 }}>BILET PLASAT</span>}
                      </div>
                    </div>

                    {/* Teams + score */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 8 }}>
                      {/* Home */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                        <span style={{ fontSize: 26 }}>{teamFlag(m.home_team_code)}</span>
                        <span style={{
                          fontWeight: 800, fontSize: 14,
                          color: finished && m.result === 'home_win' ? GOLD : '#eee',
                        }}>
                          {m.home_team_code ?? m.home_team}
                        </span>
                      </div>

                      {/* Score / VS */}
                      <div style={{ textAlign: 'center', minWidth: 70 }}>
                        {finished ? (
                          <span style={{ fontWeight: 900, fontSize: 22, color: GOLD, letterSpacing: 2 }}>
                            {m.home_score} - {m.away_score}
                          </span>
                        ) : (
                          <span style={{ fontWeight: 700, fontSize: 16, color: DIM }}>VS</span>
                        )}
                      </div>

                      {/* Away */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                        <span style={{ fontSize: 26 }}>{teamFlag(m.away_team_code)}</span>
                        <span style={{
                          fontWeight: 800, fontSize: 14,
                          color: finished && m.result === 'away_win' ? GOLD : '#eee',
                        }}>
                          {m.away_team_code ?? m.away_team}
                        </span>
                      </div>
                    </div>

                    {/* Bet buttons */}
                    {!locked && (
                      <div style={{ padding: '0 14px 14px' }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: localSel && localSel !== m.my_bet?.predicted_outcome ? 10 : 0 }}>
                          {(['home_win', 'draw', 'away_win'] as WCOutcome[]).filter((o) => o !== 'draw' || m.stage === 'GROUP_STAGE').map((o) => (
                            <OutcomeBtn
                              key={o}
                              outcome={o}
                              selected={activeSel === o}
                              onClick={() => setSelection((prev) => ({ ...prev, [m.id]: o }))}
                            />
                          ))}
                        </div>
                        {localSel && (!hasBet || localSel !== m.my_bet!.predicted_outcome) && (
                          <button
                            onClick={() => hasBet
                              ? updateBet.mutate({ bet_id: m.my_bet!.id, predicted_outcome: localSel })
                              : placeBet.mutate({ match_id: m.id, predicted_outcome: localSel })
                            }
                            disabled={placeBet.isPending || updateBet.isPending}
                            style={{
                              width: '100%', padding: '11px 0',
                              background: 'linear-gradient(135deg,#f5c400 0%,#d4a000 100%)',
                              color: '#111', border: 'none', borderRadius: 50,
                              fontWeight: 900, fontSize: 14, cursor: 'pointer', letterSpacing: 1,
                              boxShadow: '0 4px 20px rgba(245,196,0,0.35)',
                            }}
                          >
                            {hasBet ? 'SALVEAZA' : 'PARIEAZA'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Locked result */}
                    {locked && hasBet && m.my_bet && (
                      <div style={{ padding: '8px 14px 14px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', borderRadius: 50, padding: '5px 18px',
                          fontWeight: 700, fontSize: 12, letterSpacing: 0.5,
                          background: m.my_bet.points_earned === 3
                            ? 'rgba(139,195,74,0.1)' : m.my_bet.points_earned === 0
                            ? 'rgba(239,83,80,0.1)' : 'rgba(245,196,0,0.08)',
                          color: m.my_bet.points_earned === 3 ? '#8bc34a' : m.my_bet.points_earned === 0 ? '#ef5350' : GOLD,
                          border: `1px solid ${m.my_bet.points_earned === 3 ? 'rgba(139,195,74,0.3)' : m.my_bet.points_earned === 0 ? 'rgba(239,83,80,0.3)' : 'rgba(245,196,0,0.2)'}`,
                        }}>
                          {OUTCOME_FULL[m.my_bet.predicted_outcome]}
                          {m.my_bet.points_earned === 3 && '  ✓ +3 pct'}
                          {m.my_bet.points_earned === 0 && '  ✗ +0 pct'}
                          {m.my_bet.points_earned === null && '  · in asteptare'}
                        </span>
                      </div>
                    )}
                    {locked && !hasBet && (
                      <div style={{ padding: '6px 14px 12px', textAlign: 'center', color: '#333', fontSize: 11, letterSpacing: 0.5 }}>
                        pariuri inchise
                      </div>
                    )}
                  </div>
                )
              })}
              </div>{/* end grouped container */}
            </div>
          )
        })}

        {/* ── MY BETS TAB ── */}
        {tab === 'my' && (
          <>
            {myBets.length === 0 && (
              <div style={{ textAlign: 'center', color: DIM, padding: 48, fontSize: 14 }}>
                Nu ai pariuri plasate inca.
              </div>
            )}
            {myBets.map((m) => {
              const locked = isLocked(m)
              const bet = m.my_bet!
              const date = new Date(m.scheduled_at)
              const pts = bet.points_earned
              return (
                <div key={m.id} style={{
                  background: CARD, borderRadius: 10, marginBottom: 8,
                  border: `1px solid ${pts === 3 ? '#3a4a00' : pts === 0 ? '#3a0000' : BORDER}`,
                  overflow: 'hidden',
                }}>
                  <div style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 14, color: '#eee' }}>
                        <span style={{ fontSize: 20 }}>{teamFlag(m.home_team_code)}</span>
                        {m.home_team_code ?? m.home_team}
                        <span style={{ color: '#444' }}>—</span>
                        <span style={{ fontSize: 20 }}>{teamFlag(m.away_team_code)}</span>
                        {m.away_team_code ?? m.away_team}
                      </div>
                      <span style={{ color: DIM, fontSize: 11 }}>
                        {date.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })} {date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        background: '#2a2000', color: GOLD, borderRadius: 6,
                        padding: '3px 12px', fontWeight: 800, fontSize: 13,
                      }}>
                        {OUTCOME_LABEL[bet.predicted_outcome]} — {OUTCOME_FULL[bet.predicted_outcome]}
                      </span>
                      {pts === 3 && <span style={{ color: '#8bc34a', fontWeight: 700, fontSize: 13 }}>✓ +3 pct</span>}
                      {pts === 0 && <span style={{ color: '#ef5350', fontWeight: 700, fontSize: 13 }}>✗ +0 pct</span>}
                      {!locked && (
                        <button
                          onClick={() => deleteBet.mutate(bet.id)}
                          disabled={deleteBet.isPending}
                          style={{
                            marginLeft: 'auto', background: 'transparent', color: '#555',
                            border: '1px solid #333', borderRadius: 6,
                            padding: '3px 10px', fontSize: 11, cursor: 'pointer',
                          }}
                        >
                          Sterge
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}

// --- Admin window content ---

function AdminContent() {
  const qc = useQueryClient()
  const [section, setSection] = useState<AdminSection>('session')

  const { data: session, isLoading: loadingSession } = useQuery<SessionInfo>({
    queryKey: ['admin-session'],
    queryFn: () => api.get('/api/admin/session').then((r) => r.data),
    refetchInterval: 5000,
  })

  const startSession = useMutation({
    mutationFn: () => api.post('/api/admin/session/start').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-session'] }),
  })
  const endSession = useMutation({
    mutationFn: () => api.post('/api/admin/session/end').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-session'] }),
  })

  const { data: users } = useQuery<AdminUserItem[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/api/admin/users').then((r) => r.data),
    enabled: section === 'users',
  })

  const toggleAdmin = useMutation({
    mutationFn: (id: number) => api.post(`/api/admin/users/${id}/toggle-admin`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const { data: logs } = useQuery<LogEntry[]>({
    queryKey: ['admin-logs'],
    queryFn: () => api.get('/api/admin/logs').then((r) => r.data.logs),
    enabled: section === 'logs',
    refetchInterval: section === 'logs' ? 15000 : false,
  })

  const { data: backups } = useQuery<BackupEntry[]>({
    queryKey: ['admin-backups'],
    queryFn: () => api.get('/api/admin/backups').then((r) => r.data),
    enabled: section === 'logs',
  })

  const { data: generalMessageData } = useQuery({
    queryKey: ['admin-general-message'],
    queryFn: () => api.get('/api/admin/general-message').then((r) => r.data.general_message),
    enabled: section === 'general_message',
  })

  const [generalMessageInput, setGeneralMessageInput] = useState('')

  const updateGeneralMessage = useMutation({
    mutationFn: (message: string) => {
      const adminToken = localStorage.getItem('admin_token') ?? ''
      return api.put('/api/admin/general-message', { message }, { headers: { Authorization: `Bearer ${adminToken}` } }).then((r) => r.data.general_message)
    },
    onSuccess: () => {
      setGeneralMessageInput('')
      qc.invalidateQueries({ queryKey: ['admin-general-message'] })
      qc.invalidateQueries({ queryKey: ['general-message'] })
    },
  })

  const [selectedBetLogsUserId, setSelectedBetLogsUserId] = useState<number | null>(null)

  const { data: betLogsUsers } = useQuery<AdminUserItem[]>({
    queryKey: ['bet-logs-users'],
    queryFn: () => api.get('/api/admin/users').then((r) => r.data),
    enabled: section === 'bet_logs',
  })

  const { data: userBets } = useQuery({
    queryKey: ['admin-user-bets', selectedBetLogsUserId],
    queryFn: () => api.get(`/api/admin/users/${selectedBetLogsUserId}/bets`).then((r) => r.data),
    enabled: section === 'bet_logs' && selectedBetLogsUserId !== null,
  })

  const { data: matchesHistory } = useQuery({
    queryKey: ['admin-matches-history'],
    queryFn: () => api.get('/api/admin/matches-history').then((r) => r.data),
    enabled: section === 'matches_history',
  })

  const { data: scheduledAdmin, isLoading: loadingSched } = useQuery<AdminScheduledMatch[]>({
    queryKey: ['admin-scheduled'],
    queryFn: () => api.get('/api/admin/scheduled').then((r) => r.data),
    enabled: section === 'meciuri',
  })

  const createScheduled = useMutation({
    mutationFn: (d: { team_a: string; team_b: string; scheduled_at?: string }) =>
      api.post('/api/admin/scheduled', d).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-scheduled'] }),
  })

  const [randomPending, setRandomPending] = useState(false)
  async function generateRandom() {
    if (!adminTeams || adminTeams.length < 2) return
    setRandomPending(true)
    const shuffled = [...adminTeams].sort(() => Math.random() - 0.5)
    const pairs: [string, string][] = []
    for (let i = 0; i + 1 < shuffled.length; i += 2) pairs.push([shuffled[i], shuffled[i + 1]])
    for (let idx = 0; idx < pairs.length; idx++) {
      const [a, b] = pairs[idx]
      await api.post('/api/admin/scheduled', { team_a: a, team_b: b, bracket_round: 1, bracket_position: idx })
    }
    qc.invalidateQueries({ queryKey: ['admin-scheduled'] })
    setRandomPending(false)
  }

  const deleteScheduled = useMutation({
    mutationFn: (id: number) => api.delete(`/api/admin/scheduled/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-scheduled'] }),
  })

  const updateScheduled = useMutation({
    mutationFn: ({ id, scheduled_at }: { id: number; scheduled_at: string }) =>
      api.put(`/api/admin/scheduled/${id}`, { scheduled_at }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-scheduled'] })
      qc.invalidateQueries({ queryKey: ['scheduled'] })
      setEditingScheduled(null)
    },
  })

  const setResult = useMutation({
    mutationFn: ({ id, winner }: { id: number; winner: string }) =>
      api.post(`/api/admin/scheduled/${id}/result`, { winner }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-scheduled'] })
      qc.invalidateQueries({ queryKey: ['scheduled'] })
      qc.invalidateQueries({ queryKey: ['my-bets'] })
      qc.invalidateQueries({ queryKey: ['my-player-bets'] })
      qc.invalidateQueries({ queryKey: ['bet-leaderboard'] })
    },
  })

  const { data: adminPlayers, isLoading: loadingPlayers } = useQuery<AdminPlayerItem[]>({
    queryKey: ['admin-players'],
    queryFn: () => api.get('/api/admin/players').then((r) => r.data),
    enabled: section === 'players_cs' || section === 'teams_cs',
  })

  const { data: adminTeams } = useQuery<string[]>({
    queryKey: ['admin-teams'],
    queryFn: () => api.get('/api/admin/teams').then((r) => r.data),
    enabled: section === 'players_cs' || section === 'teams_cs' || section === 'meciuri',
  })

  const createPlayer = useMutation({
    mutationFn: (d: { steam_nickname: string; steam_account_id?: string; real_name?: string; team_name?: string }) =>
      api.post('/api/admin/players', d).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-players'] })
      qc.invalidateQueries({ queryKey: ['admin-teams'] })
    },
  })

  const updatePlayer = useMutation({
    mutationFn: ({ id, ...d }: { id: number; real_name?: string; team_name?: string; aliases?: string }) =>
      api.put(`/api/admin/players/${id}`, d).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-players'] })
      qc.invalidateQueries({ queryKey: ['admin-teams'] })
    },
  })

  const deletePlayer = useMutation({
    mutationFn: (id: number) => api.delete(`/api/admin/players/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-players'] })
      qc.invalidateQueries({ queryKey: ['admin-teams'] })
    },
  })

  const createTeam = useMutation({
    mutationFn: (name: string) => api.post('/api/admin/teams', { name }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-teams'] }),
  })

  const deleteTeam = useMutation({
    mutationFn: (name: string) => api.delete(`/api/admin/teams/${encodeURIComponent(name)}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-teams'] }),
  })

  const [newTeamName, setNewTeamName] = useState('')
  const [teamError, setTeamError] = useState('')

  const [schedForm, setSchedForm] = useState({ team_a: '', team_b: '', sched_date: '', sched_hour: '', sched_min: '00' })
  const [editingScheduled, setEditingScheduled] = useState<{ id: number; sched_date: string; sched_hour: string; sched_min: string } | null>(null)
  const [editingPlayer, setEditingPlayer] = useState<{ id: number; real_name: string; team_name: string; aliases: string } | null>(null)
  const [addPlayerForm, setAddPlayerForm] = useState({ steam_nickname: '', steam_account_id: '', real_name: '', team_name: '' })
  const [addPlayerError, setAddPlayerError] = useState('')
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')

  const resetStats = useMutation({
    mutationFn: () => api.delete('/api/admin/reset-stats').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leaderboard'] })
      qc.invalidateQueries({ queryKey: ['admin-players'] })
      setShowResetDialog(false)
      setResetConfirmText('')
    },
  })

  interface DbBackupEntry { filename: string; size_kb: number; created_at: string }
  const { data: dbBackups, refetch: refetchDbBackups } = useQuery<DbBackupEntry[]>({
    queryKey: ['admin-db-backups'],
    queryFn: () => api.get('/api/admin/db/backups').then((r) => r.data),
    enabled: section === 'database',
  })

  const createDbBackup = useMutation({
    mutationFn: () => api.post('/api/admin/db/backup').then((r) => r.data),
    onSuccess: () => refetchDbBackups(),
  })

  const restoreDbBackup = useMutation({
    mutationFn: (filename: string) => api.post(`/api/admin/db/restore/${encodeURIComponent(filename)}`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries(); refetchDbBackups() },
  })

  const navItems: Array<{ key: AdminSection; label: string; icon: string }> = [
    { key: 'session',    label: 'Sesiune Live', icon: '▶' },
    { key: 'meciuri',   label: 'Meciuri',       icon: '📅' },
    { key: 'matches_history', label: 'Istoric Meciuri', icon: '📊' },
    { key: 'players_cs',label: 'Jucatori CS',   icon: '👤' },
    { key: 'teams_cs',  label: 'Echipe CS2',    icon: '🛡️' },
    { key: 'users',     label: 'Utilizatori',   icon: '👥' },
    { key: 'logs',      label: 'Loguri',        icon: '📋' },
    { key: 'bet_logs',  label: 'Loguri Bilete', icon: '🎰' },
    { key: 'database',  label: 'Baza de Date',  icon: '💾' },
    { key: 'general_message', label: 'Mesaj General', icon: '📢' },
  ]

  const XP_SIDEBAR_BTN = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '8px',
    width: '100%', padding: '6px 12px', fontSize: '12px', textAlign: 'left',
    background: active ? 'rgba(255,255,255,0.25)' : 'transparent',
    color: 'white', fontWeight: active ? 'bold' : 'normal',
    cursor: 'pointer', border: 'none',
    borderLeft: active ? '3px solid white' : '3px solid transparent',
  })

  return (
    <div className="flex h-full">
      {/* XP Left sidebar */}
      <div
        className="flex flex-col flex-shrink-0"
        style={{
          width: '180px',
          background: 'linear-gradient(to bottom, #6890d0 0%, #3c68b8 100%)',
          borderRight: '2px solid #1a3c8a',
        }}
      >
        {/* Sidebar header */}
        <div className="px-3 py-2" style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(0,0,0,0.2)' }}>
          <div className="text-white font-bold text-xs uppercase tracking-wider" style={{ fontFamily: 'Trebuchet MS' }}>
            Admin Panel
          </div>
        </div>

        {/* Nav items */}
        <div className="flex flex-col py-2">
          {navItems.map((item) => (
            <button
              key={item.key}
              style={XP_SIDEBAR_BTN(section === item.key)}
              onClick={() => setSection(item.key)}
              onMouseEnter={(e) => { if (section !== item.key) e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
              onMouseLeave={(e) => { if (section !== item.key) e.currentTarget.style.background = 'transparent' }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Session indicator */}
        <div className="mt-auto px-3 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: session?.active ? '#4ade80' : '#6b7280', boxShadow: session?.active ? '0 0 6px #4ade80' : 'none' }}
            />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {session?.active ? 'Sesiune activa' : 'Sesiune inactiva'}
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-4" style={{ background: '#f5f4f0' }}>

        {/* SESSION */}
        {section === 'session' && (
          <div>
            <div className="text-sm font-bold mb-4" style={{ color: '#0a246a', fontFamily: 'Trebuchet MS' }}>
              Control Sesiune Live
            </div>
            {loadingSession ? (
              <div className="text-xs text-gray-700">Se incarca...</div>
            ) : (
              <div>
                {/* Status box */}
                <div
                  className="flex items-center gap-3 p-4 mb-4 rounded"
                  style={{
                    background: session?.active ? '#e8f8e8' : '#f8e8e8',
                    border: `2px solid ${session?.active ? '#4ade80' : '#f87171'}`,
                  }}
                >
                  <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: session?.active ? '#4ade80' : '#f87171' }} />
                  <div>
                    <div className="font-bold text-sm" style={{ color: session?.active ? '#166534' : '#991b1b' }}>
                      {session?.active ? 'Sesiune ACTIVA' : 'Sesiune INACTIVA'}
                    </div>
                    {session?.active && session.started_at && (
                      <div className="text-xs text-gray-800 mt-0.5">
                        Pornita la {new Date(session.started_at).toLocaleTimeString('ro-RO')}
                      </div>
                    )}
                    {!session?.active && (
                      <div className="text-xs text-gray-800 mt-0.5">
                        Statisticile nu se salveaza
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    disabled={session?.active || startSession.isPending}
                    onClick={() => startSession.mutate()}
                    className="px-6 py-2 text-sm font-bold disabled:opacity-40"
                    style={{
                      background: 'linear-gradient(to bottom, #4a9e4a, #2d722d)',
                      border: '2px outset #4a9e4a', color: 'white',
                      textShadow: '1px 1px 1px rgba(0,0,0,0.5)',
                    }}
                  >
                    ▶ START Sesiune
                  </button>
                  <button
                    disabled={!session?.active || endSession.isPending}
                    onClick={() => endSession.mutate()}
                    className="px-6 py-2 text-sm font-bold disabled:opacity-40"
                    style={{
                      background: 'linear-gradient(to bottom, #c04040, #802020)',
                      border: '2px outset #c04040', color: 'white',
                      textShadow: '1px 1px 1px rgba(0,0,0,0.5)',
                    }}
                  >
                    ■ END Sesiune
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MECIURI */}
        {section === 'meciuri' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold" style={{ color: '#0a246a', fontFamily: 'Trebuchet MS' }}>Programare Meciuri</div>
              <button
                disabled={!adminTeams || adminTeams.length < 2 || randomPending}
                onClick={generateRandom}
                className="text-xs px-3 py-1 font-bold disabled:opacity-40 flex items-center gap-1"
                style={{
                  background: 'linear-gradient(to bottom, #2a8a2a, #1a6a1a)',
                  border: '1px outset #2a8a2a', color: 'white',
                }}
                title={`Genereaza ${Math.floor((adminTeams?.length ?? 0) / 2)} meciuri aleatorii din ${adminTeams?.length ?? 0} echipe`}
              >
                🎲 {randomPending ? 'Se genereaza...' : `Random (${Math.floor((adminTeams?.length ?? 0) / 2)} meciuri)`}
              </button>
            </div>

            {/* Form adaugare */}
            <div className="mb-5 p-3 rounded" style={{ background: '#edf2fc', border: '1px solid #c8d4e8' }}>
              <div className="text-xs font-bold mb-2" style={{ color: '#0a246a' }}>Meci nou</div>
              <div className="flex gap-2 flex-wrap">
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: '#111' }}>Echipa A</label>
                  <select
                    className="text-xs px-2 py-1 outline-none"
                    style={{ border: '2px inset #a0b8d8', background: 'white', minWidth: '120px' }}
                    value={schedForm.team_a}
                    onChange={(e) => setSchedForm((f) => ({ ...f, team_a: e.target.value }))}
                  >
                    <option value="">— selecteaza —</option>
                    {adminTeams?.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: '#111' }}>Echipa B</label>
                  <select
                    className="text-xs px-2 py-1 outline-none"
                    style={{ border: '2px inset #a0b8d8', background: 'white', minWidth: '120px' }}
                    value={schedForm.team_b}
                    onChange={(e) => setSchedForm((f) => ({ ...f, team_b: e.target.value }))}
                  >
                    <option value="">— selecteaza —</option>
                    {adminTeams?.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: '#111' }}>Data</label>
                  <input
                    type="date"
                    className="text-xs px-2 py-1 outline-none"
                    style={{ border: '2px inset #a0b8d8', background: 'white', minWidth: '130px' }}
                    value={schedForm.sched_date}
                    onChange={(e) => setSchedForm((f) => ({ ...f, sched_date: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: '#111' }}>Ora</label>
                  <div className="flex gap-1 items-center">
                    <select
                      className="text-xs px-1 py-1 outline-none"
                      style={{ border: '2px inset #a0b8d8', background: 'white', width: '52px' }}
                      value={schedForm.sched_hour}
                      onChange={(e) => setSchedForm((f) => ({ ...f, sched_hour: e.target.value }))}
                    >
                      <option value="">hh</option>
                      {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <span className="text-xs font-bold" style={{ color: '#333' }}>:</span>
                    <select
                      className="text-xs px-1 py-1 outline-none"
                      style={{ border: '2px inset #a0b8d8', background: 'white', width: '52px' }}
                      value={schedForm.sched_min}
                      onChange={(e) => setSchedForm((f) => ({ ...f, sched_min: e.target.value }))}
                    >
                      {['00','05','10','15','20','25','30','35','40','45','50','55'].map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col justify-end">
                  <button
                    disabled={!schedForm.team_a || !schedForm.team_b || !schedForm.sched_date || !schedForm.sched_hour || schedForm.team_a === schedForm.team_b || createScheduled.isPending}
                    onClick={() => {
                      const scheduled_at = `${schedForm.sched_date}T${schedForm.sched_hour}:${schedForm.sched_min}:00`
                      createScheduled.mutate({ team_a: schedForm.team_a, team_b: schedForm.team_b, scheduled_at })
                      setSchedForm({ team_a: '', team_b: '', sched_date: '', sched_hour: '', sched_min: '00' })
                    }}
                    className="px-4 py-1 text-xs font-bold disabled:opacity-40"
                    style={{
                      background: 'linear-gradient(to bottom, #4a6ecc, #2a4eac)',
                      border: '1px outset #4a6ecc', color: 'white',
                    }}
                  >
                    + Adauga
                  </button>
                </div>
              </div>
            </div>

            {/* Lista meciuri */}
            {loadingSched && <div className="text-xs text-gray-700">Se incarca...</div>}
            {!scheduledAdmin?.length && !loadingSched && (
              <div className="text-xs text-gray-700">Niciun meci programat.</div>
            )}
            <div className="space-y-2">
              {scheduledAdmin?.map((sm) => {
                const isPast = sm.scheduled_at ? new Date(sm.scheduled_at) < new Date() : false
                return (
                  <div key={sm.id} className="p-3 rounded" style={{ background: sm.bets_processed ? '#f0f8f0' : '#f5f4f0', border: `1px solid ${sm.bets_processed ? '#86c98e' : '#c8d4e8'}` }}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <div className="font-bold text-sm" style={{ color: '#0a246a' }}>
                          {sm.team_a} <span style={{ color: '#333', fontWeight: 'normal' }}>vs</span> {sm.team_b}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: sm.scheduled_at ? '#333' : '#e65100', fontWeight: sm.scheduled_at ? 'normal' : 600 }}>
                          {sm.scheduled_at
                            ? new Date(sm.scheduled_at).toLocaleString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : '⚠ Data/ora nesetata'}
                        </div>
                        {sm.winner && (
                          <div className="text-xs mt-0.5 font-bold" style={{ color: '#166534' }}>
                            ✓ Castigator: {sm.winner === 'draw' ? 'Egal' : sm.winner === 'team_a' ? sm.team_a : sm.team_b}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {!sm.bets_processed && isPast && (
                          <>
                            {[
                              { val: 'team_a', label: sm.team_a },
                              { val: 'team_b', label: sm.team_b },
                              { val: 'draw',   label: 'Egal' },
                            ].map((opt) => (
                              <button
                                key={opt.val}
                                disabled={setResult.isPending}
                                onClick={() => setResult.mutate({ id: sm.id, winner: opt.val })}
                                className="px-2 py-0.5 text-xs font-bold disabled:opacity-50"
                                style={{ background: 'linear-gradient(to bottom, #4a9e4a, #2d722d)', border: '1px outset #4a9e4a', color: 'white' }}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </>
                        )}
                        {!sm.bets_processed && !isPast && (
                          <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#dbeafe', color: '#1e40af' }}>Viitor</span>
                        )}
                        <button
                          onClick={() => {
                            if (editingScheduled?.id === sm.id) {
                              setEditingScheduled(null)
                            } else {
                              const dt = sm.scheduled_at ? new Date(sm.scheduled_at) : null
                              const pad = (n: number) => String(n).padStart(2, '0')
                              setEditingScheduled({
                                id: sm.id,
                                sched_date: dt ? `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}` : '',
                                sched_hour: dt ? pad(dt.getHours()) : '',
                                sched_min: dt ? pad(Math.floor(dt.getMinutes() / 5) * 5) : '00',
                              })
                            }
                          }}
                          className="px-2 py-0.5 text-xs font-bold"
                          style={{ background: editingScheduled?.id === sm.id ? 'linear-gradient(to bottom, #e0a820, #b07800)' : 'linear-gradient(to bottom, #4a7ec8, #2a50a0)', border: '1px outset #2a50a0', color: 'white' }}
                        >
                          ✏
                        </button>
                        <button
                          disabled={deleteScheduled.isPending}
                          onClick={() => { if (confirm(`Stergi ${sm.team_a} vs ${sm.team_b}?`)) deleteScheduled.mutate(sm.id) }}
                          className="px-2 py-0.5 text-xs font-bold disabled:opacity-50"
                          style={{ background: 'linear-gradient(to bottom, #e06060, #a02020)', border: '1px outset #c04040', color: 'white' }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    {editingScheduled?.id === sm.id && (
                      <div className="mt-2 pt-2 flex flex-wrap gap-2 items-end" style={{ borderTop: '1px dashed #a0b8d8' }}>
                        <div>
                          <div className="text-xs mb-0.5" style={{ color: '#555' }}>Data</div>
                          <input
                            type="date"
                            className="text-xs px-1.5 py-1 outline-none"
                            style={{ border: '2px inset #a0b8d8', background: 'white', minWidth: '130px' }}
                            value={editingScheduled.sched_date}
                            onChange={(e) => setEditingScheduled((s) => s ? { ...s, sched_date: e.target.value } : s)}
                          />
                        </div>
                        <div>
                          <div className="text-xs mb-0.5" style={{ color: '#555' }}>Ora</div>
                          <select
                            className="text-xs px-1 py-1 outline-none"
                            style={{ border: '2px inset #a0b8d8', background: 'white' }}
                            value={editingScheduled.sched_hour}
                            onChange={(e) => setEditingScheduled((s) => s ? { ...s, sched_hour: e.target.value } : s)}
                          >
                            <option value="">--</option>
                            {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <div className="text-xs mb-0.5" style={{ color: '#555' }}>Min</div>
                          <select
                            className="text-xs px-1 py-1 outline-none"
                            style={{ border: '2px inset #a0b8d8', background: 'white' }}
                            value={editingScheduled.sched_min}
                            onChange={(e) => setEditingScheduled((s) => s ? { ...s, sched_min: e.target.value } : s)}
                          >
                            {['00','05','10','15','20','25','30','35','40','45','50','55'].map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          disabled={updateScheduled.isPending || !editingScheduled.sched_date || !editingScheduled.sched_hour}
                          onClick={() => {
                            const scheduled_at = `${editingScheduled.sched_date}T${editingScheduled.sched_hour}:${editingScheduled.sched_min}:00`
                            updateScheduled.mutate({ id: sm.id, scheduled_at })
                          }}
                          className="px-3 py-1 text-xs font-bold disabled:opacity-50"
                          style={{ background: 'linear-gradient(to bottom, #4a9e4a, #2d722d)', border: '1px outset #4a9e4a', color: 'white' }}
                        >
                          {updateScheduled.isPending ? '...' : 'Salveaza'}
                        </button>
                        <button
                          onClick={() => setEditingScheduled(null)}
                          className="px-2 py-1 text-xs font-bold"
                          style={{ background: 'linear-gradient(to bottom, #d0d0d0, #a8a8a8)', border: '1px outset #c0c0c0', color: '#333' }}
                        >
                          Anuleaza
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* JUCATORI CS */}
        {section === 'players_cs' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold" style={{ color: '#0a246a', fontFamily: 'Trebuchet MS' }}>
                Jucatori CS ({adminPlayers?.length ?? 0})
              </div>
              <button
                onClick={() => { setShowResetDialog(true); setResetConfirmText('') }}
                className="px-3 py-1 text-xs font-bold"
                style={{ background: 'linear-gradient(to bottom, #e06060, #a02020)', border: '1px outset #c04040', color: 'white' }}
              >
                ⚠ Sterge toate stats
              </button>
            </div>

            {/* Dialog confirmare reset */}
            {showResetDialog && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/50" onClick={() => { setShowResetDialog(false); setResetConfirmText('') }} />
                <div className="relative p-5 rounded shadow-xl" style={{ background: '#ece9d8', border: '3px solid #0a246a', minWidth: '340px' }}>
                  <div className="text-sm font-bold mb-2" style={{ color: '#991b1b', fontFamily: 'Trebuchet MS' }}>
                    ⚠ Sterge TOATE statisticile
                  </div>
                  <div className="text-xs mb-4" style={{ color: '#333' }}>
                    Aceasta actiune va sterge <strong>toate meciurile si statisticile</strong> tuturor jucatorilor CS2. Nu poate fi anulata.
                    <br /><br />
                    Scrie <strong>DA!</strong> pentru a confirma:
                  </div>
                  <input
                    className="w-full text-sm px-2 py-1.5 mb-3 outline-none"
                    style={{ border: '2px inset #a0b8d8', background: 'white', fontWeight: 'bold' }}
                    placeholder="DA!"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setShowResetDialog(false); setResetConfirmText('') }}
                      className="px-4 py-1 text-xs"
                      style={{ background: 'linear-gradient(to bottom, #d0d0d0, #a8a8a8)', border: '1px outset #888' }}
                    >
                      Anuleaza
                    </button>
                    <button
                      disabled={resetConfirmText !== 'DA!' || resetStats.isPending}
                      onClick={() => resetStats.mutate()}
                      className="px-4 py-1 text-xs font-bold disabled:opacity-40"
                      style={{ background: 'linear-gradient(to bottom, #e06060, #a02020)', border: '1px outset #c04040', color: 'white' }}
                    >
                      {resetStats.isPending ? 'Se sterge...' : 'OK — Sterge tot'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Form adaugare jucator */}
            <div className="mb-4 p-3 rounded" style={{ background: '#edf2fc', border: '1px solid #c8d4e8' }}>
              <div className="text-xs font-bold mb-2" style={{ color: '#0a246a' }}>Adauga jucator nou</div>
              <div className="text-xs mb-2" style={{ color: '#222' }}>
                Nickname = exact cum apare in joc (din fisierul backup). Dupa el se face matching-ul.
              </div>
              <div className="flex gap-2 flex-wrap items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold" style={{ color: '#0a246a' }}>Nickname Steam *</label>
                  <input
                    className="text-xs px-2 py-1 outline-none"
                    style={{ border: '2px inset #a0b8d8', background: 'white', width: '150px' }}
                    placeholder="Patru"
                    value={addPlayerForm.steam_nickname}
                    onChange={(e) => { setAddPlayerForm((f) => ({ ...f, steam_nickname: e.target.value })); setAddPlayerError('') }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: '#111' }}>Nume real (optional)</label>
                  <input
                    className="text-xs px-2 py-1 outline-none"
                    style={{ border: '2px inset #a0b8d8', background: 'white', width: '130px' }}
                    placeholder="Ion Popescu"
                    value={addPlayerForm.real_name}
                    onChange={(e) => setAddPlayerForm((f) => ({ ...f, real_name: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: '#111' }}>Steam ID (optional)</label>
                  <input
                    className="text-xs px-2 py-1 outline-none"
                    style={{ border: '2px inset #a0b8d8', background: 'white', width: '140px' }}
                    placeholder="76561198XXXXXXXXX"
                    value={addPlayerForm.steam_account_id}
                    onChange={(e) => setAddPlayerForm((f) => ({ ...f, steam_account_id: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: '#111' }}>Echipa (optional)</label>
                  <select
                    className="text-xs px-2 py-1 outline-none"
                    style={{ border: '2px inset #a0b8d8', background: 'white', width: '130px' }}
                    value={addPlayerForm.team_name}
                    onChange={(e) => setAddPlayerForm((f) => ({ ...f, team_name: e.target.value }))}
                  >
                    <option value="">— fara echipa —</option>
                    {adminTeams?.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <button
                  disabled={!addPlayerForm.steam_nickname.trim() || createPlayer.isPending}
                  onClick={() => {
                    createPlayer.mutate({
                      steam_nickname: addPlayerForm.steam_nickname.trim(),
                      steam_account_id: addPlayerForm.steam_account_id.trim() || undefined,
                      real_name: addPlayerForm.real_name.trim() || undefined,
                      team_name: addPlayerForm.team_name || undefined,
                    }, {
                      onSuccess: () => setAddPlayerForm({ steam_nickname: '', steam_account_id: '', real_name: '', team_name: '' }),
                      onError: (e: unknown) => {
                        const err = e as { response?: { data?: { detail?: string } } }
                        setAddPlayerError(err?.response?.data?.detail ?? 'Eroare la adaugare')
                      },
                    })
                  }}
                  className="px-4 py-1 text-xs font-bold disabled:opacity-40 self-end"
                  style={{ background: 'linear-gradient(to bottom, #4a6ecc, #2a4eac)', border: '1px outset #4a6ecc', color: 'white' }}
                >
                  {createPlayer.isPending ? '...' : '+ Adauga'}
                </button>
              </div>
              {addPlayerError && (
                <div className="mt-2 text-xs px-2 py-1 rounded" style={{ background: '#ffd0d0', border: '1px solid #c04040', color: '#800000' }}>
                  {addPlayerError}
                </div>
              )}
            </div>

            {loadingPlayers && <div className="text-xs text-gray-700">Se incarca...</div>}
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ background: '#316ac5', color: 'white' }}>
                  <th className="text-left px-2 py-1.5">Steam nick</th>
                  <th className="text-left px-2 py-1.5">Nume real</th>
                  <th className="text-left px-2 py-1.5">Echipa</th>
                  <th className="text-left px-2 py-1.5">Steam ID</th>
                  <th className="text-center px-2 py-1.5">M</th>
                  <th className="px-2 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {adminPlayers?.map((p, i) => {
                  const isEditing = editingPlayer?.id === p.id
                  return (
                    <tr key={p.id} style={{ background: i % 2 === 0 ? '#edf2fc' : 'white', borderBottom: '1px solid #c8d4e8', color: '#111' }}>
                      <td className="px-2 py-1.5 font-mono font-semibold truncate max-w-[110px]">{p.steam_nickname}</td>
                      <td className="px-2 py-1.5">
                        {isEditing ? (
                          <input
                            className="w-full text-xs px-1 py-0.5 outline-none"
                            style={{ border: '1px solid #a0b8d8', background: 'white', color: '#111', minWidth: '90px' }}
                            value={editingPlayer.real_name}
                            onChange={(e) => setEditingPlayer((ep) => ep && { ...ep, real_name: e.target.value })}
                          />
                        ) : (p.real_name || <span style={{ color: '#666' }}>—</span>)}
                      </td>
                      <td className="px-2 py-1.5">
                        {isEditing ? (
                          <select
                            className="text-xs px-1 py-0.5 outline-none w-full"
                            style={{ border: '1px solid #a0b8d8', background: 'white', color: '#111' }}
                            value={editingPlayer.team_name}
                            onChange={(e) => setEditingPlayer((ep) => ep && { ...ep, team_name: e.target.value })}
                          >
                            <option value="">— fara echipa —</option>
                            {adminTeams?.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        ) : (p.team_name || <span style={{ color: '#666' }}>—</span>)}
                      </td>
                      <td className="px-2 py-1.5 font-mono text-xs" style={{ color: '#444' }}>
                        {p.steam_account_id?.startsWith('manual_')
                          ? <span style={{ color: '#888' }}>—</span>
                          : p.steam_account_id || <span style={{ color: '#666' }}>—</span>}
                      </td>
                      <td className="px-2 py-1.5 text-center">{p.matches_played}</td>
                      <td className="px-2 py-1.5 text-center">
                        <div className="flex gap-1 justify-center">
                          {isEditing ? (
                            <>
                              <button
                                disabled={updatePlayer.isPending}
                                onClick={() => {
                                  updatePlayer.mutate({
                                    id: editingPlayer.id,
                                    real_name: editingPlayer.real_name || undefined,
                                    team_name: editingPlayer.team_name || undefined,
                                  })
                                  setEditingPlayer(null)
                                }}
                                className="px-2 py-0.5 text-xs font-bold"
                                style={{ background: 'linear-gradient(to bottom, #4a9e4a, #2d722d)', border: '1px outset #4a9e4a', color: 'white' }}
                              >✓</button>
                              <button
                                onClick={() => setEditingPlayer(null)}
                                className="px-2 py-0.5 text-xs font-bold"
                                style={{ background: 'linear-gradient(to bottom, #d0d0d0, #a8a8a8)', border: '1px outset #aaa', color: '#333' }}
                              >✕</button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditingPlayer({ id: p.id, real_name: p.real_name ?? '', team_name: p.team_name ?? '', aliases: p.aliases ?? '' })}
                                className="px-2 py-0.5 text-xs"
                                style={{ background: 'linear-gradient(to bottom, #4a6ecc, #2a4eac)', border: '1px outset #4a6ecc', color: 'white' }}
                              >✎</button>
                              <button
                                disabled={deletePlayer.isPending}
                                onClick={() => { if (confirm(`Stergi ${p.steam_nickname}?`)) deletePlayer.mutate(p.id) }}
                                className="px-2 py-0.5 text-xs font-bold"
                                style={{ background: 'linear-gradient(to bottom, #e06060, #a02020)', border: '1px outset #c04040', color: 'white' }}
                              >✕</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ECHIPE CS2 */}
        {section === 'teams_cs' && (
          <div>
            <div className="text-sm font-bold mb-3" style={{ color: '#0a246a', fontFamily: 'Trebuchet MS' }}>Echipe CS2</div>

            {/* Formular adaugare echipa */}
            <div className="mb-4 p-3 rounded" style={{ background: '#edf2fc', border: '1px solid #c8d4e8' }}>
              <div className="text-xs font-bold mb-2" style={{ color: '#0a246a' }}>Echipa noua</div>
              <div className="flex gap-2 items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold" style={{ color: '#0a246a' }}>Nume Echipa *</label>
                  <input
                    className="text-xs px-2 py-1 outline-none"
                    style={{ border: '2px inset #a0b8d8', background: 'white', width: '200px' }}
                    placeholder="ex: Wolves"
                    value={newTeamName}
                    onChange={(e) => { setNewTeamName(e.target.value); setTeamError('') }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTeamName.trim()) {
                        createTeam.mutate(newTeamName.trim(), {
                          onSuccess: () => setNewTeamName(''),
                          onError: (err: unknown) => {
                            const e = err as { response?: { data?: { detail?: string } } }
                            setTeamError(e?.response?.data?.detail ?? 'Eroare')
                          },
                        })
                      }
                    }}
                  />
                </div>
                <button
                  disabled={!newTeamName.trim() || createTeam.isPending}
                  onClick={() => createTeam.mutate(newTeamName.trim(), {
                    onSuccess: () => setNewTeamName(''),
                    onError: (err: unknown) => {
                      const e = err as { response?: { data?: { detail?: string } } }
                      setTeamError(e?.response?.data?.detail ?? 'Eroare')
                    },
                  })}
                  className="px-4 py-1 text-xs font-bold disabled:opacity-40"
                  style={{ background: 'linear-gradient(to bottom, #4a6ecc, #2a4eac)', border: '1px outset #4a6ecc', color: 'white' }}
                >
                  {createTeam.isPending ? '...' : '+ Adauga'}
                </button>
              </div>
              {teamError && (
                <div className="mt-2 text-xs px-2 py-1 rounded" style={{ background: '#ffd0d0', border: '1px solid #c04040', color: '#800000' }}>
                  {teamError}
                </div>
              )}
            </div>

            {!adminTeams?.length && (
              <div className="text-xs text-gray-700">Nicio echipa inca.</div>
            )}
            <div className="space-y-3">
              {adminTeams?.map((teamName) => {
                const players = adminPlayers?.filter((p) => p.team_name === teamName) ?? []
                return (
                  <div key={teamName} className="rounded overflow-hidden" style={{ border: '1px solid #c8d4e8' }}>
                    <div className="flex items-center justify-between px-3 py-2" style={{ background: '#316ac5' }}>
                      <span className="font-bold text-sm text-white">
                        🛡️ {teamName} <span style={{ fontWeight: 'normal', fontSize: '11px', opacity: 0.8 }}>({players.length} jucatori)</span>
                      </span>
                      <button
                        disabled={deleteTeam.isPending}
                        onClick={() => { if (confirm(`Stergi echipa "${teamName}"? Jucatorii raman, dar nu mai au echipa.`)) deleteTeam.mutate(teamName) }}
                        className="px-2 py-0.5 text-xs font-bold"
                        style={{ background: 'linear-gradient(to bottom, #e06060, #a02020)', border: '1px outset #c04040', color: 'white' }}
                      >✕ Sterge</button>
                    </div>
                    {players.length > 0 ? (
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr style={{ background: '#dce8fc' }}>
                            <th className="text-left px-3 py-1">Nickname</th>
                            <th className="text-left px-3 py-1">Nume real</th>
                            <th className="text-center px-3 py-1">Meciuri</th>
                            <th className="px-3 py-1" />
                          </tr>
                        </thead>
                        <tbody>
                          {players.map((p, i) => (
                            <tr key={p.id} style={{ background: i % 2 === 0 ? '#f5f8ff' : 'white', borderBottom: '1px solid #e8eef8', color: '#111' }}>
                              <td className="px-3 py-1.5 font-mono">{p.steam_nickname}</td>
                              <td className="px-3 py-1.5">{p.real_name || <span style={{ color: '#666' }}>—</span>}</td>
                              <td className="px-3 py-1.5 text-center">{p.matches_played}</td>
                              <td className="px-3 py-1.5 text-center">
                                <button
                                  onClick={() => { setSection('players_cs'); setEditingPlayer({ id: p.id, real_name: p.real_name ?? '', team_name: p.team_name ?? '', aliases: p.aliases ?? '' }) }}
                                  className="px-2 py-0.5 text-xs"
                                  style={{ background: 'linear-gradient(to bottom, #4a6ecc, #2a4eac)', border: '1px outset #4a6ecc', color: 'white' }}
                                >✎</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="px-3 py-2 text-xs" style={{ color: '#444' }}>
                        Niciun jucator in aceasta echipa. Atribuie din <button className="underline" style={{ color: '#316ac5' }} onClick={() => setSection('players_cs')}>Jucatori CS</button>.
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* USERS */}
        {section === 'users' && (
          <div>
            <div className="text-sm font-bold mb-1" style={{ color: '#0a246a', fontFamily: 'Trebuchet MS' }}>
              Utilizatori inregistrati ({users?.length ?? 0})
            </div>
            <div className="text-xs mb-3" style={{ color: '#555' }}>
              Persoanele care s-au inregistrat si logat pe platforma de pariuri. Nu sunt jucatorii CS2.
            </div>
            {users?.length === 0 && (
              <div className="text-xs p-3 rounded" style={{ background: '#fff3cd', border: '1px solid #ffc107', color: '#856404' }}>
                Niciun utilizator inregistrat inca.
              </div>
            )}
            {users && users.length > 0 && (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ background: '#316ac5', color: 'white' }}>
                    <th className="text-left px-3 py-2">Utilizator</th>
                    <th className="text-left px-3 py-2">Email</th>
                    <th className="text-left px-3 py-2">Inregistrat</th>
                    <th className="text-center px-3 py-2">Puncte</th>
                    <th className="text-center px-3 py-2">Admin</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} style={{ background: i % 2 === 0 ? '#edf2fc' : 'white', borderBottom: '1px solid #c8d4e8' }}>
                      <td className="px-3 py-2 font-semibold text-gray-900">{u.display_name}</td>
                      <td className="px-3 py-2 text-gray-900">{u.email}</td>
                      <td className="px-3 py-2 text-gray-700">
                        {new Date(u.created_at).toLocaleString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-2 text-center font-bold" style={{ color: '#0a246a' }}>{u.points}</td>
                      <td className="px-3 py-2 text-center">
                        {u.is_admin
                          ? <span style={{ color: '#166534', fontWeight: 'bold' }}>✓ Admin</span>
                          : <span style={{ color: '#555' }}>—</span>
                        }
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => toggleAdmin.mutate(u.id)}
                          disabled={toggleAdmin.isPending}
                          className="px-3 py-0.5 text-xs"
                          style={{
                            background: u.is_admin ? 'linear-gradient(to bottom, #e06060, #a02020)' : 'linear-gradient(to bottom, #4a6ecc, #2a4eac)',
                            border: '1px outset #888', color: 'white',
                          }}
                        >
                          {u.is_admin ? 'Revoca admin' : 'Face admin'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* LOGS */}
        {section === 'logs' && <LogsSection logs={logs} backups={backups} onReimport={() => qc.invalidateQueries({ queryKey: ['admin-backups'] })} />}

        {/* LOGS BILETE */}
        {section === 'bet_logs' && <BetLogsSection users={betLogsUsers} selectedUserId={selectedBetLogsUserId} onUserSelect={setSelectedBetLogsUserId} bets={userBets} />}

        {/* ISTORIC MECIURI */}
        {section === 'matches_history' && <MatchesHistorySection matches={matchesHistory} />}

        {section === 'database' && (
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Backup acum */}
            <div style={{ background: '#fff', border: '1px solid #c8d4e8', borderRadius: 6, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0a246a' }}>Backup baza de date</div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Salveaza starea curenta a DB</div>
              </div>
              <button
                disabled={createDbBackup.isPending}
                onClick={() => createDbBackup.mutate()}
                style={{ padding: '5px 14px', fontSize: 12, fontWeight: 700, background: createDbBackup.isPending ? '#aaa' : 'linear-gradient(to bottom, #4a8ce0, #2a6cc0)', color: 'white', border: '1px solid #0a246a', borderRadius: 4, cursor: createDbBackup.isPending ? 'default' : 'pointer' }}
              >
                {createDbBackup.isPending ? 'Se salveaza...' : '💾 Backup acum'}
              </button>
            </div>

            {createDbBackup.isSuccess && (
              <div style={{ background: '#d4edda', border: '1px solid #a3d9a5', borderRadius: 4, padding: '6px 10px', fontSize: 12, color: '#155724' }}>
                Backup creat cu succes.
              </div>
            )}

            {/* Lista backupuri */}
            <div style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: 2 }}>
              Backup-uri disponibile
            </div>

            {dbBackups?.length === 0 && (
              <div style={{ fontSize: 12, color: '#aaa', textAlign: 'center', padding: '16px 0' }}>Niciun backup inca.</div>
            )}

            {dbBackups?.map((b) => (
              <div key={b.filename} style={{ background: '#fff', border: '1px solid #c8d4e8', borderRadius: 6, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0a246a', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.filename}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                    {new Date(b.created_at).toLocaleString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · {b.size_kb} KB
                  </div>
                </div>
                <button
                  disabled={restoreDbBackup.isPending}
                  onClick={() => { if (confirm(`Restaurezi din ${b.filename}? Datele curente vor fi suprascrise.`)) restoreDbBackup.mutate(b.filename) }}
                  style={{ flexShrink: 0, padding: '4px 10px', fontSize: 11, fontWeight: 700, background: 'linear-gradient(to bottom, #e06060, #c02020)', color: 'white', border: '1px solid #800000', borderRadius: 4, cursor: restoreDbBackup.isPending ? 'default' : 'pointer', opacity: restoreDbBackup.isPending ? 0.5 : 1 }}
                >
                  Restaureaza
                </button>
              </div>
            ))}

            {restoreDbBackup.isSuccess && (
              <div style={{ background: '#d4edda', border: '1px solid #a3d9a5', borderRadius: 4, padding: '6px 10px', fontSize: 12, color: '#155724' }}>
                Restaurat cu succes. Reincarca pagina.
              </div>
            )}
          </div>
        )}

        {/* MESAJ GENERAL */}
        {section === 'general_message' && (
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0a246a', marginBottom: 8 }}>Scrie mesaj</div>
              <textarea
                value={generalMessageInput}
                onChange={(e) => setGeneralMessageInput(e.target.value)}
                placeholder="Scrie mesajul pe care vrei sa-l afisezi pe desktop..."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '8px 10px',
                  fontSize: 12,
                  fontFamily: 'Tahoma, sans-serif',
                  border: '1px solid #c8d4e8',
                  borderRadius: 4,
                  background: '#fff',
                }}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  disabled={!generalMessageInput || updateGeneralMessage.isPending}
                  onClick={() => updateGeneralMessage.mutate(generalMessageInput)}
                  style={{
                    padding: '6px 16px',
                    fontSize: 12,
                    fontWeight: 700,
                    background: !generalMessageInput || updateGeneralMessage.isPending ? '#aaa' : 'linear-gradient(to bottom, #4a8ce0, #2a6cc0)',
                    color: 'white',
                    border: '1px solid #0a246a',
                    borderRadius: 4,
                    cursor: !generalMessageInput || updateGeneralMessage.isPending ? 'default' : 'pointer',
                  }}
                >
                  {updateGeneralMessage.isPending ? 'Se salveaza...' : '📢 Salveaza mesaj'}
                </button>
                <button
                  disabled={!generalMessageData || updateGeneralMessage.isPending}
                  onClick={() => updateGeneralMessage.mutate('')}
                  style={{
                    padding: '6px 16px',
                    fontSize: 12,
                    fontWeight: 700,
                    background: !generalMessageData || updateGeneralMessage.isPending ? '#aaa' : 'linear-gradient(to bottom, #e06060, #c02020)',
                    color: 'white',
                    border: '1px solid #800000',
                    borderRadius: 4,
                    cursor: !generalMessageData || updateGeneralMessage.isPending ? 'default' : 'pointer',
                  }}
                >
                  🗑️ Sterge mesaj
                </button>
              </div>
            </div>

            {updateGeneralMessage.isSuccess && (
              <div style={{ background: '#d4edda', border: '1px solid #a3d9a5', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#155724', fontWeight: 600 }}>
                ✓ Mesaj salvat cu succes!
              </div>
            )}

            {generalMessageData && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0a246a', marginBottom: 8 }}>Mesaj curent</div>
                <div
                  style={{
                    background: '#fff',
                    border: '2px solid #ffd700',
                    borderRadius: 4,
                    padding: '10px 12px',
                    fontSize: 12,
                    color: '#1a1a1a',
                    minHeight: '50px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {generalMessageData}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// --- Logs + Backups section ---

function LogsSection({ logs, backups, onReimport }: { logs: LogEntry[] | undefined; backups: BackupEntry[] | undefined; onReimport: () => void }) {
  const [logsTab, setLogsTab] = React.useState<'activity' | 'backups'>('activity')
  const [reimporting, setReimporting] = React.useState<string | null>(null)
  const [reimportMsg, setReimportMsg] = React.useState<{ file: string; msg: string; ok: boolean } | null>(null)
  const API_BASE = import.meta.env.VITE_API_URL ?? ''
  const token = localStorage.getItem('admin_token') ?? ''

  const doReimport = (filename: string) => {
    setReimporting(filename)
    setReimportMsg(null)
    fetch(`${API_BASE}/api/admin/backups/${encodeURIComponent(filename)}/reimport`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.detail) throw new Error(d.detail)
        setReimportMsg({ file: filename, msg: `Meci #${d.match_id} actualizat: ${d.score} (${d.updated.length} jucatori)`, ok: true })
        onReimport()
      })
      .catch((e) => setReimportMsg({ file: filename, msg: e.message, ok: false }))
      .finally(() => setReimporting(null))
  }

  const actionColor: Record<string, string> = {
    admin_login: '#166534', match_uploaded: '#1e40af',
    session_start: '#065f46', session_end: '#7f1d1d',
    match_deleted: '#991b1b', scheduled_created: '#6b21a8',
    bet_processed: '#78350f', toggle_admin: '#0c4a6e',
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(['activity', 'backups'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setLogsTab(t)}
            className="px-4 py-1.5 text-xs font-bold rounded"
            style={{
              background: logsTab === t ? '#316ac5' : '#d4e0f5',
              color: logsTab === t ? 'white' : '#0a246a',
              border: 'none', cursor: 'pointer',
            }}
          >
            {t === 'activity' ? 'Loguri activitate' : `Backup-uri meciuri${backups ? ` (${backups.length})` : ''}`}
          </button>
        ))}
      </div>

      {logsTab === 'activity' && (
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr style={{ background: '#316ac5', color: 'white' }}>
              <th className="text-left px-3 py-2">Actiune</th>
              <th className="text-left px-3 py-2">Detaliu</th>
              <th className="text-left px-3 py-2">IP</th>
              <th className="text-left px-3 py-2">Data</th>
            </tr>
          </thead>
          <tbody>
            {!logs && (
              <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-500">Se incarca...</td></tr>
            )}
            {logs?.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-500">Niciun log</td></tr>
            )}
            {logs?.map((log, i) => (
              <tr key={log.id} style={{ background: i % 2 === 0 ? '#edf2fc' : 'white', borderBottom: '1px solid #c8d4e8' }}>
                <td className="px-3 py-1.5">
                  <span className="font-bold" style={{ color: actionColor[log.action] ?? '#374151' }}>{log.action}</span>
                </td>
                <td className="px-3 py-1.5 text-gray-900 max-w-xs truncate">{log.detail ?? '—'}</td>
                <td className="px-3 py-1.5 text-gray-700 font-mono">{log.ip_address ?? '—'}</td>
                <td className="px-3 py-1.5 text-gray-800">
                  {new Date(log.created_at).toLocaleString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {logsTab === 'backups' && (
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr style={{ background: '#316ac5', color: 'white' }}>
              <th className="text-left px-3 py-2">Fisier</th>
              <th className="text-left px-3 py-2">Marime</th>
              <th className="text-left px-3 py-2">Data salvare</th>
              <th className="text-left px-3 py-2">Actiuni</th>
            </tr>
          </thead>
          <tbody>
            {!backups && (
              <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-500">Se incarca...</td></tr>
            )}
            {backups?.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-500">Niciun backup inca</td></tr>
            )}
            {backups?.map((b, i) => (
              <tr key={b.filename} style={{ background: i % 2 === 0 ? '#edf2fc' : 'white', borderBottom: '1px solid #c8d4e8' }}>
                <td className="px-3 py-1.5 font-mono text-gray-800">{b.filename}</td>
                <td className="px-3 py-1.5 text-gray-700">{b.size_kb} KB</td>
                <td className="px-3 py-1.5 text-gray-800">
                  {new Date(b.created_at).toLocaleString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-3 py-1.5 flex items-center gap-3">
                  <a
                    href={`${API_BASE}/api/admin/backups/${encodeURIComponent(b.filename)}`}
                    download={b.filename}
                    onClick={(e) => {
                      e.preventDefault()
                      fetch(`${API_BASE}/api/admin/backups/${encodeURIComponent(b.filename)}`, {
                        headers: { Authorization: `Bearer ${token}` },
                      })
                        .then((r) => r.blob())
                        .then((blob) => {
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = b.filename
                          a.click()
                          URL.revokeObjectURL(url)
                        })
                    }}
                    className="font-bold"
                    style={{ color: '#316ac5', textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    Download
                  </a>
                  <button
                    onClick={() => doReimport(b.filename)}
                    disabled={reimporting === b.filename}
                    className="font-bold text-xs px-2 py-0.5 rounded"
                    style={{ background: '#065f46', color: 'white', border: 'none', cursor: 'pointer', opacity: reimporting === b.filename ? 0.6 : 1 }}
                  >
                    {reimporting === b.filename ? '...' : 'Re-import'}
                  </button>
                  {reimportMsg?.file === b.filename && (
                    <span className="text-xs" style={{ color: reimportMsg.ok ? '#166534' : '#991b1b' }}>
                      {reimportMsg.msg}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

interface BetItem {
  id: number
  type: 'team' | 'player'
  match: { id: number | null; team_a: string | null; team_b: string | null; scheduled_at: string | null }
  prediction: string | null
  player?: { id: number | null; steam_nickname: string | null }
  status: 'pending' | 'processed'
  points_earned: number | null
  created_at: string
}

function BetLogsSection({ users, selectedUserId, onUserSelect, bets }: { users: AdminUserItem[] | undefined; selectedUserId: number | null; onUserSelect: (id: number) => void; bets: BetItem[] | undefined }) {
  const selectedUser = users?.find((u) => u.id === selectedUserId)

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ background: '#fff', border: '1px solid #c8d4e8', borderRadius: 6, padding: '12px 14px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0a246a', marginBottom: 8 }}>Selectează utilizator</div>
        <select
          value={selectedUserId ?? ''}
          onChange={(e) => onUserSelect(Number(e.target.value) || 0)}
          style={{
            width: '100%', padding: '6px 10px', fontSize: 12,
            border: '1px solid #c8d4e8', borderRadius: 4,
            fontFamily: 'Trebuchet MS, sans-serif',
          }}
        >
          <option value="">-- Selectează utilizator --</option>
          {users?.sort((a, b) => (a.display_name || a.email).localeCompare(b.display_name || b.email)).map((u) => (
            <option key={u.id} value={u.id}>
              {u.display_name || u.email} ({u.points} pct)
            </option>
          ))}
        </select>
      </div>

      {selectedUser && (
        <div style={{ background: '#edf2fc', border: '1px solid #c8d4e8', borderRadius: 6, padding: '10px 14px' }}>
          <div style={{ fontSize: 11, color: '#666' }}>Utilizator selectat: <span style={{ fontWeight: 700, color: '#0a246a' }}>{selectedUser.display_name || selectedUser.email}</span></div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Puncte totale: <span style={{ fontWeight: 700, color: '#166534' }}>{selectedUser.points}</span> | Bilete puse: <span style={{ fontWeight: 700 }}>{bets?.length ?? 0}</span></div>
        </div>
      )}

      {selectedUserId && (
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr style={{ background: '#316ac5', color: 'white' }}>
              <th className="text-left px-3 py-2">Tip</th>
              <th className="text-left px-3 py-2">Meci / Jucător</th>
              <th className="text-left px-3 py-2">Predicție</th>
              <th className="text-left px-3 py-2">Data</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Puncte</th>
            </tr>
          </thead>
          <tbody>
            {!bets && (
              <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-500">Se incarca...</td></tr>
            )}
            {bets?.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-500">Niciun bilet pentru utilizatorul selectat</td></tr>
            )}
            {bets?.map((bet, i) => {
              const date = new Date(bet.created_at)
              const statusColor = bet.status === 'processed' ? '#166534' : '#b45309'
              return (
                <tr key={bet.id} style={{ background: i % 2 === 0 ? '#edf2fc' : 'white', borderBottom: '1px solid #c8d4e8' }}>
                  <td className="px-3 py-1.5 text-center font-bold" style={{ color: bet.type === 'team' ? '#0a246a' : '#9333ea' }}>
                    {bet.type === 'team' ? '⚽' : '🎯'}
                  </td>
                  <td className="px-3 py-1.5 text-gray-900">
                    {bet.type === 'team' && bet.match ? `${bet.match.team_a} vs ${bet.match.team_b}` : bet.player?.steam_nickname || '—'}
                  </td>
                  <td className="px-3 py-1.5 text-gray-900 font-bold">
                    {bet.type === 'team' && bet.prediction ? (bet.prediction === 'team_a' ? bet.match.team_a : bet.match.team_b) : bet.prediction}
                  </td>
                  <td className="px-3 py-1.5 text-gray-800">
                    {date.toLocaleString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-3 py-1.5" style={{ color: statusColor, fontWeight: 700 }}>
                    {bet.status === 'processed' ? '✓ Procesat' : '⏳ Asteptare'}
                  </td>
                  <td className="px-3 py-1.5 text-gray-900 font-bold" style={{ color: bet.points_earned ? '#166534' : '#999' }}>
                    {bet.points_earned !== null ? `+${bet.points_earned}` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

interface MatchHistoryItem {
  id: number
  team_a: string
  team_b: string
  scheduled_at: string | null
  status: 'scheduled' | 'played'
  winner: string | null
  bets_processed: boolean
  match: { id: number; map: string; rounds_played: number; team1_score: number; team2_score: number; timestamp: string | null } | null
  created_at: string
}

function MatchesHistorySection({ matches }: { matches: MatchHistoryItem[] | undefined }) {
  return (
    <div style={{ padding: '12px' }}>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr style={{ background: '#316ac5', color: 'white' }}>
            <th className="text-left px-3 py-2">Status</th>
            <th className="text-left px-3 py-2">Echipe</th>
            <th className="text-left px-3 py-2">Scor</th>
            <th className="text-left px-3 py-2">Hartă</th>
            <th className="text-left px-3 py-2">Castigator</th>
            <th className="text-left px-3 py-2">Data</th>
            <th className="text-left px-3 py-2">Bilete</th>
          </tr>
        </thead>
        <tbody>
          {!matches && (
            <tr><td colSpan={7} className="px-3 py-4 text-center text-gray-500">Se incarca...</td></tr>
          )}
          {matches?.length === 0 && (
            <tr><td colSpan={7} className="px-3 py-4 text-center text-gray-500">Niciun meci inregistrat</td></tr>
          )}
          {matches?.map((m, i) => {
            const statusIcon = m.status === 'played' ? '✓' : '📅'
            const statusColor = m.status === 'played' ? '#166534' : '#316ac5'
            const date = m.status === 'played' && m.match?.timestamp
              ? new Date(m.match.timestamp).toLocaleString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
              : m.scheduled_at
              ? new Date(m.scheduled_at).toLocaleString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
              : '—'

            const winnerText = m.winner === 'team_a' ? m.team_a : m.winner === 'team_b' ? m.team_b : m.winner === 'draw' ? 'Draw' : '—'
            const winnerColor = m.winner ? '#166534' : '#999'

            return (
              <tr key={m.id} style={{ background: i % 2 === 0 ? '#edf2fc' : 'white', borderBottom: '1px solid #c8d4e8' }}>
                <td className="px-3 py-1.5 text-center font-bold" style={{ color: statusColor }}>
                  {statusIcon} {m.status === 'played' ? 'Jucat' : 'Programat'}
                </td>
                <td className="px-3 py-1.5 text-gray-900 font-bold">
                  {m.team_a} vs {m.team_b}
                </td>
                <td className="px-3 py-1.5 text-gray-900">
                  {m.status === 'played' && m.match ? `${m.match.team1_score}-${m.match.team2_score}` : '—'}
                </td>
                <td className="px-3 py-1.5 text-gray-800">
                  {m.status === 'played' && m.match ? m.match.map : '—'}
                </td>
                <td className="px-3 py-1.5 font-bold" style={{ color: winnerColor }}>
                  {winnerText}
                </td>
                <td className="px-3 py-1.5 text-gray-800 text-xs">
                  {date}
                </td>
                <td className="px-3 py-1.5 text-xs" style={{ color: m.bets_processed ? '#166534' : '#b45309' }}>
                  {m.bets_processed ? '✓ Procesate' : '⏳ In asteptare'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// --- Desktop icon ---

function DesktopIcon({ icon, label, onClick, onContextMenu }: { icon: string; label: string; onClick: () => void; onContextMenu?: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all group w-28"
      style={{ background: 'transparent' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <img src={icon} alt={label} className="w-16 h-16 rounded-xl object-cover drop-shadow-lg" />
      <span
        className="text-xs text-white text-center leading-tight font-medium px-1 py-0.5 rounded"
        style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
      >
        {label}
      </span>
    </button>
  )
}

// --- Main Desktop ---

type WindowId = 'cs2' | 'betting' | 'fortuna' | 'admin' | 'youtube'
interface WinState { open: boolean; minimized: boolean }

export default function Desktop() {
  const navigate = useNavigate()
  const [wins, setWins] = useState<Record<WindowId, WinState>>({
    cs2:     { open: false, minimized: false },
    betting: { open: false, minimized: false },
    fortuna: { open: false, minimized: false },
    admin:   { open: false, minimized: false },
    youtube: { open: false, minimized: false },
  })
  const [user, setUser] = useState<UserInfo | null>(null)
  const [clock, setClock] = useState(new Date())
  const [startOpen, setStartOpen] = useState(false)
  const [ivanMsg, setIvanMsg] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [youtubeModal, setYoutubeModal] = useState(false)
  const [youtubeLink, setYoutubeLink] = useState('')
  const [youtubeInput, setYoutubeInput] = useState('')

  const isAdmin = !!user?.is_admin
  const qc = useQueryClient()

  function openWin(id: WindowId) {
    setWins(prev => ({ ...prev, [id]: { open: true, minimized: false } }))
  }
  function closeWin(id: WindowId) {
    setWins(prev => ({ ...prev, [id]: { open: false, minimized: false } }))
  }
  function minimizeWin(id: WindowId) {
    setWins(prev => ({ ...prev, [id]: { open: true, minimized: true } }))
  }
  function toggleWin(id: WindowId) {
    setWins(prev => {
      const w = prev[id]
      if (!w.open || w.minimized) return { ...prev, [id]: { open: true, minimized: false } }
      return { ...prev, [id]: { open: true, minimized: true } }
    })
  }

  const { data: ytLink } = useQuery({
    queryKey: ['youtube-link'],
    queryFn: () => api.get('/api/admin/youtube-link').then((r) => r.data.youtube_link),
    enabled: true,
  })

  const { data: generalMessage } = useQuery({
    queryKey: ['general-message'],
    queryFn: () => api.get('/api/admin/general-message').then((r) => r.data.general_message),
    refetchInterval: 30000,
  })

  const updateYtLink = useMutation({
    mutationFn: (link: string) => {
      const adminToken = localStorage.getItem('admin_token') ?? ''
      return api.put('/api/admin/youtube-link', { link }, { headers: { Authorization: `Bearer ${adminToken}` } }).then((r) => r.data.youtube_link)
    },
    onSuccess: (data) => {
      setYoutubeLink(data)
      setYoutubeInput('')
      setYoutubeModal(false)
      qc.invalidateQueries({ queryKey: ['youtube-link'] })
    },
  })

  useEffect(() => {
    if (ytLink) setYoutubeLink(ytLink)
  }, [ytLink])

  useEffect(() => {
    const token = localStorage.getItem('user_token')
    if (!token) { navigate('/login', { replace: true }); return }
    api.get('/api/auth/me')
      .then((r) => {
        setUser(r.data)
        if (r.data.is_admin && !localStorage.getItem('admin_token')) {
          api.get('/api/auth/admin-token').then((res) => {
            localStorage.setItem('admin_token', res.data.admin_token)
          }).catch(() => {})
        }
      })
      .catch(() => { localStorage.removeItem('user_token'); navigate('/login', { replace: true }) })
  }, [navigate])

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  function logout() {
    localStorage.removeItem('user_token')
    localStorage.removeItem('admin_token')
    navigate('/login', { replace: true })
  }

  const clockStr = clock.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
  const dateStr = clock.toLocaleDateString('ro-RO', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div className="fixed inset-0 overflow-hidden" style={{
      backgroundImage: 'url(/wallpaper.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>

      {/* General message banner */}
      {generalMessage && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            padding: '12px 16px',
            background: 'linear-gradient(90deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)',
            borderBottom: '3px solid #FF6B00',
            boxShadow: '0 4px 12px rgba(255, 107, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.5)',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#1a1a1a',
            textShadow: '1px 1px 2px rgba(255,255,255,0.7)',
            fontFamily: 'Trebuchet MS, sans-serif',
            letterSpacing: '0.5px',
            animation: 'pulse 2s infinite',
          }}
        >
          📢 {generalMessage}
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.85; } }`}</style>
        </div>
      )}

      {/* Desktop icons */}
      <div className="absolute left-8 flex flex-col gap-2 pt-4" style={{ top: generalMessage ? '80px' : '16px' }}>
        <DesktopIcon icon="/cs2_icon.png" label="CS2 Scoreboard" onClick={() => openWin('cs2')} />
        <DesktopIcon icon="/casapariurilor_icon.jpg" label="Casa Pariurilor" onClick={() => openWin('betting')} />
        <DesktopIcon icon="/Youtube_logo.png" label="YouTube" onClick={() => openWin('youtube')} onContextMenu={(e) => {
          if (isAdmin) {
            e.preventDefault()
            setContextMenu({ x: e.clientX, y: e.clientY })
          }
        }} />
        {window.location.hostname === 'localhost' && (
          <DesktopIcon icon="/ftn_logo.png" label="Fortuna WC2026" onClick={() => openWin('fortuna')} />
        )}
      </div>

      {/* Context menu for YouTube */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
              background: '#ece9d8',
              border: '1px solid #999',
              boxShadow: '2px 2px 8px rgba(0,0,0,0.3)',
              borderRadius: '2px',
            }}
          >
            <button
              onClick={() => {
                setContextMenu(null)
                setYoutubeInput(youtubeLink || '')
                setYoutubeModal(true)
              }}
              className="w-full px-4 py-1.5 text-left text-sm"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#316ac5')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Setează link YouTube
            </button>
          </div>
        </>
      )}

      {/* YouTube link modal */}
      {youtubeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setYoutubeModal(false)} />
          <div
            className="relative flex flex-col"
            style={{ width: 420, background: '#ece9d8', border: '3px solid #0a246a', boxShadow: '6px 6px 20px rgba(0,0,0,0.7)', outline: '2px solid #7aa4e8' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1.5 pl-2 pr-1 flex-shrink-0" style={{ height: 28, background: 'linear-gradient(to bottom, #3070e0 0%, #1c58d0 45%, #1448c0 100%)', borderBottom: '1px solid #0a246a' }}>
              <span className="text-white font-bold text-sm flex-1 select-none" style={{ fontFamily: 'Trebuchet MS' }}>Setează link YouTube</span>
              <button onClick={() => setYoutubeModal(false)} style={{ ...XP_BTN, background: 'linear-gradient(to bottom, #e86060, #c02020)' }}>✕</button>
            </div>
            <div className="flex flex-col gap-3 p-5">
              <label className="text-sm font-semibold" style={{ color: '#0a246a' }}>Link YouTube:</label>
              <input
                type="text"
                value={youtubeInput}
                onChange={(e) => setYoutubeInput(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="px-3 py-2 text-sm"
                style={{ border: '1px solid #a8a8a8', background: 'white', fontFamily: 'Tahoma' }}
              />
              <div className="text-xs" style={{ color: '#666' }}>
                Introdu link-ul YouTube complet (ex: https://www.youtube.com/watch?v=ABC123)
              </div>
            </div>
            <div className="flex justify-end gap-2 px-4 pb-4">
              <button
                onClick={() => setYoutubeModal(false)}
                className="px-6 py-1 text-sm font-bold"
                style={{ background: '#ece9d8', border: '2px outset #a0a0a0', cursor: 'pointer', minWidth: 75 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#d0d8f0')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#ece9d8')}
              >
                Anulează
              </button>
              <button
                onClick={() => youtubeInput && updateYtLink.mutate(youtubeInput)}
                className="px-6 py-1 text-sm font-bold"
                style={{ background: youtubeInput ? '#f5c040' : '#d0d0d0', border: '2px outset #a0a0a0', cursor: youtubeInput ? 'pointer' : 'not-allowed', minWidth: 75 }}
                onMouseEnter={(e) => { if (youtubeInput) e.currentTarget.style.background = '#f5d060' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = youtubeInput ? '#f5c040' : '#d0d0d0' }}
                disabled={!youtubeInput || updateYtLink.isPending}
              >
                Salvează
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ivan popup */}
      {ivanMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIvanMsg(false)} />
          <div
            className="relative flex flex-col"
            style={{ width: 380, background: '#ece9d8', border: '3px solid #0a246a', boxShadow: '6px 6px 20px rgba(0,0,0,0.7)', outline: '2px solid #7aa4e8' }}
          >
            <div className="flex items-center gap-1.5 pl-2 pr-1 flex-shrink-0" style={{ height: 28, background: 'linear-gradient(to bottom, #3070e0 0%, #1c58d0 45%, #1448c0 100%)', borderBottom: '1px solid #0a246a' }}>
              <span style={{ fontSize: 14 }}>⛔</span>
              <span className="text-white font-bold text-sm flex-1 select-none" style={{ fontFamily: 'Trebuchet MS' }}>Acces interzis</span>
              <button onClick={() => setIvanMsg(false)} style={{ ...XP_BTN, background: 'linear-gradient(to bottom, #e86060, #c02020)' }}>✕</button>
            </div>
            <div className="flex items-start gap-4 p-5">
              <span style={{ fontSize: 48, lineHeight: 1 }}>🚫</span>
              <div>
                <div className="font-bold text-sm mb-2" style={{ color: '#0a246a', fontFamily: 'Trebuchet MS' }}>
                  Acces refuzat
                </div>
                <div className="text-sm" style={{ color: '#222', lineHeight: 1.6 }}>
                  Ivan zice ca nu ai voie aici.
                </div>
                <div className="text-xs mt-1" style={{ color: '#666' }}>
                  Cod eroare: IVAN_403_FORBIDDEN
                </div>
              </div>
            </div>
            <div className="flex justify-end px-4 pb-4">
              <button
                onClick={() => setIvanMsg(false)}
                className="px-6 py-1 text-sm font-bold"
                style={{ background: '#ece9d8', border: '2px outset #a0a0a0', cursor: 'pointer', minWidth: 75 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#d0d8f0')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#ece9d8')}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* XP Start Menu */}
      {startOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setStartOpen(false)} />
          <div
            className="absolute z-30 flex flex-col"
            style={{
              bottom: '38px', left: 0,
              width: '420px',
              boxShadow: '4px 0 16px rgba(0,0,0,0.6), 4px 4px 16px rgba(0,0,0,0.5)',
              border: '2px solid #0a246a',
              outline: '1px solid #7aa4e8',
              fontFamily: 'Tahoma, sans-serif',
            }}
          >
            {/* Header — username + avatar */}
            <div
              className="flex items-center gap-3 px-3 py-2 flex-shrink-0"
              style={{
                background: 'linear-gradient(to bottom, #2868dc 0%, #1a54cc 40%, #1448c0 100%)',
                borderBottom: '2px solid #0a246a',
                minHeight: '54px',
              }}
            >
              <div
                className="w-10 h-10 rounded flex items-center justify-center font-black text-xl flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #f09030 0%, #e06010 100%)',
                  border: '2px solid rgba(255,255,255,0.4)',
                  color: 'white', textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                }}
              >
                {user?.display_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <div className="font-bold text-white leading-tight" style={{ fontSize: '14px', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                  {user?.display_name}
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>{user?.points} puncte</div>
              </div>
            </div>

            {/* Body — two panels */}
            <div className="flex flex-1" style={{ minHeight: '320px' }}>

              {/* LEFT panel — programs */}
              <div className="flex flex-col" style={{ width: '210px', background: 'white', borderRight: '1px solid #c8d8f0' }}>
                {/* Pinned apps */}
                <div className="flex-1 py-1">
                  {[
                    { label: 'CS2 Scoreboard', img: '/cs2_icon.png', action: () => { setStartOpen(false); openWin('cs2') } },
                    { label: 'Casa Pariurilor', img: '/casapariurilor_icon.jpg', action: () => { setStartOpen(false); openWin('betting') } },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left"
                      style={{ background: 'transparent', fontSize: '12px', color: '#000' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#316ac5'; e.currentTarget.style.color = 'white' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#000' }}
                    >
                      <img src={item.img} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                      <span className="font-semibold">{item.label}</span>
                    </button>
                  ))}
                </div>

                {/* Separator */}
                <div style={{ height: '1px', background: 'linear-gradient(to right, #e0e8f8, #a0b8e0, #e0e8f8)', margin: '2px 0' }} />

                {/* All Programs */}
                <button
                  className="flex items-center justify-between px-3 py-2 text-left w-full"
                  style={{ background: 'transparent', fontSize: '12px', color: '#000', fontWeight: 'bold' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#316ac5'; e.currentTarget.style.color = 'white' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#000' }}
                  onClick={() => { setStartOpen(false); setIvanMsg(true) }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '16px' }}>📂</span>
                    <span>All Programs</span>
                  </div>
                  <span style={{ fontSize: '10px' }}>▶</span>
                </button>
              </div>

              {/* RIGHT panel — places */}
              <div
                className="flex flex-col flex-1 py-1"
                style={{ background: '#4a80d0' }}
              >
                {[
                  { label: 'Profil', icon: '👤' },
                  { label: 'Documente', icon: '📄' },
                  { label: 'Imagini', icon: '🖼️' },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { setStartOpen(false); setIvanMsg(true) }}
                    className="flex items-center gap-3 px-3 py-1.5 text-left w-full"
                    style={{ background: 'transparent', fontSize: '12px', color: 'white' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#2060b8')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontSize: '20px', width: '24px', textAlign: 'center' }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.25)', margin: '4px 8px' }} />

                {[
                  { label: 'Panou de control', icon: '⚙️', action: () => { setStartOpen(false); setIvanMsg(true) } },
                  ...(isAdmin ? [{ label: 'Admin Panel', icon: '🛡️', action: () => { setStartOpen(false); openWin('admin') } }] : []),
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="flex items-center gap-3 px-3 py-1.5 text-left w-full"
                    style={{ background: 'transparent', fontSize: '12px', color: 'white' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#2060b8')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontSize: '20px', width: '24px', textAlign: 'center' }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer — Log Off / Turn Off */}
            <div
              className="flex items-center justify-end gap-2 px-3 py-2 flex-shrink-0"
              style={{
                background: 'linear-gradient(to bottom, #1448c0 0%, #0e3aac 100%)',
                borderTop: '2px solid #0a246a',
              }}
            >
              {[
                { label: 'Log Off', icon: '🚪', action: logout },
                { label: 'Turn Off', icon: '⏻', action: logout },
              ].map((btn) => (
                <button
                  key={btn.label}
                  onClick={btn.action}
                  className="flex items-center gap-1.5 px-3 py-1 text-white"
                  style={{
                    fontSize: '11px', fontWeight: 'bold',
                    background: 'linear-gradient(to bottom, #4878d8, #2858c0)',
                    border: '1px solid #0a2898',
                    boxShadow: '1px 1px 0 rgba(255,255,255,0.2) inset',
                    textShadow: '1px 1px 1px rgba(0,0,0,0.4)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'linear-gradient(to bottom, #5888e8, #3868d0)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'linear-gradient(to bottom, #4878d8, #2858c0)')}
                >
                  <span>{btn.icon}</span> {btn.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* XP Taskbar */}
      <div
        className="absolute bottom-0 inset-x-0 flex items-stretch z-10"
        style={{
          height: '38px',
          background: 'linear-gradient(to bottom, #3c74d6 0%, #2457c8 8%, #1c4ec4 12%, #1a4bc0 88%, #1540b0 100%)',
          borderTop: '2px solid #5a8fe0',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
        }}
      >
        {/* Start button */}
        <button
          onClick={() => setStartOpen((v) => !v)}
          className="flex items-center gap-1.5 h-full pl-2 pr-5 font-bold italic text-white text-sm select-none flex-shrink-0"
          style={{
            background: startOpen
              ? 'linear-gradient(to bottom, #2d6b2d 0%, #3a853a 50%, #2d6b2d 100%)'
              : 'linear-gradient(to bottom, #62b462 0%, #4a9e4a 30%, #3a8a3a 70%, #2d722d 100%)',
            borderRadius: '0 12px 12px 0',
            marginTop: '-2px',
            height: 'calc(100% + 4px)',
            boxShadow: startOpen
              ? 'inset 2px 2px 4px rgba(0,0,0,0.4)'
              : '2px 0 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            letterSpacing: '0.02em',
            fontSize: '15px',
          }}
          onMouseEnter={(e) => { if (!startOpen) e.currentTarget.style.filter = 'brightness(1.1)' }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = '' }}
        >
          <img src="/windows_xp_logo.png" alt="" className="w-5 h-5 object-contain flex-shrink-0" />
          start
        </button>

        {/* Quick launch separator */}
        <div className="flex items-center mx-1">
          <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.15)', borderLeft: '1px solid rgba(0,0,0,0.25)' }} />
        </div>

        {/* Open window buttons */}
        <div className="flex items-center gap-1 flex-1 px-1 overflow-hidden">
          {([
            { key: 'cs2'     as WindowId, label: 'CS2 Scoreboard',  img: '/cs2_icon.png' },
            { key: 'betting' as WindowId, label: 'Casa Pariurilor', img: '/casapariurilor_icon.jpg' },
            { key: 'youtube' as WindowId, label: 'YouTube',         img: '/Youtube_logo.png' },
            ...(window.location.hostname === 'localhost' ? [{ key: 'fortuna' as WindowId, label: 'Fortuna WC2026',  img: '/ftn_logo.png' }] : []),
            { key: 'admin'   as WindowId, label: 'Admin Panel',     img: '/windows_xp_logo.png' },
          ]).filter(w => wins[w.key].open).map(w => {
            const minimized = wins[w.key].minimized
            return (
              <button
                key={w.key}
                onClick={() => toggleWin(w.key)}
                className="flex items-center gap-2 px-3 h-7 text-xs text-white font-semibold truncate max-w-xs"
                style={{
                  background: minimized ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.35)',
                  border: minimized ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.35)',
                  boxShadow: minimized ? 'none' : 'inset 1px 1px 0 rgba(255,255,255,0.1), inset -1px -1px 0 rgba(0,0,0,0.2)',
                  textShadow: '1px 1px 1px rgba(0,0,0,0.5)',
                }}
              >
                <img src={w.img} alt="" className="w-4 h-4 object-cover rounded-sm flex-shrink-0" />
                {w.label}
              </button>
            )
          })}
        </div>

        {/* System tray */}
        <div
          className="flex items-center px-3 gap-2 flex-shrink-0"
          style={{
            background: 'linear-gradient(to bottom, #1238a8 0%, #1a48c0 50%, #1238a8 100%)',
            borderLeft: '1px solid #0a2878',
            boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.1)',
          }}
        >
          <div className="text-center">
            <div className="text-white font-bold leading-tight" style={{ fontSize: '11px' }}>{clockStr}</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>{dateStr}</div>
          </div>
        </div>
      </div>

      {/* Windows */}
      {wins.cs2.open && (
        <div style={{ display: wins.cs2.minimized ? 'none' : undefined }}>
          <DesktopWindow title="CS2 Scoreboard" imgSrc="/cs2_icon.png" onClose={() => closeWin('cs2')} onMinimize={() => minimizeWin('cs2')}>
            <CS2Content isAdmin={isAdmin} />
          </DesktopWindow>
        </div>
      )}

      {wins.betting.open && (
        <div style={{ display: wins.betting.minimized ? 'none' : undefined }}>
          <DesktopWindow title="Casa Pariurilor" imgSrc="/casapariurilor_icon.jpg" onClose={() => closeWin('betting')} onMinimize={() => minimizeWin('betting')}>
            <BettingContent />
          </DesktopWindow>
        </div>
      )}

      {wins.fortuna.open && (
        <div style={{ display: wins.fortuna.minimized ? 'none' : undefined }}>
          <DesktopWindow title="Fortuna — FIFA World Cup 2026" imgSrc="/ftn_logo.png" onClose={() => closeWin('fortuna')} onMinimize={() => minimizeWin('fortuna')}>
            <FortunaContent />
          </DesktopWindow>
        </div>
      )}

      {wins.admin.open && (
        <div style={{ display: wins.admin.minimized ? 'none' : undefined }}>
          <DesktopWindow title="Admin Panel — CS2 IVAN" imgSrc="/windows_xp_logo.png" onClose={() => closeWin('admin')} onMinimize={() => minimizeWin('admin')}>
            <AdminContent />
          </DesktopWindow>
        </div>
      )}

      {wins.youtube.open && (
        <div style={{ display: wins.youtube.minimized ? 'none' : undefined }}>
          <DesktopWindow title="YouTube" imgSrc="/Youtube_logo.png" onClose={() => closeWin('youtube')} onMinimize={() => minimizeWin('youtube')}>
            <YouTubeContent link={youtubeLink} />
          </DesktopWindow>
        </div>
      )}
    </div>
  )
}
