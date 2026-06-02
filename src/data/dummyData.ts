import type { LeaderboardPlayer, MatchSummary, TeamLeaderboard, BetLeaderboard, ScheduledMatch } from './types'

export const dummyPlayers: LeaderboardPlayer[] = [
  {
    id: 1, steam_nickname: 'xHunterRO', real_name: 'Andrei Popescu', team_name: 'Alpha Squad',
    avatar_url: null, matches_played: 24, wins: 17, losses: 7, win_rate: 71,
    kills: 432, deaths: 298, assists: 89, kd_ratio: 1.45, headshot_kills: 210,
    hs_percent: 49, damage: 54320, adr: 89.4, mvps: 38, kills_2k: 42, kills_3k: 18,
    kills_4k: 5, kills_5k: 1, utility_damage: 2340, entry_wins: 29, clutch_1v1_wins: 12,
  },
  {
    id: 2, steam_nickname: 'SilverKnight', real_name: 'Mihai Ionescu', team_name: 'Alpha Squad',
    avatar_url: null, matches_played: 22, wins: 15, losses: 7, win_rate: 68,
    kills: 398, deaths: 312, assists: 105, kd_ratio: 1.28, headshot_kills: 189,
    hs_percent: 47, damage: 49800, adr: 82.1, mvps: 31, kills_2k: 38, kills_3k: 14,
    kills_4k: 3, kills_5k: 0, utility_damage: 1980, entry_wins: 22, clutch_1v1_wins: 9,
  },
  {
    id: 3, steam_nickname: 'NightOwl_CS', real_name: 'Bogdan Radu', team_name: 'Beta Force',
    avatar_url: null, matches_played: 20, wins: 12, losses: 8, win_rate: 60,
    kills: 341, deaths: 289, assists: 78, kd_ratio: 1.18, headshot_kills: 156,
    hs_percent: 46, damage: 42100, adr: 76.5, mvps: 24, kills_2k: 31, kills_3k: 9,
    kills_4k: 2, kills_5k: 0, utility_damage: 1560, entry_wins: 18, clutch_1v1_wins: 7,
  },
  {
    id: 4, steam_nickname: 'FlashGod', real_name: 'Cristian Stan', team_name: 'Beta Force',
    avatar_url: null, matches_played: 20, wins: 12, losses: 8, win_rate: 60,
    kills: 310, deaths: 278, assists: 134, kd_ratio: 1.11, headshot_kills: 128,
    hs_percent: 41, damage: 39800, adr: 71.2, mvps: 19, kills_2k: 27, kills_3k: 8,
    kills_4k: 1, kills_5k: 0, utility_damage: 3120, entry_wins: 14, clutch_1v1_wins: 5,
  },
  {
    id: 5, steam_nickname: 'PixelSniper', real_name: 'Vlad Georgescu', team_name: 'Gamma Wolves',
    avatar_url: null, matches_played: 18, wins: 9, losses: 9, win_rate: 50,
    kills: 289, deaths: 301, assists: 56, kd_ratio: 0.96, headshot_kills: 142,
    hs_percent: 49, damage: 35600, adr: 66.3, mvps: 15, kills_2k: 22, kills_3k: 6,
    kills_4k: 1, kills_5k: 0, utility_damage: 980, entry_wins: 11, clutch_1v1_wins: 4,
  },
  {
    id: 6, steam_nickname: 'RushB_King', real_name: 'Alexandru Marin', team_name: 'Gamma Wolves',
    avatar_url: null, matches_played: 18, wins: 9, losses: 9, win_rate: 50,
    kills: 267, deaths: 310, assists: 67, kd_ratio: 0.86, headshot_kills: 98,
    hs_percent: 37, damage: 33400, adr: 62.1, mvps: 12, kills_2k: 19, kills_3k: 4,
    kills_4k: 0, kills_5k: 0, utility_damage: 1240, entry_wins: 16, clutch_1v1_wins: 3,
  },
]

