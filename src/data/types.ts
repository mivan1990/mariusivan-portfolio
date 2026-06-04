export interface LeaderboardPlayer {
  id: number
  steam_nickname: string
  real_name: string | null
  team_name: string | null
  avatar_url: string | null
  matches_played: number
  wins: number
  losses: number
  win_rate: number
  kills: number
  deaths: number
  assists: number
  kd_ratio: number
  headshot_kills: number
  hs_percent: number
  damage: number
  adr: number
  mvps: number
  kills_2k: number
  kills_3k: number
  kills_4k: number
  kills_5k: number
  utility_damage: number
  entry_wins: number
  clutch_1v1_wins: number
}

export interface MatchPlayer {
  id: number
  name: string
  steam_nickname: string
  avatar_url: string | null
  team_name: string | null
  team: number
  won: boolean
  kills: number
  deaths: number
  assists: number
  headshot_kills: number
  hs_percent: number
  damage: number
  adr: number
  kd_ratio: number
  mvps: number
  score: number
  rounds_won: number
  kills_2k: number
  kills_3k: number
  kills_4k: number
  kills_5k: number
  first_kills: number
  utility_damage: number
  enemies_flashed: number
  clutch_1v1_wins: number
  clutch_1v2_wins: number
  entry_wins: number
}

export interface MatchSummary {
  id: number
  timestamp: string | null
  map_name: string
  rounds_played: number
  team1_score: number
  team2_score: number
  team1_name: string | null
  team2_name: string | null
  first_half_team1?: number
  first_half_team2?: number
  second_half_team1?: number
  second_half_team2?: number
  players: MatchPlayer[]
}

export interface TeamLeaderboard {
  team_name: string
  matches_played: number
  wins: number
  draws: number
  losses: number
  points: number
  rounds_for: number
  rounds_against: number
  round_diff: number
}

export interface BetLeaderboard {
  id: number
  display_name: string
  points: number
  bets_total: number
  bets_won: number
  bets_draw: number
  bets_lost: number
  bets_pending: number
}

export interface ScheduledMatch {
  id: number
  team_a: string
  team_b: string
  scheduled_at: string
  match_id: number | null
  winner: string | null
  bracket_round: number | null
  bracket_position: number | null
  result?: {
    team1_score: number
    team2_score: number
    rounds_played: number
    map_name: string
  }
}
