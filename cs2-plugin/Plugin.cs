using System.Net.Http;
using System.Text;
using System.Text.Json;
using CounterStrikeSharp.API;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Modules.Utils;

namespace CS2Leaderboard;

public class Plugin : BasePlugin
{
    public override string ModuleName => "CS2Leaderboard";
    public override string ModuleVersion => "1.0.0";
    public override string ModuleAuthor => "FEG";
    public override string ModuleDescription => "Trimite stats la leaderboard dupa fiecare runda";

    private readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(5) };
    private const string BackendUrl = "http://192.168.5.6:8000/api/gsi";
    private const string Token = "112233";

    private readonly Dictionary<ulong, int> _roundHs = new();
    private readonly Dictionary<ulong, int> _roundDmg = new();
    private int _roundNum = 0;

    public override void Load(bool hotReload)
    {
        RegisterEventHandler<EventRoundStart>(OnRoundStart);
        RegisterEventHandler<EventPlayerDeath>(OnPlayerDeath);
        RegisterEventHandler<EventPlayerHurt>(OnPlayerHurt);
        RegisterEventHandler<EventRoundEnd>(OnRoundEnd, HookMode.Post);
        RegisterEventHandler<EventCsWinPanelMatch>(OnMatchEnd);
        Console.WriteLine("[CS2Leaderboard] Plugin incarcat.");
    }

    private HookResult OnRoundStart(EventRoundStart @event, GameEventInfo info)
    {
        _roundHs.Clear();
        _roundDmg.Clear();
        _roundNum++;
        return HookResult.Continue;
    }

    private HookResult OnPlayerDeath(EventPlayerDeath @event, GameEventInfo info)
    {
        if (!@event.Headshot) return HookResult.Continue;
        var atk = @event.Attacker;
        if (atk is { IsValid: true, IsBot: false })
            _roundHs[atk.SteamID] = _roundHs.GetValueOrDefault(atk.SteamID) + 1;
        return HookResult.Continue;
    }

    private HookResult OnPlayerHurt(EventPlayerHurt @event, GameEventInfo info)
    {
        var atk = @event.Attacker;
        var vic = @event.Userid;
        if (atk is { IsValid: true, IsBot: false } && vic is { IsValid: true } && atk.SteamID != vic.SteamID)
            _roundDmg[atk.SteamID] = _roundDmg.GetValueOrDefault(atk.SteamID) + @event.DmgHealth;
        return HookResult.Continue;
    }

    private HookResult OnRoundEnd(EventRoundEnd @event, GameEventInfo info)
    {
        var payload = BuildPayload("live", "over");
        Task.Run(() => Post(payload));
        return HookResult.Continue;
    }

    private HookResult OnMatchEnd(EventCsWinPanelMatch @event, GameEventInfo info)
    {
        var payload = BuildPayload("gameover", "over");
        Task.Run(() => Post(payload));
        return HookResult.Continue;
    }

    private object BuildPayload(string mapPhase, string roundPhase)
    {
        var allPlayers = new Dictionary<string, object>();

        foreach (var p in Utilities.GetPlayers().Where(p =>
            p.IsValid && !p.IsBot && p.Connected == PlayerConnectedState.PlayerConnected))
        {
            var s = p.PlayerPawn.Value?.ActionTrackingServices?.MatchStats;
            allPlayers[p.SteamID.ToString()] = new
            {
                name = p.PlayerName,
                team = p.Team == CsTeam.CounterTerrorist ? "CT" : "T",
                match_stats = new
                {
                    kills   = s?.Kills   ?? 0,
                    assists = s?.Assists  ?? 0,
                    deaths  = s?.Deaths   ?? 0,
                    mvps    = s?.MVPs     ?? 0,
                    score   = s?.Score    ?? 0,
                },
                state = new
                {
                    round_kills    = 0,
                    round_killhs   = _roundHs.GetValueOrDefault(p.SteamID),
                    round_totaldmg = _roundDmg.GetValueOrDefault(p.SteamID),
                }
            };
        }

        int ctScore = 0, tScore = 0;
        foreach (var team in Utilities.FindAllEntitiesByDesignerName<CCSTeam>("cs_team_manager"))
        {
            if (team.TeamNum == (int)CsTeam.CounterTerrorist) ctScore = team.Score;
            else if (team.TeamNum == (int)CsTeam.Terrorist)   tScore  = team.Score;
        }

        return new
        {
            auth = new { token = Token },
            map = new
            {
                name    = Server.MapName,
                phase   = mapPhase,
                round   = _roundNum,
                team_ct = new { score = ctScore },
                team_t  = new { score = tScore }
            },
            round      = new { phase = roundPhase },
            allplayers = allPlayers
        };
    }

    private async Task Post(object payload)
    {
        try
        {
            var json = JsonSerializer.Serialize(payload);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");
            var resp = await _http.PostAsync(BackendUrl, content);
            Console.WriteLine($"[CS2Leaderboard] Trimis ({((dynamic)payload).map.phase}) → {(int)resp.StatusCode}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CS2Leaderboard] Eroare: {ex.Message}");
        }
    }
}