export const dummyTeams: TeamLeaderboard[] = [
  { team_name: 'Alpha Squad', matches_played: 22, wins: 16, draws: 1, losses: 5, points: 49, rounds_for: 412, rounds_against: 318, round_diff: 94 },
  { team_name: 'Beta Force', matches_played: 20, wins: 12, draws: 2, losses: 6, points: 38, rounds_for: 361, rounds_against: 329, round_diff: 32 },
  { team_name: 'Gamma Wolves', matches_played: 18, wins: 7, draws: 1, losses: 10, points: 22, rounds_for: 298, rounds_against: 362, round_diff: -64 },
]

export const dummyMatches: MatchSummary[] = [
  {
    id: 1, timestamp: '2025-05-28T19:00:00Z', map_name: 'de_mirage',
    rounds_played: 30, team1_score: 16, team2_score: 14,
    team1_name: 'Alpha Squad', team2_name: 'Beta Force',
    players: [
      { id: 1, name: 'xHunterRO', steam_nickname: 'xHunterRO', avatar_url: null, team_name: 'Alpha Squad', team: 1, won: true, kills: 24, deaths: 14, assists: 5, headshot_kills: 12, hs_percent: 50, damage: 3240, adr: 108.0, kd_ratio: 1.71, mvps: 5, score: 68, rounds_won: 16, kills_2k: 4, kills_3k: 2, kills_4k: 1, kills_5k: 0, first_kills: 6, utility_damage: 210, enemies_flashed: 18, clutch_1v1_wins: 2, clutch_1v2_wins: 1, entry_wins: 5 },
      { id: 2, name: 'SilverKnight', steam_nickname: 'SilverKnight', avatar_url: null, team_name: 'Alpha Squad', team: 1, won: true, kills: 19, deaths: 16, assists: 8, headshot_kills: 9, hs_percent: 47, damage: 2780, adr: 92.7, kd_ratio: 1.19, mvps: 3, score: 54, rounds_won: 16, kills_2k: 3, kills_3k: 1, kills_4k: 0, kills_5k: 0, first_kills: 4, utility_damage: 180, enemies_flashed: 12, clutch_1v1_wins: 1, clutch_1v2_wins: 0, entry_wins: 3 },
      { id: 3, name: 'NightOwl_CS', steam_nickname: 'NightOwl_CS', avatar_url: null, team_name: 'Beta Force', team: 2, won: false, kills: 18, deaths: 20, assists: 6, headshot_kills: 8, hs_percent: 44, damage: 2540, adr: 84.7, kd_ratio: 0.90, mvps: 2, score: 49, rounds_won: 14, kills_2k: 2, kills_3k: 1, kills_4k: 0, kills_5k: 0, first_kills: 3, utility_damage: 140, enemies_flashed: 9, clutch_1v1_wins: 1, clutch_1v2_wins: 0, entry_wins: 2 },
      { id: 4, name: 'FlashGod', steam_nickname: 'FlashGod', avatar_url: null, team_name: 'Beta Force', team: 2, won: false, kills: 16, deaths: 19, assists: 11, headshot_kills: 6, hs_percent: 38, damage: 2310, adr: 77.0, kd_ratio: 0.84, mvps: 2, score: 48, rounds_won: 14, kills_2k: 2, kills_3k: 0, kills_4k: 0, kills_5k: 0, first_kills: 2, utility_damage: 280, enemies_flashed: 21, clutch_1v1_wins: 0, clutch_1v2_wins: 0, entry_wins: 1 },
    ],
  },
  {
    id: 2, timestamp: '2025-05-25T19:30:00Z', map_name: 'de_inferno',
    rounds_played: 26, team1_score: 13, team2_score: 13,
    team1_name: 'Beta Force', team2_name: 'Gamma Wolves',
    players: [
      { id: 3, name: 'NightOwl_CS', steam_nickname: 'NightOwl_CS', avatar_url: null, team_name: 'Beta Force', team: 1, won: false, kills: 20, deaths: 17, assists: 4, headshot_kills: 10, hs_percent: 50, damage: 2890, adr: 111.2, kd_ratio: 1.18, mvps: 4, score: 58, rounds_won: 13, kills_2k: 3, kills_3k: 2, kills_4k: 0, kills_5k: 0, first_kills: 5, utility_damage: 160, enemies_flashed: 14, clutch_1v1_wins: 1, clutch_1v2_wins: 0, entry_wins: 4 },
      { id: 4, name: 'FlashGod', steam_nickname: 'FlashGod', avatar_url: null, team_name: 'Beta Force', team: 1, won: false, kills: 15, deaths: 18, assists: 12, headshot_kills: 5, hs_percent: 33, damage: 2100, adr: 80.8, kd_ratio: 0.83, mvps: 1, score: 43, rounds_won: 13, kills_2k: 2, kills_3k: 0, kills_4k: 0, kills_5k: 0, first_kills: 2, utility_damage: 290, enemies_flashed: 22, clutch_1v1_wins: 0, clutch_1v2_wins: 0, entry_wins: 1 },
      { id: 5, name: 'PixelSniper', steam_nickname: 'PixelSniper', avatar_url: null, team_name: 'Gamma Wolves', team: 2, won: false, kills: 17, deaths: 19, assists: 3, headshot_kills: 9, hs_percent: 53, damage: 2430, adr: 93.5, kd_ratio: 0.89, mvps: 3, score: 48, rounds_won: 13, kills_2k: 2, kills_3k: 1, kills_4k: 0, kills_5k: 0, first_kills: 3, utility_damage: 90, enemies_flashed: 7, clutch_1v1_wins: 1, clutch_1v2_wins: 0, entry_wins: 2 },
      { id: 6, name: 'RushB_King', steam_nickname: 'RushB_King', avatar_url: null, team_name: 'Gamma Wolves', team: 2, won: false, kills: 14, deaths: 20, assists: 5, headshot_kills: 5, hs_percent: 36, damage: 2010, adr: 77.3, kd_ratio: 0.70, mvps: 1, score: 37, rounds_won: 13, kills_2k: 1, kills_3k: 0, kills_4k: 0, kills_5k: 0, first_kills: 2, utility_damage: 110, enemies_flashed: 10, clutch_1v1_wins: 0, clutch_1v2_wins: 0, entry_wins: 1 },
    ],
  },
  {
    id: 3, timestamp: '2025-05-20T20:00:00Z', map_name: 'de_dust2',
    rounds_played: 24, team1_score: 16, team2_score: 8,
    team1_name: 'Alpha Squad', team2_name: 'Gamma Wolves',
    players: [
      { id: 1, name: 'xHunterRO', steam_nickname: 'xHunterRO', avatar_url: null, team_name: 'Alpha Squad', team: 1, won: true, kills: 22, deaths: 10, assists: 4, headshot_kills: 11, hs_percent: 50, damage: 2980, adr: 124.2, kd_ratio: 2.20, mvps: 6, score: 66, rounds_won: 16, kills_2k: 5, kills_3k: 2, kills_4k: 1, kills_5k: 0, first_kills: 7, utility_damage: 190, enemies_flashed: 15, clutch_1v1_wins: 2, clutch_1v2_wins: 1, entry_wins: 6 },
      { id: 2, name: 'SilverKnight', steam_nickname: 'SilverKnight', avatar_url: null, team_name: 'Alpha Squad', team: 1, won: true, kills: 18, deaths: 11, assists: 7, headshot_kills: 8, hs_percent: 44, damage: 2420, adr: 100.8, kd_ratio: 1.64, mvps: 3, score: 54, rounds_won: 16, kills_2k: 3, kills_3k: 1, kills_4k: 0, kills_5k: 0, first_kills: 3, utility_damage: 160, enemies_flashed: 11, clutch_1v1_wins: 1, clutch_1v2_wins: 0, entry_wins: 2 },
      { id: 5, name: 'PixelSniper', steam_nickname: 'PixelSniper', avatar_url: null, team_name: 'Gamma Wolves', team: 2, won: false, kills: 12, deaths: 20, assists: 2, headshot_kills: 6, hs_percent: 50, damage: 1680, adr: 70.0, kd_ratio: 0.60, mvps: 1, score: 33, rounds_won: 8, kills_2k: 1, kills_3k: 0, kills_4k: 0, kills_5k: 0, first_kills: 1, utility_damage: 70, enemies_flashed: 5, clutch_1v1_wins: 0, clutch_1v2_wins: 0, entry_wins: 1 },
      { id: 6, name: 'RushB_King', steam_nickname: 'RushB_King', avatar_url: null, team_name: 'Gamma Wolves', team: 2, won: false, kills: 9, deaths: 20, assists: 3, headshot_kills: 3, hs_percent: 33, damage: 1290, adr: 53.8, kd_ratio: 0.45, mvps: 0, score: 24, rounds_won: 8, kills_2k: 0, kills_3k: 0, kills_4k: 0, kills_5k: 0, first_kills: 1, utility_damage: 80, enemies_flashed: 7, clutch_1v1_wins: 0, clutch_1v2_wins: 0, entry_wins: 1 },
    ],
  },
]

