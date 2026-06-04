import { useState, useRef, useEffect, type ChangeEvent, type DragEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../../api/client'

interface AdminPlayer {
  id: number
  steam_account_id: string
  steam_nickname: string
  real_name: string | null
  team_name: string | null
  avatar_url: string | null
  matches_played: number
}

interface AdminMatch {
  id: number
  timestamp: string | null
  map_name: string
  rounds_played: number
  team1_score: number
  team2_score: number
  file_name: string | null
  players_count: number
  created_at: string
}

interface UploadResult {
  message: string
  match_id: number
  map: string
  score: string
  rounds_played: number
  new_players_added: string[]
  existing_players_updated: string[]
  tip: string
}

interface EditState {
  id: number
  real_name: string
  team_name: string
}

interface AdminScheduledMatch {
  id: number
  team_a: string
  team_b: string
  scheduled_at: string
  match_id: number | null
  winner: string | null
  bets_processed: boolean
  created_at: string
}

interface ActivityLog {
  id: number
  action: string
  detail: string | null
  user_id: number | null
  ip_address: string | null
  created_at: string
}

interface LogsResponse {
  total: number
  page: number
  limit: number
  logs: ActivityLog[]
}

const ACTION_COLORS: Record<string, string> = {
  register: 'bg-green-900/40 text-green-400 border-green-800',
  login: 'bg-blue-900/40 text-blue-400 border-blue-800',
  admin_login: 'bg-purple-900/40 text-purple-400 border-purple-800',
  match_uploaded: 'bg-yellow-900/40 text-yellow-400 border-yellow-800',
  match_deleted: 'bg-red-900/40 text-red-400 border-red-800',
  result_set: 'bg-orange-900/40 text-orange-400 border-orange-800',
  scheduled_created: 'bg-teal-900/40 text-teal-400 border-teal-800',
  bet_placed: 'bg-emerald-900/40 text-emerald-400 border-emerald-800',
  bet_changed: 'bg-amber-900/40 text-amber-400 border-amber-800',
}

const ALL_ACTIONS = [
  'register', 'login', 'admin_login', 'match_uploaded', 'match_deleted',
  'result_set', 'scheduled_created', 'bet_placed', 'bet_changed',
]

function useAdminGuard() {
  const navigate = useNavigate()
  const [verified, setVerified] = useState<boolean | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) { navigate('/admin/login', { replace: true }); return }
    api.get('/api/admin/me')
      .then(() => setVerified(true))
      .catch(() => {
        localStorage.removeItem('admin_token')
        navigate('/admin/login', { replace: true })
      })
  }, [navigate])

  return verified
}

