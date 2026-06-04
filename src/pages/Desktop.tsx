import React, { useState, useEffect, useMemo, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dummyPlayers, dummyTeams, dummyMatches, dummyScheduled, dummyAdminTeams, dummyAdminUsers, dummyLogs, dummyBackups, dummyDbBackups } from '../data/dummyData'
import type { LeaderboardPlayer, ScheduledMatch, MatchPlayer } from '../data/types'
import { api, ensureGuestSession } from '../api/client'

type WCOutcome = 'home_win' | 'away_win' | 'draw'
interface WorldCupMatch {
  id: number
  home_team: string
  away_team: string
  home_team_code: string | null
  away_team_code: string | null
  scheduled_at: string
  stage: string | null
  group: string | null
  status: string
  home_score: number | null
  away_score: number | null
  result: WCOutcome | null
  my_bet: { id: number; predicted_outcome: WCOutcome; points_earned: number | null } | null
}

// ─── XP Window component ───────────────────────────────────────────────────

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

// ─── CS2 Scoreboard content ────────────────────────────────────────────────

const TEAM_PALETTE = [
  { circle: '#4e90d4', border: 'rgba(78,144,212,0.5)', bg: 'rgba(78,144,212,0.08)', text: '#7ab8ff', label: 'rgba(78,144,212,0.25)' },
  { circle: '#c8961e', border: 'rgba(200,150,30,0.5)', bg: 'rgba(200,150,30,0.08)', text: '#f5c040', label: 'rgba(200,150,30,0.25)' },
  { circle: '#5aad5a', border: 'rgba(90,173,90,0.5)',  bg: 'rgba(90,173,90,0.08)',  text: '#80e080', label: 'rgba(90,173,90,0.25)' },
  { circle: '#c44040', border: 'rgba(196,64,64,0.5)',  bg: 'rgba(196,64,64,0.08)',  text: '#ff8888', label: 'rgba(196,64,64,0.25)' },
]

const ROW_BLUE = '#7ab8ff'
const ROW_GOLD = '#f5c040'