export const dummyBets: BetLeaderboard[] = [
  { id: 1, display_name: 'Andrei P.', points: 87, bets_total: 28, bets_won: 19, bets_draw: 3, bets_lost: 6, bets_pending: 0 },
  { id: 2, display_name: 'Mihai I.', points: 74, bets_total: 25, bets_won: 16, bets_draw: 2, bets_lost: 7, bets_pending: 0 },
  { id: 3, display_name: 'Bogdan R.', points: 61, bets_total: 22, bets_won: 13, bets_draw: 2, bets_lost: 7, bets_pending: 1 },
  { id: 4, display_name: 'Cristian S.', points: 48, bets_total: 20, bets_won: 10, bets_draw: 3, bets_lost: 7, bets_pending: 0 },
  { id: 5, display_name: 'Vlad G.', points: 33, bets_total: 18, bets_won: 8, bets_draw: 1, bets_lost: 9, bets_pending: 0 },
  { id: 6, display_name: 'Alexandru M.', points: 21, bets_total: 15, bets_won: 5, bets_draw: 1, bets_lost: 9, bets_pending: 0 },
]

// Admin: date extra
export const dummyAdminTeams = ['Alpha Squad', 'Beta Force', 'Gamma Wolves']

export const dummyAdminUsers = [
  { id: 1, email: 'andrei.p@gmail.com', display_name: 'Andrei P.', is_admin: true, points: 87, created_at: '2025-04-10T12:00:00Z' },
  { id: 2, email: 'mihai.i@gmail.com', display_name: 'Mihai I.', is_admin: false, points: 74, created_at: '2025-04-11T14:30:00Z' },
  { id: 3, email: 'bogdan.r@gmail.com', display_name: 'Bogdan R.', is_admin: false, points: 61, created_at: '2025-04-12T09:15:00Z' },
  { id: 4, email: 'cristian.s@gmail.com', display_name: 'Cristian S.', is_admin: false, points: 48, created_at: '2025-04-13T16:45:00Z' },
  { id: 5, email: 'vlad.g@gmail.com', display_name: 'Vlad G.', is_admin: false, points: 33, created_at: '2025-04-14T11:20:00Z' },
  { id: 6, email: 'alex.m@gmail.com', display_name: 'Alexandru M.', is_admin: false, points: 21, created_at: '2025-04-15T10:00:00Z' },
]

