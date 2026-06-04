"""Seed database with dummy CS2 data. Runs only if DB is empty."""
from datetime import datetime
from sqlalchemy.orm import Session
from models import Player, Match, PlayerMatchStat, ScheduledMatch, BetEntry


def seed(db: Session) -> None:
    if db.query(Player).count() > 0:
        return

    # ── Players ────────────────────────────────────────────────────────────
    players = [
        Player(id=1, steam_account_id="STEAM_xHunterRO",   steam_nickname="xHunterRO",   real_name="Andrei Popescu",  team_name="Alpha Squad"),
        Player(id=2, steam_account_id="STEAM_SilverKnight", steam_nickname="SilverKnight", real_name="Mihai Ionescu",   team_name="Alpha Squad"),
        Player(id=3, steam_account_id="STEAM_NightOwl_CS",  steam_nickname="NightOwl_CS",  real_name="Bogdan Radu",     team_name="Beta Force"),
        Player(id=4, steam_account_id="STEAM_FlashGod",     steam_nickname="FlashGod",     real_name="Cristian Stan",   team_name="Beta Force"),
        Player(id=5, steam_account_id="STEAM_PixelSniper",  steam_nickname="PixelSniper",  real_name="Vlad Georgescu",  team_name="Gamma Wolves"),
        Player(id=6, steam_account_id="STEAM_RushB_King",   steam_nickname="RushB_King",   real_name="Alexandru Marin", team_name="Gamma Wolves"),
    ]
    db.add_all(players)
    db.flush()

    # ── Matches ────────────────────────────────────────────────────────────
    matches = [
        Match(id=1, timestamp=datetime(2025, 5, 28, 19, 0), map_name="de_mirage",
              rounds_played=30, team1_score=16, team2_score=14,
              first_half_team1=9, first_half_team2=6, second_half_team1=7, second_half_team2=8),
        Match(id=2, timestamp=datetime(2025, 5, 25, 19, 30), map_name="de_inferno",
              rounds_played=26, team1_score=13, team2_score=13,
              first_half_team1=8, first_half_team2=7, second_half_team1=5, second_half_team2=6),
        Match(id=3, timestamp=datetime(2025, 5, 20, 20, 0), map_name="de_dust2",
              rounds_played=24, team1_score=16, team2_score=8,
              first_half_team1=10, first_half_team2=5, second_half_team1=6, second_half_team2=3),
    ]
    db.add_all(matches)
    db.flush()

    # ── PlayerMatchStats ───────────────────────────────────────────────────
    stats = [
        # Match 1 — de_mirage (Alpha Squad 16:14 Beta Force)
        PlayerMatchStat(player_id=1, match_id=1, team=1, won=True,  rounds_played=30, kills=24, deaths=14, assists=5,  headshot_kills=12, damage=3240, mvps=5, score=68, rounds_won=16, kills_2k=4, kills_3k=2, kills_4k=1, kills_5k=0, first_kills=6, utility_damage=210, enemies_flashed=18, clutch_1v1_wins=2, clutch_1v2_wins=1, entry_wins=5),
        PlayerMatchStat(player_id=2, match_id=1, team=1, won=True,  rounds_played=30, kills=19, deaths=16, assists=8,  headshot_kills=9,  damage=2780, mvps=3, score=54, rounds_won=16, kills_2k=3, kills_3k=1, kills_4k=0, kills_5k=0, first_kills=4, utility_damage=180, enemies_flashed=12, clutch_1v1_wins=1, clutch_1v2_wins=0, entry_wins=3),
        PlayerMatchStat(player_id=3, match_id=1, team=2, won=False, rounds_played=30, kills=18, deaths=20, assists=6,  headshot_kills=8,  damage=2540, mvps=2, score=49, rounds_won=14, kills_2k=2, kills_3k=1, kills_4k=0, kills_5k=0, first_kills=3, utility_damage=140, enemies_flashed=9,  clutch_1v1_wins=1, clutch_1v2_wins=0, entry_wins=2),
        PlayerMatchStat(player_id=4, match_id=1, team=2, won=False, rounds_played=30, kills=16, deaths=19, assists=11, headshot_kills=6,  damage=2310, mvps=2, score=48, rounds_won=14, kills_2k=2, kills_3k=0, kills_4k=0, kills_5k=0, first_kills=2, utility_damage=280, enemies_flashed=21, clutch_1v1_wins=0, clutch_1v2_wins=0, entry_wins=1),

        # Match 2 — de_inferno (Beta Force 13:13 Gamma Wolves)
        PlayerMatchStat(player_id=3, match_id=2, team=1, won=False, rounds_played=26, kills=20, deaths=17, assists=4,  headshot_kills=10, damage=2890, mvps=4, score=58, rounds_won=13, kills_2k=3, kills_3k=2, kills_4k=0, kills_5k=0, first_kills=5, utility_damage=160, enemies_flashed=14, clutch_1v1_wins=1, clutch_1v2_wins=0, entry_wins=4),
        PlayerMatchStat(player_id=4, match_id=2, team=1, won=False, rounds_played=26, kills=15, deaths=18, assists=12, headshot_kills=5,  damage=2100, mvps=1, score=43, rounds_won=13, kills_2k=2, kills_3k=0, kills_4k=0, kills_5k=0, first_kills=2, utility_damage=290, enemies_flashed=22, clutch_1v1_wins=0, clutch_1v2_wins=0, entry_wins=1),
        PlayerMatchStat(player_id=5, match_id=2, team=2, won=False, rounds_played=26, kills=17, deaths=19, assists=3,  headshot_kills=9,  damage=2430, mvps=3, score=48, rounds_won=13, kills_2k=2, kills_3k=1, kills_4k=0, kills_5k=0, first_kills=3, utility_damage=90,  enemies_flashed=7,  clutch_1v1_wins=1, clutch_1v2_wins=0, entry_wins=2),
        PlayerMatchStat(player_id=6, match_id=2, team=2, won=False, rounds_played=26, kills=14, deaths=20, assists=5,  headshot_kills=5,  damage=2010, mvps=1, score=37, rounds_won=13, kills_2k=1, kills_3k=0, kills_4k=0, kills_5k=0, first_kills=2, utility_damage=110, enemies_flashed=10, clutch_1v1_wins=0, clutch_1v2_wins=0, entry_wins=1),

        # Match 3 — de_dust2 (Alpha Squad 16:8 Gamma Wolves)
        PlayerMatchStat(player_id=1, match_id=3, team=1, won=True,  rounds_played=24, kills=22, deaths=10, assists=4,  headshot_kills=11, damage=2980, mvps=6, score=66, rounds_won=16, kills_2k=5, kills_3k=2, kills_4k=1, kills_5k=0, first_kills=7, utility_damage=190, enemies_flashed=15, clutch_1v1_wins=2, clutch_1v2_wins=1, entry_wins=6),
        PlayerMatchStat(player_id=2, match_id=3, team=1, won=True,  rounds_played=24, kills=18, deaths=11, assists=7,  headshot_kills=8,  damage=2420, mvps=3, score=54, rounds_won=16, kills_2k=3, kills_3k=1, kills_4k=0, kills_5k=0, first_kills=3, utility_damage=160, enemies_flashed=11, clutch_1v1_wins=1, clutch_1v2_wins=0, entry_wins=2),
        PlayerMatchStat(player_id=5, match_id=3, team=2, won=False, rounds_played=24, kills=12, deaths=20, assists=2,  headshot_kills=6,  damage=1680, mvps=1, score=33, rounds_won=8,  kills_2k=1, kills_3k=0, kills_4k=0, kills_5k=0, first_kills=1, utility_damage=70,  enemies_flashed=5,  clutch_1v1_wins=0, clutch_1v2_wins=0, entry_wins=1),
        PlayerMatchStat(player_id=6, match_id=3, team=2, won=False, rounds_played=24, kills=9,  deaths=20, assists=3,  headshot_kills=3,  damage=1290, mvps=0, score=24, rounds_won=8,  kills_2k=0, kills_3k=0, kills_4k=0, kills_5k=0, first_kills=1, utility_damage=80,  enemies_flashed=7,  clutch_1v1_wins=0, clutch_1v2_wins=0, entry_wins=1),
    ]
    db.add_all(stats)
    db.flush()

    # ── ScheduledMatches ───────────────────────────────────────────────────
    scheduled = [
        ScheduledMatch(id=101, team_a="Alpha Squad",  team_b="Beta Force",    scheduled_at=datetime(2025, 5, 28, 19, 0),  match_id=1, winner="team_a", bets_processed=True,  bracket_round=1, bracket_position=0),
        ScheduledMatch(id=102, team_a="Beta Force",   team_b="Gamma Wolves",  scheduled_at=datetime(2025, 5, 25, 19, 30), match_id=2, winner=None,     bets_processed=False, bracket_round=1, bracket_position=1),
        ScheduledMatch(id=103, team_a="Alpha Squad",  team_b="Gamma Wolves",  scheduled_at=datetime(2025, 5, 20, 20, 0),  match_id=3, winner="team_a", bets_processed=True,  bracket_round=2, bracket_position=0),
        ScheduledMatch(id=201, team_a="Alpha Squad",  team_b="Gamma Wolves",  scheduled_at=datetime(2030, 7, 15, 19, 0),  match_id=None, winner=None,  bets_processed=False, bracket_round=None, bracket_position=None),
        ScheduledMatch(id=202, team_a="Beta Force",   team_b="Alpha Squad",   scheduled_at=datetime(2030, 7, 22, 20, 0),  match_id=None, winner=None,  bets_processed=False, bracket_round=None, bracket_position=None),
    ]
    db.add_all(scheduled)
    db.flush()

    # ── Bet Leaderboard ────────────────────────────────────────────────────
    bet_entries = [
        BetEntry(display_name="Andrei P.",    points=87, bets_total=28, bets_won=19, bets_draw=3, bets_lost=6, bets_pending=0),
        BetEntry(display_name="Mihai I.",     points=74, bets_total=25, bets_won=16, bets_draw=2, bets_lost=7, bets_pending=0),
        BetEntry(display_name="Bogdan R.",    points=61, bets_total=22, bets_won=13, bets_draw=2, bets_lost=7, bets_pending=1),
        BetEntry(display_name="Cristian S.",  points=48, bets_total=20, bets_won=10, bets_draw=3, bets_lost=7, bets_pending=0),
        BetEntry(display_name="Vlad G.",      points=33, bets_total=18, bets_won=8,  bets_draw=1, bets_lost=9, bets_pending=0),
        BetEntry(display_name="Alexandru M.", points=21, bets_total=15, bets_won=5,  bets_draw=1, bets_lost=9, bets_pending=0),
    ]
    db.add_all(bet_entries)
    db.commit()