function PlayerRow({ p, rank }: { p: LeaderboardPlayer; rank: number }) {
  const nameColor = rank % 2 === 1 ? ROW_BLUE : ROW_GOLD
  return (
    <div
      className="flex items-center select-none transition-colors"
      style={{ background: 'rgba(255,255,255,0.055)', borderBottom: '1px solid rgba(0,0,0,0.35)', marginBottom: '2px', cursor: 'default' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.11)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.055)')}
    >
      <div className="w-8 text-right pr-2 text-xs font-mono flex-shrink-0" style={{ color: 'rgba(255,255,255,0.6)' }}>{rank}</div>
      <div className="w-8 h-8 my-1 mx-2 rounded-sm overflow-hidden flex-shrink-0 flex items-center justify-center text-xs" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
        {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : '?'}
      </div>
      <div className="flex-1 min-w-0 pr-2">
        <div className="text-sm font-bold truncate" style={{ color: nameColor, textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>{p.steam_nickname}</div>
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
      <div className={`w-12 text-center text-sm font-bold flex-shrink-0 ${p.kd_ratio >= 1 ? 'text-green-400' : 'text-red-400'}`}>
        {p.kd_ratio.toFixed(2)}
      </div>
      <div className="w-11 text-center text-sm flex-shrink-0" style={{ color: 'rgba(255,255,255,0.85)' }}>{p.hs_percent.toFixed(0)}%</div>
      <div className="w-12 text-center text-sm flex-shrink-0" style={{ color: 'rgba(255,255,255,0.85)' }}>{p.adr.toFixed(0)}</div>
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
  const match = dummyMatches.find((m) => m.id === matchId)
  if (!match) return <div className="text-center py-16 text-red-400">Meciul nu a fost gasit.</div>

  type MP = MatchPlayer
  const isSpectator = (p: MP) => p.kills === 0 && p.deaths === 0
  const team1 = match.players.filter((p) => p.team === 1 && !isSpectator(p))
  const team2 = match.players.filter((p) => p.team === 2 && !isSpectator(p))
  const t1Won = match.team1_score > match.team2_score
  const t2Won = match.team2_score > match.team1_score
  const date = match.timestamp
    ? new Date(match.timestamp).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  const TeamTable = ({ players, palette }: { players: MP[]; palette: typeof TEAM_PALETTE[0] }) => (
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
      {players.map((p) => (
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
      <button onClick={onBack} className="text-xs mb-4 flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#f5c040')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
        ← Inapoi la meciuri
      </button>

      <div className="flex items-center justify-center gap-10 mb-5 py-4 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)' }}>
        <div className="text-right">
          <div className={`text-5xl font-black ${t1Won ? 'text-green-400' : 'text-red-400'}`}>{match.team1_score}</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-mono uppercase mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{match.map_name}</div>
          <div className="text-xl" style={{ color: 'rgba(255,255,255,0.2)' }}>:</div>
          {date && <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>{date}</div>}
        </div>
        <div className="text-left">
          <div className={`text-5xl font-black ${t2Won ? 'text-green-400' : 'text-red-400'}`}>{match.team2_score}</div>
        </div>
      </div>

      <div className="mb-2 px-1 text-xs font-bold uppercase" style={{ color: TEAM_PALETTE[0].text }}>{match.team1_name}</div>
      <TeamTable players={team1} palette={TEAM_PALETTE[0]} />
      <div className="mb-2 px-1 text-xs font-bold uppercase" style={{ color: TEAM_PALETTE[1].text }}>{match.team2_name}</div>
      <TeamTable players={team2} palette={TEAM_PALETTE[1]} />
    </div>
  )
}

function CS2Content() {
  const [view, setView] = useState<'players' | 'teams' | 'live' | 'meciuri' | 'bracket'>('players')
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null)

  const players = dummyPlayers
  const teams = dummyTeams
  const matches = dummyMatches
  const scheduled = dummyScheduled

  const playersByTeam = useMemo(() => {
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
      <div className="flex items-center gap-0 sticky top-0 z-10" style={{ background: CS2_HEADER_BG, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {([
          ['players', 'Jucatori'],
          ['live',    'Live'],
          ['meciuri', 'Meciuri'],
          ['bracket', 'Bracket'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setView(key); setSelectedMatchId(null) }}
            className="px-6 py-3 text-sm font-semibold transition-colors tracking-wide uppercase flex items-center gap-2"
            style={{
              color: view === key ? '#f5c040' : 'rgba(255,255,255,0.35)',
              letterSpacing: '0.08em',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottomWidth: '2px', borderBottomStyle: 'solid',
              borderBottomColor: view === key ? '#f5c040' : 'transparent',
            }}
          >
            {key === 'live' && (
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }} />
            )}
            {label}
          </button>
        ))}
      </div>

      {/* PLAYERS */}
      {view === 'players' && (
        <>
          <ColHeader />
          {players.map((p, idx) => <PlayerRow key={p.id} p={p} rank={idx + 1} />)}
        </>
      )}

      {/* LIVE */}
      {view === 'live' && (
        <div className="p-4">
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
            <div className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Niciun meci live in acest moment.
            </div>
          </div>
        </div>
      )}

      {/* TEAMS */}
      {view === 'teams' && (
        <>
          {teams.map((t, i) => {
            const palette = TEAM_PALETTE[i % TEAM_PALETTE.length]
            const grp = playersByTeam.get(t.team_name) ?? []
            return (
              <div key={t.team_name} className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', borderLeft: `3px solid ${palette.circle}`, background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                <div className="w-6 text-center font-mono text-sm flex-shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm uppercase tracking-wide truncate" style={{ color: palette.text }}>{t.team_name}</div>
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

      {/* BRACKET */}
      {view === 'bracket' && (() => {
        const bracketMatches = scheduled.filter(sm => sm.bracket_round !== null && sm.bracket_position !== null)

        const CARD_W = 176, CARD_H = 80, SLOT_BASE = 112, CONN_W = 60
        const ROUND_W = CARD_W + CONN_W
        const LABEL_H = 26

        const r1Matches = bracketMatches.filter(sm => sm.bracket_round === 1)
        const r1Size = r1Matches.length > 0 ? Math.max(...r1Matches.map(sm => (sm.bracket_position ?? 0))) + 1 : 2
        const maxRound = Math.ceil(Math.log2(r1Size)) + 1
        const totalH = r1Size * SLOT_BASE
        const totalW = maxRound * ROUND_W - CONN_W

        const matchMap = new Map<string, ScheduledMatch>()
        for (const sm of bracketMatches) matchMap.set(`${sm.bracket_round}-${sm.bracket_position}`, sm)

        const cardPos = (round: number, pos: number) => {
          const r = round - 1
          const slotH = SLOT_BASE * Math.pow(2, r)
          return { top: pos * slotH + (slotH - CARD_H) / 2, left: r * ROUND_W }
        }

        const roundLabel = (_r: number, count: number) => {
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
            const posA = cardPos(round, pos), posB = cardPos(round, pos + 1), posN = cardPos(round + 1, pos >> 1)
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
                  if (!sm) return (
                    <div key={`${round}-${pos}`} style={{ position: 'absolute', top: top + LABEL_H, left, width: CARD_W, height: CARD_H, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.06em' }}>TBD</span>
                    </div>
                  )
                  const wonA = sm.winner === 'team_a', wonB = sm.winner === 'team_b'
                  const dateStr = sm.scheduled_at
                    ? new Date(sm.scheduled_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : sm.winner ? '✓ Terminat' : '— data nesetata —'
                  return (
                    <div key={`${round}-${pos}`} style={{ position: 'absolute', top: top + LABEL_H, left, width: CARD_W, height: CARD_H, background: 'rgba(255,255,255,0.05)', border: sm.winner ? '1px solid rgba(245,192,64,0.5)' : '1px solid rgba(255,255,255,0.12)', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: sm.winner ? '0 0 14px rgba(245,192,64,0.12)' : 'none' }}>
                      <div style={{ padding: '2px 8px', borderBottom: '1px solid rgba(255,255,255,0.07)', textAlign: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.04em' }}>{dateStr}</span>
                      </div>
                      {([
                        { name: sm.team_a, won: wonA, lost: !!sm.winner && !wonA },
                        { name: sm.team_b, won: wonB, lost: !!sm.winner && !wonB },
                      ] as { name: string; won: boolean; lost: boolean }[]).map(({ name, won, lost }, i) => (
                        <div key={i} style={{ flex: 1, padding: '0 10px', display: 'flex', alignItems: 'center', background: won ? 'rgba(245,192,64,0.13)' : 'transparent', borderBottom: i === 0 ? '1px solid rgba(255,255,255,0.06)' : 'none', opacity: lost ? 0.3 : 1 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: won ? '#f5c040' : 'rgba(255,255,255,0.88)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            {won ? '✓ ' : ''}{name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )
      })()}

      {/* MECIURI */}
      {view === 'meciuri' && (
        <div>
          {selectedMatchId ? (
            <InlineMatchDetail matchId={selectedMatchId} onBack={() => setSelectedMatchId(null)} />
          ) : (
            <div className="p-4">
              <div>
                <div className="text-xs uppercase font-bold tracking-wider mb-3 px-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Rezultate</div>
                <div className="space-y-2">
                  {scheduled
                    .filter((sm) => sm.match_id)
                    .slice().sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
                    .map((sm) => {
                      const aWon = sm.winner === 'team_a', bWon = sm.winner === 'team_b'
                      const scoreA = sm.result ? sm.result.team1_score : null
                      const scoreB = sm.result ? sm.result.team2_score : null
                      return (
                        <button key={sm.id}
                          onClick={() => setSelectedMatchId(sm.match_id!)}
                          className="w-full flex items-center justify-between rounded-lg px-4 py-3 text-left"
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
                    .filter((m) => !scheduled.some((sm) => sm.match_id === m.id))
                    .map((m) => (
                      <button key={m.id}
                        onClick={() => setSelectedMatchId(m.id)}
                        className="w-full flex items-center justify-between rounded-lg px-4 py-3 text-left"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(245,192,64,0.35)')}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}>
                        <div className="w-1/3 text-left">
                          <div className="text-sm font-bold text-white truncate">{m.team1_name ?? 'Team 1'}</div>
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
                          <div className="text-sm font-bold text-white truncate">{m.team2_name ?? 'Team 2'}</div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Casa Pariurilor content ───────────────────────────────────────────────

function calcOdds(kd: number, winRate: number, adr: number): number {
  const skill = kd * 0.4 + (winRate / 100) * 0.35 + (adr / 100) * 0.25
  return Math.max(1.10, Math.min(5.00, parseFloat((3.5 / (skill + 0.15)).toFixed(2))))
}

function BettingContent() {
  const [tab, setTab] = useState<'available' | 'history' | 'leaderboard'>('available')
  const [matchBetTab, setMatchBetTab] = useState<Record<number, 'echipe' | 'jucatori'>>({})
  const [teamSelection, setTeamSelection] = useState<Record<number, 'team_a' | 'team_b'>>({})
  const [playerSelection, setPlayerSelection] = useState<Record<number, number>>({})
  const [placedBets, setPlacedBets] = useState<Record<number, { type: 'team' | 'player'; value: string }>>({})

  const now = new Date()
  const upcoming = dummyScheduled.filter((sm) => !sm.winner && new Date(sm.scheduled_at) > now)
  const allPlayers = dummyPlayers

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#B71C1C' }}>
      {/* Header */}
      <div style={{ background: '#C62828', padding: '10px 16px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div className="flex gap-1">
            {([
              { key: 'available' as const, label: 'Pariuri disponibile' },
              { key: 'history' as const, label: `Biletele mele${Object.keys(placedBets).length > 0 ? ` (${Object.keys(placedBets).length})` : ''}` },
              { key: 'leaderboard' as const, label: 'Top Utilizatori' },
            ]).map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)} style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer', background: tab === key ? '#fff' : 'transparent', color: tab === key ? '#B71C1C' : 'rgba(255,255,255,0.75)', transition: 'all 0.15s' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '12px', background: '#f5f5f5', flex: 1, overflowY: 'auto' }}>

        {/* Pariuri disponibile */}
        {tab === 'available' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {upcoming.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#888' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎰</div>
                <div style={{ fontWeight: 600, color: '#444', marginBottom: '4px' }}>Niciun meci disponibil</div>
              </div>
            )}
            {upcoming.map((sm) => {
              const activeTab = matchBetTab[sm.id] ?? 'echipe'
              const dateStr = new Date(sm.scheduled_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
              const localTeam = teamSelection[sm.id]
              const localPlayer = playerSelection[sm.id]
              const placed = placedBets[sm.id]

              const matchPlayers = allPlayers.filter(
                (p) => p.team_name === sm.team_a || p.team_name === sm.team_b
              ).sort((a, b) => calcOdds(a.kd_ratio, a.win_rate, a.adr) - calcOdds(b.kd_ratio, b.win_rate, b.adr))

              return (
                <div key={sm.id} style={{ background: '#fff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}>
                  <div style={{ background: '#C62828', padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12px' }}>{dateStr}</span>
                    {placed ? (
                      <span style={{ background: '#FDD835', color: '#000', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>AI PARIAT</span>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>Deschis</span>
                    )}
                  </div>
                  <div style={{ padding: '12px 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <span style={{ fontWeight: 700, fontSize: '15px', color: '#1a1a1a', flex: 1, textAlign: 'right' }}>{sm.team_a}</span>
                    <span style={{ color: '#999', fontSize: '12px', fontWeight: 600, padding: '3px 8px', background: '#f0f0f0', borderRadius: '6px' }}>VS</span>
                    <span style={{ fontWeight: 700, fontSize: '15px', color: '#1a1a1a', flex: 1, textAlign: 'left' }}>{sm.team_b}</span>
                  </div>

                  {/* Sub-tabs */}
                  <div style={{ display: 'flex', margin: '0 14px 10px', background: '#f0f0f0', borderRadius: '8px', padding: '3px' }}>
                    {(['echipe', 'jucatori'] as const).map((t) => (
                      <button key={t} onClick={() => setMatchBetTab((prev) => ({ ...prev, [sm.id]: t }))}
                        style={{ flex: 1, padding: '6px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', border: 'none', cursor: 'pointer', background: activeTab === t ? '#C62828' : 'transparent', color: activeTab === t ? '#fff' : '#666', transition: 'all 0.15s' }}>
                        {t === 'echipe' ? 'Echipe' : 'Top Fragger'}
                      </button>
                    ))}
                  </div>

                  {/* Echipe tab */}
                  {activeTab === 'echipe' && (
                    <div style={{ padding: '0 14px 14px' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                        {(['team_a', 'team_b'] as const).map((side) => {
                          const label = side === 'team_a' ? sm.team_a : sm.team_b
                          const highlight = localTeam === side || (!localTeam && placed?.type === 'team' && placed.value === side)
                          return (
                            <button key={side} onClick={() => setTeamSelection((prev) => ({ ...prev, [sm.id]: side }))}
                              style={{ flex: 1, padding: '10px 8px', borderRadius: '8px', border: highlight ? '2px solid #C62828' : '2px solid #e0e0e0', background: highlight ? '#C62828' : '#fff', color: highlight ? '#fff' : '#1a1a1a', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s' }}>
                              {label}
                            </button>
                          )
                        })}
                      </div>
                      {localTeam && (
                        <button onClick={() => { setPlacedBets((prev) => ({ ...prev, [sm.id]: { type: 'team', value: localTeam } })); setTeamSelection((prev) => { const n = { ...prev }; delete n[sm.id]; return n }) }}
                          style={{ width: '100%', padding: '11px', borderRadius: '8px', border: 'none', background: '#FDD835', color: '#000', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}>
                          Parieaza
                        </button>
                      )}
                    </div>
                  )}

                  {/* Jucatori tab */}
                  {activeTab === 'jucatori' && (
                    <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {matchPlayers.map((p) => {
                        const odds = calcOdds(p.kd_ratio, p.win_rate, p.adr)
                        const highlight = localPlayer === p.id || (!localPlayer && placed?.type === 'player' && placed.value === String(p.id))
                        return (
                          <button key={p.id} onClick={() => setPlayerSelection((prev) => ({ ...prev, [sm.id]: p.id }))}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: '8px', cursor: 'pointer', border: highlight ? '2px solid #C62828' : '2px solid #e8e8e8', background: highlight ? '#fff5f5' : '#fafafa', transition: 'all 0.15s', textAlign: 'left' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#666' }}>
                                {(p.real_name || p.steam_nickname).charAt(0)}
                              </div>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: highlight ? '#C62828' : '#1a1a1a', lineHeight: 1.2 }}>{p.real_name || p.steam_nickname}</div>
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
                      {localPlayer && (
                        <button onClick={() => { setPlacedBets((prev) => ({ ...prev, [sm.id]: { type: 'player', value: String(localPlayer) } })); setPlayerSelection((prev) => { const n = { ...prev }; delete n[sm.id]; return n }) }}
                          style={{ width: '100%', padding: '11px', borderRadius: '8px', border: 'none', background: '#FDD835', color: '#000', fontWeight: 800, fontSize: '14px', cursor: 'pointer', marginTop: '4px' }}>
                          Parieaza
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Biletele mele */}
        {tab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.keys(placedBets).length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#888' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎫</div>
                <div style={{ fontWeight: 600, color: '#444', marginBottom: '4px' }}>Niciun pariu plasat</div>
                <div style={{ fontSize: '13px' }}>Pariurile tale apar dupa ce pariezi pe meciuri.</div>
              </div>
            )}
            {Object.entries(placedBets).map(([smId, bet]) => {
              const sm = dummyScheduled.find((s) => s.id === Number(smId))
              if (!sm) return null
              const label = bet.type === 'team'
                ? (bet.value === 'team_a' ? sm.team_a : sm.team_b)
                : dummyPlayers.find((p) => p.id === Number(bet.value))?.real_name ?? dummyPlayers.find((p) => p.id === Number(bet.value))?.steam_nickname ?? '—'
              return (
                <div key={smId} style={{ background: '#fff', borderRadius: '10px', padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a1a', marginBottom: 2 }}>{sm.team_a} vs {sm.team_b}</div>
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      {new Date(sm.scheduled_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: '#FDD835', color: '#000', fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>{label}</span>
                    <button onClick={() => setPlacedBets((prev) => { const n = { ...prev }; delete n[Number(smId)]; return n })} style={{ fontSize: '11px', color: '#999', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>✕</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Clasament pariuri */}
        {tab === 'leaderboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {dummyPlayers.map((p, idx) => {
              const bet = { points: [87, 74, 61, 48, 33, 21][idx] ?? 10, total: [28, 25, 22, 20, 18, 15][idx] ?? 10, won: [19, 16, 13, 10, 8, 5][idx] ?? 5 }
              return (
                <div key={p.id} style={{ background: '#fff', borderRadius: '10px', padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontWeight: 900, fontSize: '18px', color: idx === 0 ? '#f5c040' : idx === 1 ? '#9e9e9e' : idx === 2 ? '#cd7f32' : '#bbb', width: 28, textAlign: 'center' }}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a1a' }}>{p.real_name || p.steam_nickname}</div>
                      <div style={{ fontSize: '11px', color: '#999' }}>{bet.won}/{bet.total} castigate</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#C62828' }}>{bet.points}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Fortuna content ───────────────────────────────────────────────────────

const TLA_TO_ISO2: Record<string, string> = {
  ALG: 'DZ', ARG: 'AR', AUS: 'AU', AUT: 'AT', BEL: 'BE', BIH: 'BA', BRA: 'BR',
  CAN: 'CA', CIV: 'CI', COD: 'CD', COL: 'CO', CPV: 'CV', CRO: 'HR', CUW: 'CW', CZE: 'CZ',
  ECU: 'EC', EGY: 'EG', ENG: 'GB', ESP: 'ES', FRA: 'FR', GER: 'DE', GHA: 'GH',
  HAI: 'HT', IRN: 'IR', IRQ: 'IQ', JOR: 'JO', JPN: 'JP', KOR: 'KR', KSA: 'SA', MAR: 'MA',
  MEX: 'MX', NED: 'NL', NOR: 'NO', NZL: 'NZ', PAN: 'PA', PAR: 'PY', POR: 'PT',
  QAT: 'QA', RSA: 'ZA', SEN: 'SN', SUI: 'CH', SWE: 'SE', TUN: 'TN', TUR: 'TR',
  URY: 'UY', USA: 'US', UZB: 'UZ',
}

function teamFlag(tla: string | null): string {
  if (!tla) return '🏳️'
  const iso2 = TLA_TO_ISO2[tla]
  if (!iso2 || iso2.includes('-')) return '🏳️'
  return [...iso2.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0))).join('')
}

const OUTCOME_LABEL: Record<WCOutcome, string> = { home_win: '1', draw: 'X', away_win: '2' }
const OUTCOME_FULL: Record<WCOutcome, string> = { home_win: 'Victorie acasa', draw: 'Egal', away_win: 'Victorie deplasare' }

function FortunaContent() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'matches' | 'my'>('matches')
  const [selection, setSelection] = useState<Record<number, WCOutcome>>({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ensureGuestSession().then(() => setReady(true))
  }, [])

  const { data: matches = [], isLoading } = useQuery<WorldCupMatch[]>({
    queryKey: ['wc-matches'],
    queryFn: () => api.get('/api/worldcup/matches').then((r) => r.data),
    enabled: ready,
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wc-matches'] }),
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

  const BG = '#0c0c0c', GOLD = '#f5c400', DIM = '#666', BORDER = 'rgba(255,255,255,0.08)'
  const gradientBorder = {
    background: 'linear-gradient(#0c0c0c,#0c0c0c) padding-box, linear-gradient(135deg,#f5c400 0%,#b87800 50%,#f5c400 100%) border-box',
    border: '2px solid transparent',
  }

  const OutcomeBtn = ({ outcome, selected, onClick }: { outcome: WCOutcome; selected: boolean; onClick: () => void }) => (
    <button onClick={onClick} style={{
      flex: 1, padding: '9px 0', fontWeight: 800, fontSize: 14,
      background: selected ? 'linear-gradient(135deg,#f5c400 0%,#d4a000 100%)' : 'rgba(255,255,255,0.05)',
      color: selected ? '#111' : '#999',
      border: `1px solid ${selected ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
      borderRadius: 50, cursor: 'pointer', letterSpacing: 1,
      boxShadow: selected ? '0 2px 12px rgba(245,196,0,0.35)' : 'none',
      transition: 'all 0.15s',
    }}>
      {OUTCOME_LABEL[outcome]}
    </button>
  )

  if (isLoading || !ready) return (
    <div style={{ background: BG, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: GOLD, fontSize: 16, fontWeight: 700 }}>
      Se incarca meciurile...
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: BG, fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #b87800 0%, #7a4e00 50%, #3d2800 100%)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(245,196,0,0.15)' }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#f5c400,#b87800)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 4px 12px rgba(245,196,0,0.4)' }}>⚽</div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18, color: '#fff', letterSpacing: 1 }}>FORTUNA</div>
          <div style={{ fontSize: 11, color: DIM, marginTop: 1 }}>FIFA World Cup 2026 · 104 meciuri</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ background: 'rgba(245,196,0,0.1)', color: GOLD, border: '1px solid rgba(245,196,0,0.2)', borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '4px 12px', letterSpacing: 0.5 }}>+3 pct rezultat ghicit</span>
          <span style={{ fontSize: 10, color: '#555' }}>portofoliu demo — date reale WC2026</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#0f0f0f', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 16px' }}>
        {([{ id: 'matches' as const, label: 'Meciuri' }, { id: 'my' as const, label: `Biletele mele (${myBets.length})` }]).map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: '12px 20px', background: 'transparent', border: 'none', borderBottom: tab === id ? `2px solid ${GOLD}` : '2px solid transparent', color: tab === id ? '#fff' : DIM, fontWeight: tab === id ? 700 : 400, fontSize: 13, cursor: 'pointer', letterSpacing: 0.3 }}>
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 48px' }}>
        {tab === 'matches' && groups.length === 0 && (
          <div style={{ textAlign: 'center', color: DIM, padding: 48, fontSize: 14 }}>
            Niciun meci disponibil momentan.
          </div>
        )}
        {tab === 'matches' && groups.map(({ day, matches: dayMatches }) => {
          const d = new Date(day + 'T12:00:00')
          const isToday = day === new Date().toISOString().slice(0, 10)
          const dayLabel = d.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })
          return (
            <div key={day} style={{ marginBottom: 16 }}>
              <div style={{ ...gradientBorder, borderRadius: 16, overflow: 'hidden', marginBottom: 4, boxShadow: '0 0 24px rgba(245,196,0,0.08), 0 4px 32px rgba(0,0,0,0.6)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: isToday ? 'linear-gradient(90deg, rgba(245,196,0,0.12) 0%, rgba(245,196,0,0.03) 100%)' : 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(245,196,0,0.15)' }}>
                  <span style={{ fontSize: 15 }}>{isToday ? '⚡' : '📅'}</span>
                  <span style={{ color: isToday ? GOLD : '#bbb', fontWeight: 700, fontSize: 13, textTransform: 'capitalize', letterSpacing: 0.3 }}>{dayLabel}</span>
                  {isToday && <span style={{ background: 'linear-gradient(135deg,#f5c400,#d4a000)', color: '#111', borderRadius: 20, fontSize: 10, padding: '2px 9px', fontWeight: 900 }}>AZI</span>}
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
                    <div key={m.id} style={{ background: midx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', borderTop: midx > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ color: '#555', fontSize: 11, letterSpacing: 0.3 }}>
                          {m.group ? `${m.group} · ` : ''}{new Date(m.scheduled_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })} · {timeStr}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {live && <span style={{ background: '#cc0000', color: '#fff', borderRadius: 3, fontSize: 10, padding: '1px 6px', fontWeight: 800, letterSpacing: 1 }}>LIVE</span>}
                          {finished && <span style={{ color: DIM, fontSize: 11, fontWeight: 600 }}>Final</span>}
                          {hasBet && !finished && <span style={{ background: '#2a2000', color: GOLD, borderRadius: 3, fontSize: 10, padding: '1px 6px', fontWeight: 700 }}>BILET PLASAT</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 8 }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                          <span style={{ fontSize: 26 }}>{teamFlag(m.home_team_code)}</span>
                          <span style={{ fontWeight: 800, fontSize: 14, color: finished && m.result === 'home_win' ? GOLD : '#eee' }}>{m.home_team_code ?? m.home_team}</span>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: 70 }}>
                          {finished ? (
                            <span style={{ fontWeight: 900, fontSize: 22, color: GOLD, letterSpacing: 2 }}>{m.home_score} - {m.away_score}</span>
                          ) : (
                            <span style={{ fontWeight: 700, fontSize: 16, color: DIM }}>VS</span>
                          )}
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                          <span style={{ fontSize: 26 }}>{teamFlag(m.away_team_code)}</span>
                          <span style={{ fontWeight: 800, fontSize: 14, color: finished && m.result === 'away_win' ? GOLD : '#eee' }}>{m.away_team_code ?? m.away_team}</span>
                        </div>
                      </div>
                      {!locked && (
                        <div style={{ padding: '0 14px 14px' }}>
                          <div style={{ display: 'flex', gap: 8, marginBottom: localSel && localSel !== m.my_bet?.predicted_outcome ? 10 : 0 }}>
                            {(['home_win', 'draw', 'away_win'] as WCOutcome[]).filter((o) => o !== 'draw' || m.stage === 'GROUP_STAGE').map((o) => (
                              <OutcomeBtn key={o} outcome={o} selected={activeSel === o} onClick={() => setSelection((prev) => ({ ...prev, [m.id]: o }))} />
                            ))}
                          </div>
                          {localSel && (!hasBet || localSel !== m.my_bet!.predicted_outcome) && (
                            <button
                              onClick={() => hasBet
                                ? updateBet.mutate({ bet_id: m.my_bet!.id, predicted_outcome: localSel })
                                : placeBet.mutate({ match_id: m.id, predicted_outcome: localSel })
                              }
                              disabled={placeBet.isPending || updateBet.isPending}
                              style={{ width: '100%', padding: '11px 0', background: 'linear-gradient(135deg,#f5c400 0%,#d4a000 100%)', color: '#111', border: 'none', borderRadius: 50, fontWeight: 900, fontSize: 14, cursor: 'pointer', letterSpacing: 1, boxShadow: '0 4px 20px rgba(245,196,0,0.35)' }}
                            >
                              {hasBet ? 'SALVEAZA' : 'PARIEAZA'}
                            </button>
                          )}
                          {hasBet && !localSel && (
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                              <button onClick={() => deleteBet.mutate(m.my_bet!.id)} disabled={deleteBet.isPending}
                                style={{ fontSize: 11, color: '#555', background: 'none', border: 'none', cursor: 'pointer' }}>
                                Sterge pariul
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {locked && hasBet && m.my_bet && (
                        <div style={{ padding: '8px 14px 14px', textAlign: 'center' }}>
                          <span style={{ display: 'inline-block', borderRadius: 50, padding: '5px 18px', fontWeight: 700, fontSize: 12, letterSpacing: 0.5, background: m.my_bet.points_earned === 3 ? 'rgba(139,195,74,0.1)' : m.my_bet.points_earned === 0 ? 'rgba(239,83,80,0.1)' : 'rgba(245,196,0,0.08)', color: m.my_bet.points_earned === 3 ? '#8bc34a' : m.my_bet.points_earned === 0 ? '#ef5350' : GOLD, border: `1px solid ${m.my_bet.points_earned === 3 ? 'rgba(139,195,74,0.3)' : m.my_bet.points_earned === 0 ? 'rgba(239,83,80,0.3)' : 'rgba(245,196,0,0.2)'}` }}>
                            {OUTCOME_FULL[m.my_bet.predicted_outcome]}
                            {m.my_bet.points_earned === 3 && '  ✓ +3 pct'}
                            {m.my_bet.points_earned === 0 && '  ✗ +0 pct'}
                            {m.my_bet.points_earned === null && '  · in asteptare'}
                          </span>
                        </div>
                      )}
                      {locked && !hasBet && (
                        <div style={{ padding: '6px 14px 12px', textAlign: 'center', color: '#333', fontSize: 11, letterSpacing: 0.5 }}>pariuri inchise</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {tab === 'my' && (
          <>
            {myBets.length === 0 && <div style={{ textAlign: 'center', color: DIM, padding: 48, fontSize: 14 }}>Nu ai pariuri plasate inca.</div>}
            {myBets.map((m) => {
              const bet = m.my_bet!
              const date = new Date(m.scheduled_at)
              const pts = bet.points_earned
              return (
                <div key={m.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, marginBottom: 8, border: `1px solid ${pts === 3 ? '#3a4a00' : pts === 0 ? '#3a0000' : BORDER}`, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 14, color: '#eee' }}>
                        <span style={{ fontSize: 20 }}>{teamFlag(m.home_team_code)}</span>
                        {m.home_team_code ?? m.home_team}
                        <span style={{ color: '#444' }}>—</span>
                        <span style={{ fontSize: 20 }}>{teamFlag(m.away_team_code)}</span>
                        {m.away_team_code ?? m.away_team}
                      </div>
                      <span style={{ color: DIM, fontSize: 11 }}>{date.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })} {date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ background: 'rgba(245,196,0,0.08)', color: GOLD, border: '1px solid rgba(245,196,0,0.2)', borderRadius: 20, fontSize: 11, padding: '3px 12px', fontWeight: 700 }}>
                        {OUTCOME_FULL[bet.predicted_outcome]}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: 14, color: pts === 3 ? '#8bc34a' : pts === 0 ? '#ef5350' : DIM }}>
                        {pts === 3 ? '+3 pct ✓' : pts === 0 ? '+0 pct ✗' : 'in asteptare'}
                      </span>
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

// ─── Admin Panel content ───────────────────────────────────────────────────

type AdminSection = 'session' | 'meciuri' | 'players_cs' | 'teams_cs' | 'users' | 'logs' | 'database'

function AdminContent() {
  const [section, setSection] = useState<AdminSection>('session')

  const navItems: Array<{ key: AdminSection; label: string; icon: string }> = [
    { key: 'session',     label: 'Sesiune Live',  icon: '▶' },
    { key: 'meciuri',    label: 'Meciuri',        icon: '📅' },
    { key: 'players_cs', label: 'Jucatori CS',    icon: '👤' },
    { key: 'teams_cs',   label: 'Echipe CS2',     icon: '🛡️' },
    { key: 'users',      label: 'Utilizatori',    icon: '👥' },
    { key: 'logs',       label: 'Loguri',         icon: '📋' },
    { key: 'database',   label: 'Baza de Date',   icon: '💾' },
  ]

  const XP_SIDEBAR_BTN = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '8px',
    width: '100%', padding: '6px 12px', fontSize: '12px', textAlign: 'left',
    background: active ? 'rgba(255,255,255,0.25)' : 'transparent',
    color: 'white', fontWeight: active ? 'bold' : 'normal',
    cursor: 'pointer', border: 'none',
    borderLeft: active ? '3px solid white' : '3px solid transparent',
  })

  const DemoBtn = ({ label, color = '#4a6ecc' }: { label: string; color?: string }) => (
    <button
      title="Demo — nu se salveaza"
      style={{ padding: '4px 12px', fontSize: '11px', fontWeight: 700, background: `linear-gradient(to bottom, ${color}, ${color}aa)`, border: `1px outset ${color}`, color: 'white', cursor: 'not-allowed', opacity: 0.7 }}
    >
      {label}
    </button>
  )

  return (
    <div className="flex h-full">
      {/* XP Left sidebar */}
      <div className="flex flex-col flex-shrink-0" style={{ width: '180px', background: 'linear-gradient(to bottom, #6890d0 0%, #3c68b8 100%)', borderRight: '2px solid #1a3c8a' }}>
        <div className="px-3 py-2" style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(0,0,0,0.2)' }}>
          <div className="text-white font-bold text-xs uppercase tracking-wider" style={{ fontFamily: 'Trebuchet MS' }}>Admin Panel</div>
          <div className="text-white text-xs mt-0.5 opacity-60">Demo</div>
        </div>
        <div className="flex flex-col py-2">
          {navItems.map((item) => (
            <button key={item.key} style={XP_SIDEBAR_BTN(section === item.key)} onClick={() => setSection(item.key)}
              onMouseEnter={(e) => { if (section !== item.key) e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
              onMouseLeave={(e) => { if (section !== item.key) e.currentTarget.style.background = 'transparent' }}>
              <span>{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-auto px-3 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>Sesiune activa</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-4" style={{ background: '#f5f4f0' }}>

        {/* SESSION */}
        {section === 'session' && (
          <div>
            <div className="text-sm font-bold mb-4" style={{ color: '#0a246a', fontFamily: 'Trebuchet MS' }}>Control Sesiune Live</div>
            <div className="flex items-center gap-3 p-4 mb-4 rounded" style={{ background: '#e8f8e8', border: '2px solid #4ade80' }}>
              <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: '#4ade80' }} />
              <div>
                <div className="font-bold text-sm" style={{ color: '#166534' }}>Sesiune ACTIVA</div>
                <div className="text-xs text-gray-800 mt-0.5">Pornita la 19:00:00</div>
              </div>
            </div>
            <div className="flex gap-3">
              <DemoBtn label="▶ START Sesiune" color="#4a9e4a" />
              <DemoBtn label="■ END Sesiune" color="#c04040" />
            </div>
            <div className="mt-4 text-xs text-gray-500">* Butoanele sunt dezactivate in modul demo.</div>
          </div>
        )}

        {/* MECIURI */}
        {section === 'meciuri' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold" style={{ color: '#0a246a', fontFamily: 'Trebuchet MS' }}>Programare Meciuri</div>
              <DemoBtn label="🎲 Random" color="#2a8a2a" />
            </div>

            {/* Form demo */}
            <div className="mb-5 p-3 rounded" style={{ background: '#edf2fc', border: '1px solid #c8d4e8' }}>
              <div className="text-xs font-bold mb-2" style={{ color: '#0a246a' }}>Meci nou</div>
              <div className="flex gap-2 flex-wrap items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: '#111' }}>Echipa A</label>
                  <select className="text-xs px-2 py-1" style={{ border: '2px inset #a0b8d8', background: 'white', minWidth: '120px' }} disabled>
                    {dummyAdminTeams.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: '#111' }}>Echipa B</label>
                  <select className="text-xs px-2 py-1" style={{ border: '2px inset #a0b8d8', background: 'white', minWidth: '120px' }} disabled>
                    {dummyAdminTeams.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: '#111' }}>Data</label>
                  <input type="date" className="text-xs px-2 py-1" style={{ border: '2px inset #a0b8d8', background: 'white', minWidth: '130px' }} disabled />
                </div>
                <DemoBtn label="+ Adauga" />
              </div>
            </div>

            <div className="space-y-2">
              {dummyScheduled.map((sm) => {
                const isPast = new Date(sm.scheduled_at) < new Date()
                const aWon = sm.winner === 'team_a', bWon = sm.winner === 'team_b'
                return (
                  <div key={sm.id} className="p-3 rounded" style={{ background: sm.winner ? '#f0f8f0' : '#f5f4f0', border: `1px solid ${sm.winner ? '#86c98e' : '#c8d4e8'}` }}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <div className="font-bold text-sm" style={{ color: '#0a246a' }}>
                          <span style={{ color: aWon ? '#166534' : undefined }}>{sm.team_a}</span>
                          <span style={{ color: '#333', fontWeight: 'normal' }}> vs </span>
                          <span style={{ color: bWon ? '#166534' : undefined }}>{sm.team_b}</span>
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: '#333' }}>
                          {new Date(sm.scheduled_at).toLocaleString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {sm.winner && (
                          <div className="text-xs mt-0.5 font-bold" style={{ color: '#166534' }}>
                            ✓ Castigator: {sm.winner === 'team_a' ? sm.team_a : sm.team_b}
                            {sm.result && ` (${sm.result.team1_score}:${sm.result.team2_score} pe ${sm.result.map_name})`}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {!sm.winner && isPast && (
                          <>
                            <DemoBtn label={sm.team_a} color="#4a9e4a" />
                            <DemoBtn label={sm.team_b} color="#4a9e4a" />
                            <DemoBtn label="Egal" color="#4a9e4a" />
                          </>
                        )}
                        {!sm.winner && !isPast && (
                          <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#dbeafe', color: '#1e40af' }}>Viitor</span>
                        )}
                        <DemoBtn label="✏" color="#4a7ec8" />
                        <DemoBtn label="✕" color="#c04040" />
                      </div>
                    </div>
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
                Jucatori CS ({dummyPlayers.length})
              </div>
              <DemoBtn label="⚠ Sterge toate stats" color="#c04040" />
            </div>

            <div className="mb-4 p-3 rounded" style={{ background: '#edf2fc', border: '1px solid #c8d4e8' }}>
              <div className="text-xs font-bold mb-2" style={{ color: '#0a246a' }}>Adauga jucator nou</div>
              <div className="flex gap-2 flex-wrap items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold" style={{ color: '#0a246a' }}>Nickname Steam *</label>
                  <input className="text-xs px-2 py-1" style={{ border: '2px inset #a0b8d8', background: 'white', width: '150px' }} placeholder="Patru" disabled />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: '#111' }}>Nume real</label>
                  <input className="text-xs px-2 py-1" style={{ border: '2px inset #a0b8d8', background: 'white', width: '130px' }} placeholder="Ion Popescu" disabled />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: '#111' }}>Echipa</label>
                  <select className="text-xs px-2 py-1" style={{ border: '2px inset #a0b8d8', background: 'white', width: '130px' }} disabled>
                    <option>— fara echipa —</option>
                    {dummyAdminTeams.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <DemoBtn label="+ Adauga" />
              </div>
            </div>

            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ background: '#316ac5', color: 'white' }}>
                  <th className="text-left px-2 py-1.5">Steam nick</th>
                  <th className="text-left px-2 py-1.5">Nume real</th>
                  <th className="text-left px-2 py-1.5">Echipa</th>
                  <th className="text-center px-2 py-1.5">M</th>
                  <th className="text-center px-2 py-1.5">K/D</th>
                  <th className="px-2 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {dummyPlayers.map((p, i) => (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? '#edf2fc' : 'white', borderBottom: '1px solid #c8d4e8', color: '#111' }}>
                    <td className="px-2 py-1.5 font-mono font-semibold">{p.steam_nickname}</td>
                    <td className="px-2 py-1.5">{p.real_name || <span style={{ color: '#666' }}>—</span>}</td>
                    <td className="px-2 py-1.5">{p.team_name || <span style={{ color: '#666' }}>—</span>}</td>
                    <td className="px-2 py-1.5 text-center">{p.matches_played}</td>
                    <td className="px-2 py-1.5 text-center font-bold" style={{ color: p.kd_ratio >= 1 ? '#166534' : '#991b1b' }}>{p.kd_ratio.toFixed(2)}</td>
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex gap-1 justify-center">
                        <DemoBtn label="✎" color="#4a6ecc" />
                        <DemoBtn label="✕" color="#c04040" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ECHIPE CS2 */}
        {section === 'teams_cs' && (
          <div>
            <div className="text-sm font-bold mb-3" style={{ color: '#0a246a', fontFamily: 'Trebuchet MS' }}>Echipe CS2</div>
            <div className="mb-4 p-3 rounded" style={{ background: '#edf2fc', border: '1px solid #c8d4e8' }}>
              <div className="text-xs font-bold mb-2" style={{ color: '#0a246a' }}>Echipa noua</div>
              <div className="flex gap-2 items-end">
                <input className="text-xs px-2 py-1" style={{ border: '2px inset #a0b8d8', background: 'white', width: '200px' }} placeholder="ex: Wolves" disabled />
                <DemoBtn label="+ Adauga" />
              </div>
            </div>
            <div className="space-y-3">
              {dummyAdminTeams.map((teamName) => {
                const players = dummyPlayers.filter((p) => p.team_name === teamName)
                return (
                  <div key={teamName} className="rounded overflow-hidden" style={{ border: '1px solid #c8d4e8' }}>
                    <div className="flex items-center justify-between px-3 py-2" style={{ background: '#316ac5' }}>
                      <span className="font-bold text-sm text-white">🛡️ {teamName} <span style={{ fontWeight: 'normal', fontSize: '11px', opacity: 0.8 }}>({players.length} jucatori)</span></span>
                      <DemoBtn label="✕ Sterge" color="#c04040" />
                    </div>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr style={{ background: '#dce8fc' }}>
                          <th className="text-left px-3 py-1">Nickname</th>
                          <th className="text-left px-3 py-1">Nume real</th>
                          <th className="text-center px-3 py-1">Meciuri</th>
                          <th className="text-center px-3 py-1">K/D</th>
                        </tr>
                      </thead>
                      <tbody>
                        {players.map((p, i) => (
                          <tr key={p.id} style={{ background: i % 2 === 0 ? '#f5f8ff' : 'white', borderBottom: '1px solid #e8eef8', color: '#111' }}>
                            <td className="px-3 py-1.5 font-mono">{p.steam_nickname}</td>
                            <td className="px-3 py-1.5">{p.real_name || <span style={{ color: '#666' }}>—</span>}</td>
                            <td className="px-3 py-1.5 text-center">{p.matches_played}</td>
                            <td className="px-3 py-1.5 text-center font-bold" style={{ color: p.kd_ratio >= 1 ? '#166534' : '#991b1b' }}>{p.kd_ratio.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
              Utilizatori inregistrati ({dummyAdminUsers.length})
            </div>
            <div className="text-xs mb-3" style={{ color: '#555' }}>Persoanele care s-au inregistrat pe platforma de pariuri.</div>
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
                {dummyAdminUsers.map((u, i) => (
                  <tr key={u.id} style={{ background: i % 2 === 0 ? '#edf2fc' : 'white', borderBottom: '1px solid #c8d4e8' }}>
                    <td className="px-3 py-2 font-semibold text-gray-900">{u.display_name}</td>
                    <td className="px-3 py-2 text-gray-900">{u.email}</td>
                    <td className="px-3 py-2 text-gray-700">{new Date(u.created_at).toLocaleString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-3 py-2 text-center font-bold" style={{ color: '#0a246a' }}>{u.points}</td>
                    <td className="px-3 py-2 text-center">
                      {u.is_admin ? <span style={{ color: '#166534', fontWeight: 'bold' }}>✓ Admin</span> : <span style={{ color: '#555' }}>—</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <DemoBtn label={u.is_admin ? 'Revoca admin' : 'Face admin'} color={u.is_admin ? '#c04040' : '#4a6ecc'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* LOGS */}
        {section === 'logs' && (
          <div>
            <div className="flex gap-2 mb-4">
              <button className="px-4 py-1.5 text-xs font-bold rounded" style={{ background: '#316ac5', color: 'white', border: 'none' }}>Loguri activitate</button>
              <button className="px-4 py-1.5 text-xs font-bold rounded" style={{ background: '#d4e0f5', color: '#0a246a', border: 'none' }}>Backup-uri meciuri ({dummyBackups.length})</button>
            </div>
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
                {dummyLogs.map((log, i) => (
                  <tr key={log.id} style={{ background: i % 2 === 0 ? '#edf2fc' : 'white', borderBottom: '1px solid #c8d4e8' }}>
                    <td className="px-3 py-1.5">
                      <span className="font-bold" style={{ color: { admin_login: '#166534', match_uploaded: '#1e40af', session_start: '#065f46', session_end: '#7f1d1d', scheduled_created: '#6b21a8', bet_processed: '#78350f' }[log.action] ?? '#374151' }}>{log.action}</span>
                    </td>
                    <td className="px-3 py-1.5 text-gray-900 max-w-xs truncate">{log.detail}</td>
                    <td className="px-3 py-1.5 text-gray-700 font-mono">{log.ip_address}</td>
                    <td className="px-3 py-1.5 text-gray-800">{new Date(log.created_at).toLocaleString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* DATABASE */}
        {section === 'database' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ background: '#fff', border: '1px solid #c8d4e8', borderRadius: 6, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0a246a' }}>Backup baza de date</div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Salveaza starea curenta a DB</div>
              </div>
              <DemoBtn label="💾 Backup acum" color="#4a8ce0" />
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: 2 }}>Backup-uri disponibile</div>
            {dummyDbBackups.map((b) => (
              <div key={b.filename} style={{ background: '#fff', border: '1px solid #c8d4e8', borderRadius: 6, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0a246a', fontFamily: 'monospace' }}>{b.filename}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                    {new Date(b.created_at).toLocaleString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · {b.size_kb} KB
                  </div>
                </div>
                <DemoBtn label="Restaureaza" color="#c02020" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Desktop Icon component ────────────────────────────────────────────────

function DesktopIcon({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all group w-28"
      style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <img src={icon} alt={label} className="w-16 h-16 rounded-xl object-cover drop-shadow-lg" />
      <span className="text-xs text-white text-center leading-tight font-medium px-1 py-0.5 rounded" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
        {label}
      </span>
    </button>
  )
}

// ─── Main Desktop ──────────────────────────────────────────────────────────

type WindowId = 'cs2' | 'betting' | 'fortuna' | 'admin'
interface WinState { open: boolean; minimized: boolean }

export default function Desktop() {
  const [wins, setWins] = useState<Record<WindowId, WinState>>({
    cs2:     { open: false, minimized: false },
    betting: { open: false, minimized: false },
    fortuna: { open: false, minimized: false },
    admin:   { open: false, minimized: false },
  })
  const [clock, setClock] = useState(new Date())
  const [startOpen, setStartOpen] = useState(false)
  const [ivanMsg, setIvanMsg] = useState(false)

  function openWin(id: WindowId) { setWins(prev => ({ ...prev, [id]: { open: true, minimized: false } })) }
  function closeWin(id: WindowId) { setWins(prev => ({ ...prev, [id]: { open: false, minimized: false } })) }
  function minimizeWin(id: WindowId) { setWins(prev => ({ ...prev, [id]: { open: true, minimized: true } })) }
  function toggleWin(id: WindowId) {
    setWins(prev => {
      const w = prev[id]
      if (!w.open || w.minimized) return { ...prev, [id]: { open: true, minimized: false } }
      return { ...prev, [id]: { open: true, minimized: true } }
    })
  }

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const clockStr = clock.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
  const dateStr = clock.toLocaleDateString('ro-RO', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundImage: 'url(/wallpaper.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>

      {/* Desktop icons */}
      <div className="absolute top-4 left-8 flex flex-col gap-2 pt-4">
        <DesktopIcon icon="/cs2_icon.png" label="CS2 Scoreboard" onClick={() => openWin('cs2')} />
        <DesktopIcon icon="/casapariurilor_icon.jpg" label="Casa Pariurilor" onClick={() => openWin('betting')} />
        <DesktopIcon icon="/ftn_logo.png" label="Fortuna WC2026" onClick={() => openWin('fortuna')} />
      </div>

      {/* Ivan popup */}
      {ivanMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIvanMsg(false)} />
          <div className="relative flex flex-col" style={{ width: 380, background: '#ece9d8', border: '3px solid #0a246a', boxShadow: '6px 6px 20px rgba(0,0,0,0.7)', outline: '2px solid #7aa4e8' }}>
            <div className="flex items-center gap-1.5 pl-2 pr-1 flex-shrink-0" style={{ height: 28, background: 'linear-gradient(to bottom, #3070e0 0%, #1c58d0 45%, #1448c0 100%)', borderBottom: '1px solid #0a246a' }}>
              <span style={{ fontSize: 14 }}>⛔</span>
              <span className="text-white font-bold text-sm flex-1 select-none" style={{ fontFamily: 'Trebuchet MS' }}>Acces interzis</span>
              <button onClick={() => setIvanMsg(false)} style={{ ...XP_BTN, background: 'linear-gradient(to bottom, #e86060, #c02020)' }}>✕</button>
            </div>
            <div className="flex items-start gap-4 p-5">
              <span style={{ fontSize: 48, lineHeight: 1 }}>🚫</span>
              <div>
                <div className="font-bold text-sm mb-2" style={{ color: '#0a246a', fontFamily: 'Trebuchet MS' }}>Acces refuzat</div>
                <div className="text-sm" style={{ color: '#222', lineHeight: 1.6 }}>Ivan zice ca nu ai voie aici.</div>
                <div className="text-xs mt-1" style={{ color: '#666' }}>Cod eroare: IVAN_403_FORBIDDEN</div>
              </div>
            </div>
            <div className="flex justify-end px-4 pb-4">
              <button onClick={() => setIvanMsg(false)} className="px-6 py-1 text-sm font-bold" style={{ background: '#ece9d8', border: '2px outset #a0a0a0', cursor: 'pointer', minWidth: 75 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#d0d8f0')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#ece9d8')}>
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
          <div className="absolute z-30 flex flex-col" style={{ bottom: '38px', left: 0, width: '420px', boxShadow: '4px 0 16px rgba(0,0,0,0.6)', border: '2px solid #0a246a', outline: '1px solid #7aa4e8', fontFamily: 'Tahoma, sans-serif' }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-3 py-2 flex-shrink-0" style={{ background: 'linear-gradient(to bottom, #2868dc 0%, #1a54cc 40%, #1448c0 100%)', borderBottom: '2px solid #0a246a', minHeight: '54px' }}>
              <div className="w-10 h-10 rounded flex items-center justify-center font-black text-xl flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f09030 0%, #e06010 100%)', border: '2px solid rgba(255,255,255,0.4)', color: 'white' }}>
                M
              </div>
              <div>
                <div className="font-bold text-white leading-tight" style={{ fontSize: '14px' }}>Marius Ivan</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>Full-stack Developer</div>
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-1" style={{ minHeight: '320px' }}>
              <div className="flex flex-col" style={{ width: '210px', background: 'white', borderRight: '1px solid #c8d8f0' }}>
                <div className="flex-1 py-1">
                  {[
                    { label: 'CS2 Scoreboard', img: '/cs2_icon.png', action: () => { setStartOpen(false); openWin('cs2') } },
                    { label: 'Casa Pariurilor', img: '/casapariurilor_icon.jpg', action: () => { setStartOpen(false); openWin('betting') } },
                  ].map((item) => (
                    <button key={item.label} onClick={item.action} className="w-full flex items-center gap-3 px-3 py-2 text-left" style={{ background: 'transparent', fontSize: '12px', color: '#000', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#316ac5'; e.currentTarget.style.color = 'white' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#000' }}>
                      <img src={item.img} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                      <span className="font-semibold">{item.label}</span>
                    </button>
                  ))}
                </div>
                <div style={{ height: '1px', background: 'linear-gradient(to right, #e0e8f8, #a0b8e0, #e0e8f8)', margin: '2px 0' }} />
                <button className="flex items-center justify-between px-3 py-2 text-left w-full" style={{ background: 'transparent', fontSize: '12px', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#316ac5'; e.currentTarget.style.color = 'white' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#000' }}
                  onClick={() => { setStartOpen(false); setIvanMsg(true) }}>
                  <div className="flex items-center gap-2"><span style={{ fontSize: '16px' }}>📂</span><span>All Programs</span></div>
                  <span style={{ fontSize: '10px' }}>▶</span>
                </button>
              </div>

              <div className="flex flex-col flex-1 py-1" style={{ background: '#4a80d0' }}>
                {[
                  { label: 'Admin Panel', icon: '🛡️', action: () => { setStartOpen(false); openWin('admin') } },
                  { label: 'GitHub', icon: '🐙', href: 'https://github.com/mivan1990' },
                  { label: 'Documente', icon: '📄' },
                ].map((item) => (
                  <button key={item.label}
                    onClick={() => { if ('action' in item && item.action) { item.action() } else if ('href' in item && item.href) { setStartOpen(false); window.open(item.href, '_blank') } else { setStartOpen(false); setIvanMsg(true) } }}
                    className="flex items-center gap-3 px-3 py-1.5 text-left w-full" style={{ background: 'transparent', fontSize: '12px', color: 'white', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#2060b8')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                    <span style={{ fontSize: '20px', width: '24px', textAlign: 'center' }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-3 py-2 flex-shrink-0" style={{ background: 'linear-gradient(to bottom, #1448c0 0%, #0e3aac 100%)', borderTop: '2px solid #0a246a' }}>
              <button className="flex items-center gap-1.5 px-3 py-1 text-white" style={{ fontSize: '11px', fontWeight: 'bold', background: 'linear-gradient(to bottom, #4878d8, #2858c0)', border: '1px solid #0a2898', cursor: 'pointer' }}>
                <span>🚪</span> Log Off
              </button>
            </div>
          </div>
        </>
      )}

      {/* XP Taskbar */}
      <div className="absolute bottom-0 inset-x-0 flex items-stretch z-10" style={{ height: '38px', background: 'linear-gradient(to bottom, #3c74d6 0%, #2457c8 8%, #1c4ec4 12%, #1a4bc0 88%, #1540b0 100%)', borderTop: '2px solid #5a8fe0', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)' }}>
        {/* Start button */}
        <button onClick={() => setStartOpen((v) => !v)} className="flex items-center gap-1.5 h-full pl-2 pr-5 font-bold italic text-white text-sm select-none flex-shrink-0"
          style={{ background: startOpen ? 'linear-gradient(to bottom, #2d6b2d 0%, #3a853a 50%, #2d6b2d 100%)' : 'linear-gradient(to bottom, #62b462 0%, #4a9e4a 30%, #3a8a3a 70%, #2d722d 100%)', borderRadius: '0 12px 12px 0', marginTop: '-2px', height: 'calc(100% + 4px)', textShadow: '1px 1px 2px rgba(0,0,0,0.5)', fontSize: '15px', border: 'none', cursor: 'pointer' }}>
          <img src="/winxp_logo.png" alt="" className="w-5 h-5 object-contain flex-shrink-0" />
          start
        </button>

        <div className="flex items-center mx-1">
          <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.15)', borderLeft: '1px solid rgba(0,0,0,0.25)' }} />
        </div>

        {/* Open windows in taskbar */}
        <div className="flex items-center gap-1 flex-1 px-1 overflow-hidden">
          {([
            { key: 'cs2' as WindowId, label: 'CS2 Scoreboard', img: '/cs2_icon.png' },
            { key: 'betting' as WindowId, label: 'Casa Pariurilor', img: '/casapariurilor_icon.jpg' },
            { key: 'fortuna' as WindowId, label: 'Fortuna WC2026', img: '/ftn_logo.png' },
            { key: 'admin' as WindowId, label: 'Admin Panel', img: '/win11_logo.png' },
          ]).filter(w => wins[w.key].open).map(w => {
            const minimized = wins[w.key].minimized
            return (
              <button key={w.key} onClick={() => toggleWin(w.key)} className="flex items-center gap-2 px-3 h-7 text-xs text-white font-semibold truncate max-w-xs"
                style={{ background: minimized ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.35)', border: minimized ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.35)', textShadow: '1px 1px 1px rgba(0,0,0,0.5)', cursor: 'pointer' }}>
                <img src={w.img} alt="" className="w-4 h-4 object-cover rounded-sm flex-shrink-0" />
                {w.label}
              </button>
            )
          })}
        </div>

        {/* Clock */}
        <div className="flex items-center px-3 gap-2 flex-shrink-0" style={{ background: 'linear-gradient(to bottom, #1238a8 0%, #1a48c0 50%, #1238a8 100%)', borderLeft: '1px solid #0a2878' }}>
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
            <CS2Content />
          </DesktopWindow>
        </div>
      )}

      {wins.betting.open && (
        <div style={{ display: wins.betting.minimized ? 'none' : undefined }}>
          <DesktopWindow title="Casa Pariurilor" imgSrc="/casapariurilor_icon.jpg" onClose={() => closeWin('betting')} onMinimize={() => minimizeWin('betting')} maxWidth="600px">
            <BettingContent />
          </DesktopWindow>
        </div>
      )}

      {wins.fortuna.open && (
        <div style={{ display: wins.fortuna.minimized ? 'none' : undefined }}>
          <DesktopWindow title="Fortuna — FIFA World Cup 2026" imgSrc="/ftn_logo.png" onClose={() => closeWin('fortuna')} onMinimize={() => minimizeWin('fortuna')} maxWidth="700px">
            <FortunaContent />
          </DesktopWindow>
        </div>
      )}

      {wins.admin.open && (
        <div style={{ display: wins.admin.minimized ? 'none' : undefined }}>
          <DesktopWindow title="Admin Panel — CS2 IVAN" imgSrc="/win11_logo.png" onClose={() => closeWin('admin')} onMinimize={() => minimizeWin('admin')} maxWidth="1100px">
            <AdminContent />
          </DesktopWindow>
        </div>
      )}
    </div>
  )
}