export default function AdminUpload() {
  const verified = useAdminGuard()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [editState, setEditState] = useState<EditState | null>(null)
  const [activeTab, setActiveTab] = useState<'upload' | 'players' | 'matches' | 'scheduled' | 'logs' | 'users' | 'database'>('upload')
  const [logActionFilter, setLogActionFilter] = useState('')
  const [newScheduled, setNewScheduled] = useState({ team_a: '', team_b: '', scheduled_at: '' })
  const [linkingId, setLinkingId] = useState<number | null>(null)
  const [linkMatchId, setLinkMatchId] = useState('')
  const [settingResultId, setSettingResultId] = useState<number | null>(null)
  const [resetPasswordId, setResetPasswordId] = useState<number | null>(null)
  const [newPassword, setNewPassword] = useState('')

  const isAuth = verified === true

  const { data: players, refetch: refetchPlayers } = useQuery<AdminPlayer[]>({
    queryKey: ['admin-players'],
    queryFn: () => api.get('/api/admin/players').then((r) => r.data),
    enabled: isAuth,
  })

  const { data: matches } = useQuery<AdminMatch[]>({
    queryKey: ['admin-matches'],
    queryFn: () => api.get('/api/admin/matches').then((r) => r.data),
    enabled: isAuth && (activeTab === 'matches' || activeTab === 'scheduled'),
  })

  const { data: scheduledMatches, refetch: refetchScheduled } = useQuery<AdminScheduledMatch[]>({
    queryKey: ['admin-scheduled'],
    queryFn: () => api.get('/api/admin/scheduled').then((r) => r.data),
    enabled: isAuth && activeTab === 'scheduled',
  })

  const { data: teams } = useQuery<string[]>({
    queryKey: ['admin-teams'],
    queryFn: () => api.get('/api/admin/teams').then((r) => r.data),
    enabled: isAuth && activeTab === 'scheduled',
  })

  const { data: sessionData, refetch: refetchSession } = useQuery<{ active: boolean; started_at: number | null }>({
    queryKey: ['admin-session'],
    queryFn: () => api.get('/api/admin/session').then((r) => r.data),
    enabled: isAuth,
    refetchInterval: 10000,
  })

  const startSessionMutation = useMutation({
    mutationFn: () => api.post('/api/admin/session/start').then((r) => r.data),
    onSuccess: () => refetchSession(),
  })

  const endSessionMutation = useMutation({
    mutationFn: () => api.post('/api/admin/session/end').then((r) => r.data),
    onSuccess: () => refetchSession(),
  })

  interface AdminUserEntry { id: number; email: string; display_name: string | null; points: number; is_admin: boolean; created_at: string }
  const { data: usersData, refetch: refetchUsers } = useQuery<AdminUserEntry[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/api/admin/users').then((r) => r.data),
    enabled: isAuth && activeTab === 'users',
  })

  const toggleAdminMutation = useMutation({
    mutationFn: (userId: number) => api.post(`/api/admin/users/${userId}/toggle-admin`).then((r) => r.data),
    onSuccess: () => refetchUsers(),
  })

  const setPasswordMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: number; password: string }) =>
      api.put(`/api/admin/users/${userId}/password`, { password }).then((r) => r.data),
    onSuccess: () => { setResetPasswordId(null); setNewPassword('') },
  })

  const { data: logsData } = useQuery<LogsResponse>({
    queryKey: ['admin-logs', logActionFilter],
    queryFn: () => api.get(`/api/admin/logs${logActionFilter ? `?action=${logActionFilter}` : ''}`).then((r) => r.data),
    enabled: isAuth && activeTab === 'logs',
    refetchInterval: activeTab === 'logs' ? 15000 : false,
  })

  interface DbBackup { filename: string; size_kb: number; created_at: string }
  const { data: dbBackups, refetch: refetchBackups } = useQuery<DbBackup[]>({
    queryKey: ['admin-db-backups'],
    queryFn: () => api.get('/api/admin/db/backups').then((r) => r.data),
    enabled: isAuth && activeTab === 'database',
  })

  const createBackupMutation = useMutation({
    mutationFn: () => api.post('/api/admin/db/backup').then((r) => r.data),
    onSuccess: () => refetchBackups(),
  })

  const restoreBackupMutation = useMutation({
    mutationFn: (filename: string) => api.post(`/api/admin/db/restore/${encodeURIComponent(filename)}`).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries(); refetchBackups() },
  })

  const createScheduledMutation = useMutation({
    mutationFn: (data: { team_a: string; team_b: string; scheduled_at: string }) =>
      api.post('/api/admin/scheduled', { ...data, scheduled_at: new Date(data.scheduled_at).toISOString() }).then((r) => r.data),
    onSuccess: () => {
      setNewScheduled({ team_a: '', team_b: '', scheduled_at: '' })
      refetchScheduled()
    },
  })

  const deleteScheduledMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/admin/scheduled/${id}`),
    onSuccess: () => refetchScheduled(),
  })

  const linkMutation = useMutation({
    mutationFn: ({ smId, matchId }: { smId: number; matchId: number }) =>
      api.put(`/api/admin/scheduled/${smId}/link/${matchId}`),
    onSuccess: () => { setLinkingId(null); setLinkMatchId(''); refetchScheduled() },
  })

  const unlinkMutation = useMutation({
    mutationFn: (smId: number) => api.delete(`/api/admin/scheduled/${smId}/link`),
    onSuccess: () => refetchScheduled(),
  })

  const setResultMutation = useMutation({
    mutationFn: ({ smId, winner }: { smId: number; winner: string }) =>
      api.post(`/api/admin/scheduled/${smId}/result`, { winner }).then((r) => r.data),
    onSuccess: () => { setSettingResultId(null); refetchScheduled() },
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.post<UploadResult>('/api/admin/upload', form).then((r) => r.data)
    },
    onSuccess: (data) => {
      setUploadResult(data)
      setUploadError('')
      queryClient.invalidateQueries({ queryKey: ['admin-players'] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      queryClient.invalidateQueries({ queryKey: ['matches'] })
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response: { data: { detail: string } } }).response.data.detail
          : 'Eroare necunoscuta'
      setUploadError(msg)
      setUploadResult(null)
    },
  })

  const updatePlayerMutation = useMutation({
    mutationFn: ({ id, real_name, team_name }: EditState) =>
      api.put(`/api/admin/players/${id}`, { real_name, team_name }).then((r) => r.data),
    onSuccess: () => {
      setEditState(null)
      refetchPlayers()
    },
  })

  const deleteMatchMutation = useMutation({
    mutationFn: (matchId: number) => api.delete(`/api/admin/matches/${matchId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-matches'] })
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      queryClient.invalidateQueries({ queryKey: ['matches'] })
    },
  })

  function handleFile(file: File) {
    if (!file.name.endsWith('.txt')) {
      setUploadError('Fisierul trebuie sa fie .txt (backup_roundXX.txt)')
      return
    }
    setUploadResult(null)
    setUploadError('')
    uploadMutation.mutate(file)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function logout() {
    localStorage.removeItem('admin_token')
    navigate('/admin/login')
  }

  if (verified === null) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-500 text-sm">Se verifica accesul...</div>
    </div>
  )
  if (!isAuth) return null

  const tabClass = (t: string) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      activeTab === t ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white bg-gray-800'
    }`

  const tabLabel: Record<string, string> = {
    upload: 'Upload Meci',
    players: 'Jucatori',
    matches: 'Meciuri',
    scheduled: 'Programate',
    logs: 'Loguri',
    users: 'Utilizatori',
    database: 'Baza de Date',
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        <button onClick={logout} className="text-sm text-gray-500 hover:text-white">
          Logout
        </button>
      </div>

      {/* Session control */}
      <div
        className="flex items-center justify-between rounded-xl px-5 py-3 mb-5"
        style={{
          background: sessionData?.active ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${sessionData?.active ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.08)'}`,
        }}
      >
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${sessionData?.active ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
          <div>
            <span className="text-sm font-semibold text-white">
              {sessionData?.active ? 'Sesiune activa — stats se salveaza' : 'Sesiune inactiva — stats ignorate'}
            </span>
            {sessionData?.active && sessionData.started_at && (
              <div className="text-xs text-green-400 mt-0.5">
                Pornita la {new Date(sessionData.started_at * 1000).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            disabled={sessionData?.active || startSessionMutation.isPending}
            onClick={() => startSessionMutation.mutate()}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-green-600 hover:bg-green-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
          >
            START
          </button>
          <button
            disabled={!sessionData?.active || endSessionMutation.isPending}
            onClick={() => endSessionMutation.mutate()}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
          >
            END
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {(['upload', 'players', 'matches', 'scheduled', 'logs', 'users', 'database'] as const).map((t) => (
          <button key={t} className={tabClass(t)} onClick={() => setActiveTab(t)}>
            {tabLabel[t]}
          </button>
        ))}
      </div>

      {/* UPLOAD TAB */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
              dragging
                ? 'border-yellow-500 bg-yellow-500/5'
                : 'border-gray-700 hover:border-gray-600'
            }`}
          >
            <input ref={fileRef} type="file" accept=".txt" className="hidden" onChange={handleInputChange} />
            <div className="text-4xl mb-3">📁</div>
            <p className="text-gray-300 font-medium">
              {uploadMutation.isPending ? 'Se proceseaza...' : 'Trage fisierul aici sau apasa sa selectezi'}
            </p>
            <p className="text-gray-600 text-sm mt-2">backup_roundXX.txt</p>
          </div>

          {uploadError && (
            <div className="bg-red-900/20 border border-red-800 text-red-400 rounded-xl p-4 text-sm">
              {uploadError}
            </div>
          )}

          {uploadResult && (
            <div className="bg-green-900/20 border border-green-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-green-400 font-bold">
                ✅ {uploadResult.message}
              </div>
              <div className="text-sm text-gray-300 space-y-1">
                <div><span className="text-gray-500">Harta:</span> {uploadResult.map}</div>
                <div><span className="text-gray-500">Scor:</span> {uploadResult.score}</div>
                <div><span className="text-gray-500">Runde:</span> {uploadResult.rounds_played}</div>
              </div>
              {uploadResult.new_players_added.length > 0 && (
                <div className="text-sm">
                  <span className="text-yellow-400 font-medium">Jucatori noi adaugati: </span>
                  <span className="text-gray-300">{uploadResult.new_players_added.join(', ')}</span>
                </div>
              )}
              {uploadResult.tip && (
                <div className="text-xs text-yellow-600 bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
                  💡 {uploadResult.tip}
                </div>
              )}
              <button
                onClick={() => setActiveTab('players')}
                className="text-sm text-yellow-400 hover:text-yellow-300"
              >
                → Mergi la Jucatori pentru a completa datele
              </button>
            </div>
          )}
        </div>
      )}

      {/* PLAYERS TAB */}
      {activeTab === 'players' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Completeaza Numele Real si Echipa pentru fiecare jucator aparut in meciuri.
          </p>

          {players?.map((player) => (
            <div
              key={player.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4"
            >
              {editState?.id === player.id ? (
                <div className="space-y-3">
                  <div className="text-sm text-gray-400 font-mono">{player.steam_nickname}</div>
                  <div className="flex gap-3">
                    <input
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500"
                      placeholder="Nume Real (ex: Ion Popescu)"
                      value={editState.real_name}
                      onChange={(e) => setEditState({ ...editState, real_name: e.target.value })}
                    />
                    <input
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500"
                      placeholder="Echipa (ex: Team Alpha)"
                      value={editState.team_name}
                      onChange={(e) => setEditState({ ...editState, team_name: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updatePlayerMutation.mutate(editState)}
                      className="bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-bold px-4 py-1.5 rounded-lg"
                    >
                      Salveaza
                    </button>
                    <button
                      onClick={() => setEditState(null)}
                      className="text-gray-500 hover:text-white text-sm px-4 py-1.5"
                    >
                      Anuleaza
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">
                      {player.real_name || (
                        <span className="text-gray-500 italic">Fara nume real</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {player.steam_nickname} • Steam ID: {player.steam_account_id}
                    </div>
                    {player.team_name && (
                      <div className="text-xs text-yellow-500 mt-1">{player.team_name}</div>
                    )}
                    <div className="text-xs text-gray-600 mt-1">{player.matches_played} meciuri</div>
                  </div>
                  <button
                    onClick={() =>
                      setEditState({
                        id: player.id,
                        real_name: player.real_name || '',
                        team_name: player.team_name || '',
                      })
                    }
                    className="text-sm text-gray-400 hover:text-white bg-gray-800 px-3 py-1.5 rounded-lg"
                  >
                    Editeaza
                  </button>
                </div>
              )}
            </div>
          ))}

          {players?.length === 0 && (
            <div className="text-center text-gray-600 py-10">
              Niciun jucator. Incarca un meci mai intai.
            </div>
          )}
        </div>
      )}

      {/* MATCHES TAB */}
      {activeTab === 'matches' && (
        <div className="space-y-3">
          {matches?.map((match) => (
            <div
              key={match.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-mono bg-gray-800 text-gray-300 px-2 py-1 rounded">
                    {match.map_name}
                  </span>
                  <span className="text-white font-bold">
                    {match.team1_score} — {match.team2_score}
                  </span>
                  <span className="text-gray-500 text-xs">{match.rounds_played} runde</span>
                </div>
                <div className="text-xs text-gray-600">
                  {match.file_name} •{' '}
                  {match.timestamp
                    ? new Date(match.timestamp).toLocaleDateString('ro-RO')
                    : new Date(match.created_at).toLocaleDateString('ro-RO')}{' '}
                  • {match.players_count} jucatori
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/matches/${match.id}`}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Vezi
                </Link>
                <button
                  onClick={() => {
                    if (confirm('Stergi meciul? Se vor sterge si statisticile.')) {
                      deleteMatchMutation.mutate(match.id)
                    }
                  }}
                  className="text-sm text-red-500 hover:text-red-400"
                >
                  Sterge
                </button>
              </div>
            </div>
          ))}

          {matches?.length === 0 && (
            <div className="text-center text-gray-600 py-10">Niciun meci inca.</div>
          )}
        </div>
      )}

      {/* PROGRAMATE TAB */}
      {activeTab === 'scheduled' && (
        <div className="space-y-6">
          {/* Formular creare */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-gray-300 uppercase">Adauga meci programat</h2>
            <div className="grid grid-cols-2 gap-3">
              {['team_a', 'team_b'].map((field) => (
                <div key={field}>
                  <label className="text-xs text-gray-500 block mb-1">
                    {field === 'team_a' ? 'Echipa A' : 'Echipa B'}
                  </label>
                  {teams && teams.length > 0 ? (
                    <select
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500"
                      value={newScheduled[field as 'team_a' | 'team_b']}
                      onChange={(e) => setNewScheduled({ ...newScheduled, [field]: e.target.value })}
                    >
                      <option value="">Selecteaza echipa</option>
                      {teams.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  ) : (
                    <input
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500"
                      placeholder={field === 'team_a' ? 'Team Alpha' : 'Team Bravo'}
                      value={newScheduled[field as 'team_a' | 'team_b']}
                      onChange={(e) => setNewScheduled({ ...newScheduled, [field]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Data si ora</label>
              <input
                type="datetime-local"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500"
                value={newScheduled.scheduled_at}
                onChange={(e) => setNewScheduled({ ...newScheduled, scheduled_at: e.target.value })}
              />
            </div>
            <button
              disabled={!newScheduled.team_a || !newScheduled.team_b || !newScheduled.scheduled_at || createScheduledMutation.isPending}
              onClick={() => createScheduledMutation.mutate(newScheduled)}
              className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black font-bold px-5 py-2 rounded-lg text-sm"
            >
              {createScheduledMutation.isPending ? 'Se salveaza...' : 'Adauga'}
            </button>
          </div>

          {/* Lista meciuri programate */}
          <div className="space-y-3">
            {scheduledMatches?.map((sm) => (
              <div key={sm.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white">{sm.team_a}</span>
                    <span className="text-gray-600">vs</span>
                    <span className="font-bold text-white">{sm.team_b}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {sm.match_id && (
                      <span className="text-xs bg-green-900/30 text-green-400 border border-green-800 px-2 py-0.5 rounded">
                        Legat #{sm.match_id}
                      </span>
                    )}
                    <button
                      onClick={() => { if (confirm('Stergi meciul programat?')) deleteScheduledMutation.mutate(sm.id) }}
                      className="text-xs text-red-500 hover:text-red-400"
                    >
                      Sterge
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mb-3">
                  {new Date(sm.scheduled_at).toLocaleDateString('ro-RO', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </div>

                {/* Rezultat */}
                {sm.winner ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-green-400">
                      Rezultat: {sm.winner === 'team_a' ? sm.team_a : sm.winner === 'team_b' ? sm.team_b : 'Egal'} •
                      pariuri procesate
                    </span>
                  </div>
                ) : settingResultId === sm.id ? (
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-gray-400">Castigator:</span>
                    {[
                      { val: 'team_a', label: sm.team_a },
                      { val: 'team_b', label: sm.team_b },
                      { val: 'draw', label: 'Egal' },
                    ].map(({ val, label }) => (
                      <button
                        key={val}
                        onClick={() => setResultMutation.mutate({ smId: sm.id, winner: val })}
                        className="text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-3 py-1 rounded"
                      >
                        {label}
                      </button>
                    ))}
                    <button onClick={() => setSettingResultId(null)} className="text-xs text-gray-500 hover:text-white">
                      Anuleaza
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSettingResultId(sm.id)}
                    className="text-xs text-yellow-500 hover:text-yellow-400 mt-1"
                  >
                    + Seteaza rezultat si proceseaza pariuri
                  </button>
                )}

                {sm.match_id ? (
                  <button
                    onClick={() => unlinkMutation.mutate(sm.id)}
                    className="text-xs text-gray-500 hover:text-white mt-1 block"
                  >
                    Dezleaga de meci #{sm.match_id}
                  </button>
                ) : linkingId === sm.id ? (
                  <div className="flex items-center gap-2">
                    <select
                      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                      value={linkMatchId}
                      onChange={(e) => setLinkMatchId(e.target.value)}
                    >
                      <option value="">Selecteaza meci jucat</option>
                      {matches?.map((m) => (
                        <option key={m.id} value={m.id}>
                          #{m.id} — {m.map_name} {m.team1_score}-{m.team2_score} ({m.rounds_played}R)
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={!linkMatchId}
                      onClick={() => linkMutation.mutate({ smId: sm.id, matchId: Number(linkMatchId) })}
                      className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black font-bold px-3 py-1.5 rounded-lg text-xs"
                    >
                      Leaga
                    </button>
                    <button onClick={() => setLinkingId(null)} className="text-gray-500 hover:text-white text-xs">
                      Anuleaza
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setLinkingId(sm.id)}
                    className="text-xs text-yellow-500 hover:text-yellow-400"
                  >
                    + Leaga manual de un meci jucat
                  </button>
                )}
              </div>
            ))}

            {scheduledMatches?.length === 0 && (
              <div className="text-center text-gray-600 py-10">Niciun meci programat inca.</div>
            )}
          </div>
        </div>
      )}

      {/* UTILIZATORI TAB */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Promoveaza sau revoca drepturi de admin pentru useri.</p>
          {usersData?.map((u) => (
            <div key={u.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{u.display_name || u.email}</span>
                    {u.is_admin && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-700 px-2 py-0.5 rounded">Admin</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{u.email} · {u.points} puncte</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setResetPasswordId(resetPasswordId === u.id ? null : u.id); setNewPassword('') }}
                    className="text-sm px-3 py-1.5 rounded-lg font-medium bg-gray-800 text-gray-400 hover:text-white transition-colors"
                  >
                    Parola
                  </button>
                  <button
                    onClick={() => { if (confirm(`${u.is_admin ? 'Revoci' : 'Promovezi'} adminul pentru ${u.email}?`)) toggleAdminMutation.mutate(u.id) }}
                    className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${u.is_admin ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'}`}
                  >
                    {u.is_admin ? 'Revoca admin' : 'Fa admin'}
                  </button>
                </div>
              </div>

              {resetPasswordId === u.id && (
                <div className="flex items-center gap-2 pt-1 border-t border-gray-800">
                  <input
                    type="password"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500"
                    placeholder="Parola noua"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && newPassword.length >= 4) setPasswordMutation.mutate({ userId: u.id, password: newPassword }) }}
                  />
                  <button
                    disabled={newPassword.length < 4 || setPasswordMutation.isPending}
                    onClick={() => setPasswordMutation.mutate({ userId: u.id, password: newPassword })}
                    className="px-4 py-2 rounded-lg text-sm font-bold bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black transition-colors"
                  >
                    {setPasswordMutation.isPending ? '...' : 'Salveaza'}
                  </button>
                  <button onClick={() => { setResetPasswordId(null); setNewPassword('') }} className="text-gray-500 hover:text-white text-sm px-2">
                    ✕
                  </button>
                </div>
              )}
            </div>
          ))}
          {usersData?.length === 0 && (
            <div className="text-center text-gray-600 py-10">Niciun user inregistrat inca.</div>
          )}
        </div>
      )}

      {/* DATABASE TAB */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          <div
            className="rounded-xl p-5 flex items-center justify-between"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div>
              <div className="text-sm font-bold text-white mb-0.5">Backup baza de date</div>
              <div className="text-xs text-gray-500">Salveaza starea curenta a DB intr-un fisier de backup</div>
            </div>
            <button
              disabled={createBackupMutation.isPending}
              onClick={() => createBackupMutation.mutate()}
              className="px-5 py-2 rounded-lg text-sm font-bold bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black transition-colors"
            >
              {createBackupMutation.isPending ? 'Se salveaza...' : 'Backup acum'}
            </button>
          </div>

          {createBackupMutation.isSuccess && (
            <div className="text-sm text-green-400 bg-green-900/20 border border-green-800 rounded-xl px-4 py-3">
              Backup creat cu succes.
            </div>
          )}

          <div className="space-y-2">
            <div className="text-xs text-gray-500 uppercase font-medium tracking-wide">Backup-uri disponibile</div>
            {dbBackups?.length === 0 && (
              <div className="text-center text-gray-600 py-10">Niciun backup inca.</div>
            )}
            {dbBackups?.map((b) => (
              <div
                key={b.filename}
                className="rounded-xl px-4 py-3 flex items-center justify-between"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div>
                  <div className="text-sm text-white font-mono">{b.filename}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {new Date(b.created_at).toLocaleString('ro-RO', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })} · {b.size_kb} KB
                  </div>
                </div>
                <button
                  disabled={restoreBackupMutation.isPending}
                  onClick={() => {
                    if (confirm(`Restaurezi din ${b.filename}? Datele curente vor fi suprascrise.`)) {
                      restoreBackupMutation.mutate(b.filename)
                    }
                  }}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white transition-colors"
                >
                  Restaureaza
                </button>
              </div>
            ))}
          </div>

          {restoreBackupMutation.isSuccess && (
            <div className="text-sm text-green-400 bg-green-900/20 border border-green-800 rounded-xl px-4 py-3">
              Restaurat cu succes. Reincarca pagina pentru date actualizate.
            </div>
          )}
          {restoreBackupMutation.isError && (
            <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-xl px-4 py-3">
              Eroare la restaurare.
            </div>
          )}
        </div>
      )}

      {/* LOGURI TAB */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setLogActionFilter('')}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${!logActionFilter ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              Toate
            </button>
            {ALL_ACTIONS.map((a) => (
              <button
                key={a}
                onClick={() => setLogActionFilter(logActionFilter === a ? '' : a)}
                className={`px-3 py-1 rounded-lg text-xs font-medium border ${logActionFilter === a ? ACTION_COLORS[a] : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}
              >
                {a}
              </button>
            ))}
          </div>

          {logsData && (
            <div className="text-xs text-gray-600 mb-2">
              {logsData.total} intrari totale · afisate {logsData.logs.length} · auto-refresh 15s
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-900 text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-2">Actiune</th>
                  <th className="text-left px-4 py-2">Detalii</th>
                  <th className="text-left px-4 py-2 hidden sm:table-cell">IP</th>
                  <th className="text-left px-4 py-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {logsData?.logs.map((log) => (
                  <tr key={log.id} className="border-t border-gray-800 hover:bg-gray-800/40">
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded border text-xs font-mono ${ACTION_COLORS[log.action] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-300 max-w-xs truncate">{log.detail ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600 hidden sm:table-cell font-mono">{log.ip_address ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('ro-RO', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {logsData?.logs.length === 0 && (
              <div className="text-center text-gray-600 py-10">Niciun log inca.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