export const dummyLogs = [
  { id: 1, action: 'session_start', detail: 'Sesiune live pornita', user_id: 1, ip_address: '192.168.1.10', created_at: '2025-05-28T19:00:00Z' },
  { id: 2, action: 'match_uploaded', detail: 'de_mirage — Alpha Squad 16:14 Beta Force', user_id: 1, ip_address: '192.168.1.10', created_at: '2025-05-28T21:45:00Z' },
  { id: 3, action: 'bet_processed', detail: 'Meciuri procesate: 28 pariuri', user_id: 1, ip_address: '192.168.1.10', created_at: '2025-05-28T21:46:00Z' },
  { id: 4, action: 'session_end', detail: 'Sesiune live oprita', user_id: 1, ip_address: '192.168.1.10', created_at: '2025-05-28T22:00:00Z' },
  { id: 5, action: 'session_start', detail: 'Sesiune live pornita', user_id: 1, ip_address: '192.168.1.10', created_at: '2025-05-25T19:30:00Z' },
  { id: 6, action: 'match_uploaded', detail: 'de_inferno — Beta Force 13:13 Gamma Wolves', user_id: 1, ip_address: '192.168.1.10', created_at: '2025-05-25T21:30:00Z' },
  { id: 7, action: 'scheduled_created', detail: 'Alpha Squad vs Gamma Wolves — 2025-07-15', user_id: 1, ip_address: '192.168.1.10', created_at: '2025-05-20T10:00:00Z' },
  { id: 8, action: 'admin_login', detail: 'Login admin reusit', user_id: 1, ip_address: '192.168.1.10', created_at: '2025-05-20T09:58:00Z' },
]

export const dummyBackups = [
  { filename: 'backup_2025-05-28_2145.json', size_kb: 142, created_at: '2025-05-28T21:45:00Z' },
  { filename: 'backup_2025-05-25_2130.json', size_kb: 128, created_at: '2025-05-25T21:30:00Z' },
  { filename: 'backup_2025-05-20_2200.json', size_kb: 98, created_at: '2025-05-20T22:00:00Z' },
]

export const dummyDbBackups = [
  { filename: 'db_backup_2025-05-28.sqlite', size_kb: 512, created_at: '2025-05-28T22:00:00Z' },
  { filename: 'db_backup_2025-05-25.sqlite', size_kb: 487, created_at: '2025-05-25T22:00:00Z' },
]

// Meciuri programate (cu rezultate pentru bracket/meciuri)
export const dummyScheduled: ScheduledMatch[] = [
  {
    id: 101, team_a: 'Alpha Squad', team_b: 'Beta Force',
    scheduled_at: '2025-05-28T19:00:00Z',
    match_id: 1, winner: 'team_a', bracket_round: 1, bracket_position: 0,
    result: { team1_score: 16, team2_score: 14, rounds_played: 30, map_name: 'de_mirage' },
  },
  {
    id: 102, team_a: 'Beta Force', team_b: 'Gamma Wolves',
    scheduled_at: '2025-05-25T19:30:00Z',
    match_id: 2, winner: null, bracket_round: 1, bracket_position: 1,
    result: { team1_score: 13, team2_score: 13, rounds_played: 26, map_name: 'de_inferno' },
  },
  {
    id: 103, team_a: 'Alpha Squad', team_b: 'Gamma Wolves',
    scheduled_at: '2025-05-20T20:00:00Z',
    match_id: 3, winner: 'team_a', bracket_round: 2, bracket_position: 0,
    result: { team1_score: 16, team2_score: 8, rounds_played: 24, map_name: 'de_dust2' },
  },
  // Viitoare (pentru betting)
  {
    id: 201, team_a: 'Alpha Squad', team_b: 'Gamma Wolves',
    scheduled_at: '2030-07-15T19:00:00Z',
    match_id: null, winner: null, bracket_round: null, bracket_position: null,
  },
  {
    id: 202, team_a: 'Beta Force', team_b: 'Alpha Squad',
    scheduled_at: '2030-07-22T20:00:00Z',
    match_id: null, winner: null, bracket_round: null, bracket_position: null,
  },
]
