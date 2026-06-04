"""Seed database with dummy CS2 data. Runs only if DB is empty."""
from datetime import datetime
from sqlalchemy.orm import Session
from models import Player, Match, PlayerMatchStat, ScheduledMatch, BetEntry


def seed(db: Session) -> None:
    if db.query(Player).count() > 0:
        return

    # ── Players ────────────────────────────────────────────────────────────
    players = [
        Player(id=1, steam_account_id="STEAM_xHunterRO",    steam_nickname="xHunterRO",    real_name="Andrei Popescu",   team_name="Alpha Squad"),
        Player(id=2, steam_account_id="STEAM_SilverKnight",  steam_nickname="SilverKnight",  real_name="Mihai Ionescu",    team_name="Alpha Squad"),
        Player(id=3, steam_account_id="STEAM_NightOwl_CS",   steam_nickname="NightOwl_CS",   real_name="Bogdan Radu",      team_name="Beta Force"),
        Player(id=4, steam_account_id="STEAM_FlashGod",      steam_nickname="FlashGod",      real_name="Cristian Stan",    team_name="Beta Force"),
        Player(id=5, steam_account_id="STEAM_PixelSniper",   steam_nickname="PixelSniper",   real_name="Vlad Georgescu",   team_name="Gamma Wolves"),
        Player(id=6, steam_account_id="STEAM_RushB_King",    steam_nickname="RushB_King",    real_name="Alexandru Marin",  team_name="Gamma Wolves"),
        Player(id=7, steam_account_id="STEAM_ShadowAce",     steam_nickname="ShadowAce",     real_name="Razvan Dobre",     team_name="Delta Strike"),
        Player(id=8, steam_account_id="STEAM_IceWall",       steam_nickname="IceWall",       real_name="Ionut Petrescu",   team_name="Delta Strike"),
        Player(id=9, steam_account_id="STEAM_TacticalGhost", steam_nickname="TacticalGhost", real_name="Marian Costea",    team_name="Epsilon Crew"),
        Player(id=10, steam_account_id="STEAM_BulletStorm",  steam_nickname="BulletStorm",   real_name="Florin Neagu",     team_name="Epsilon Crew"),
    ]
    db.add_all(players)
    db.flush()

    # ── Matches ────────────────────────────────────────────────────────────
    matches = [
        Match(id=1, timestamp=datetime(2025, 5, 28, 19, 0),  map_name="de_mirage",   rounds_played=30, team1_score=16, team2_score=14, first_half_team1=9,  first_half_team2=6,  second_half_team1=7, second_half_team2=8),
        Match(id=2, timestamp=datetime(2025, 5, 25, 19, 30), map_name="de_inferno",  rounds_played=26, team1_score=13, team2_score=13, first_half_team1=8,  first_half_team2=7,  second_half_team1=5, second_half_team2=6),
        Match(id=3, timestamp=datetime(2025, 5, 20, 20, 0),  map_name="de_dust2",    rounds_played=24, team1_score=16, team2_score=8,  first_half_team1=10, first_half_team2=5,  second_half_team1=6, second_half_team2=3),
        Match(id=4, timestamp=datetime(2025, 5, 15, 19, 0),  map_name="de_nuke",     rounds_played=32, team1_score=16, team2_score=16, first_half_team1=7,  first_half_team2=9,  second_half_team1=9, second_half_team2=7),
        Match(id=5, timestamp=datetime(2025, 5, 10, 20, 0),  map_name="de_ancient",  rounds_played=28, team1_score=16, team2_score=12, first_half_team1=11, first_half_team2=4,  second_half_team1=5, second_half_team2=8),
        Match(id=6, timestamp=datetime(2025, 5,  5, 19, 30), map_name="de_overpass", rounds_played=25, team1_score=16, team2_score=9,  first_half_team1=8,  first_half_team2=7,  second_half_team1=8, second_half_team2=2),
        Match(id=7, timestamp=datetime(2025, 4, 28, 20, 0),  map_name="de_anubis",   rounds_played=29, team1_score=15, team2_score=14, first_half_team1=6,  first_half_team2=9,  second_half_team1=9, second_half_team2=5),
        Match(id=8, timestamp=datetime(2025, 4, 20, 19, 0),  map_name="de_mirage",   rounds_played=22, team1_score=16, team2_score=6,  first_half_team1=10, first_half_team2=5,  second_half_team1=6, second_half_team2=1),
    ]
    db.add_all(matches)
    db.flush()

    # ── PlayerMatchStats ───────────────────────────────────────────────────
    stats = [
        # Match 1 — de_mirage: Alpha Squad 16:14 Beta Force
        PlayerMatchStat(player_id=1, match_id=1, team=1, won=True,  rounds_played=30, kills=24, deaths=14, assists=5,  headshot_kills=12, damage=3240, mvps=5, score=68, rounds_won=16, kills_2k=4, kills_3k=2, kills_4k=1, kills_5k=0, first_kills=6, utility_damage=210, enemies_flashed=18, clutch_1v1_wins=2, clutch_1v2_wins=1, entry_wins=5),
        PlayerMatchStat(player_id=2, match_id=1, team=1, won=True,  rounds_played=30, kills=19, deaths=16, assists=8,  headshot_kills=9,  damage=2780, mvps=3, score=54, rounds_won=16, kills_2k=3, kills_3k=1, kills_4k=0, kills_5k=0, first_kills=4, utility_damage=180, enemies_flashed=12, clutch_1v1_wins=1, clutch_1v2_wins=0, entry_wins=3),
        PlayerMatchStat(player_id=3, match_id=1, team=2, won=False, rounds_played=30, kills=18, deaths=20, assists=6,  headshot_kills=8,  damage=2540, mvps=2, score=49, rounds_won=14, kills_2k=2, kills_3k=1, kills_4k=0, kills_5k=0, first_kills=3, utility_damage=140, enemies_flashed=9,  clutch_1v1_wins=1, clutch_1v2_wins=0, entry_wins=2),
        PlayerMatchStat(player_id=4, match_id=1, team=2, won=False, rounds_played=30, kills=16, deaths=19, assists=11, headshot_kills=6,  damage=2310, mvps=2, score=48, rounds_won=14, kills_2k=2, kills_3k=0, kills_4k=0, kills_5k=0, first_kills=2, utility_damage=280, enemies_flashed=21, clutch_1v1_wins=0, clutch_1v2_wins=0, entry_wins=1),

        # Match 2 — de_inferno: Beta Force 13:13 Gamma Wolves
        PlayerMatchStat(player_id=3, match_id=2, team=1, won=False, rounds_played=26, kills=20, deaths=17, assists=4,  headshot_kills=10, damage=2890, mvps=4, score=58, rounds_won=13, kills_2k=3, kills_3k=2, kills_4k=0, kills_5k=0, first_kills=5, utility_damage=160, enemies_flashed=14, clutch_1v1_wins=1, clutch_1v2_wins=0, entry_wins=4),
        PlayerMatchStat(player_id=4, match_id=2, team=1, won=False, rounds_played=26, kills=15, deaths=18, assists=12, headshot_kills=5,  damage=2100, mvps=1, score=43, rounds_won=13, kills_2k=2, kills_3k=0, kills_4k=0, kills_5k=0, first_kills=2, utility_damage=290, enemies_flashed=22, clutch_1v1_wins=0, clutch_1v2_wins=0, entry_wins=1),
        PlayerMatchStat(player_id=5, match_id=2, team=2, won=False, rounds_played=26, kills=17, deaths=19, assists=3,  headshot_kills=9,  damage=2430, mvps=3, score=48, rounds_won=13, kills_2k=2, kills_3k=1, kills_4k=0, kills_5k=0, first_kills=3, utility_damage=90,  enemies_flashed=7,  clutch_1v1_wins=1, clutch_1v2_wins=0, entry_wins=2),
        PlayerMatchStat(player_id=6, match_id=2, team=2, won=False, rounds_played=26, kills=14, deaths=20, assists=5,  headshot_kills=5,  damage=2010, mvps=1, score=37, rounds_won=13, kills_2k=1, kills_3k=0, kills_4k=0, kills_5k=0, first_kills=2, utility_damage=110, enemies_flashed=10, clutch_1v1_wins=0, clutch_1v2_wins=0, entry_wins=1),

        # Match 3 — de_dust2: Alpha Squad 16:8 Gamma Wolves
        PlayerMatchStat(player_id=1, match_id=3, team=1, won=True,  rounds_played=24, kills=22, deaths=10, assists=4,  headshot_kills=11, damage=2980, mvps=6, score=66, rounds_won=16, kills_2k=5, kills_3k=2, kills_4k=1, kills_5k=0, first_kills=7, utility_damage=190, enemies_flashed=15, clutch_1v1_wins=2, clutch_1v2_wins=1, entry_wins=6),
        PlayerMatchStat(player_id=2, match_id=3, team=1, won=True,  rounds_played=24, kills=18, deaths=11, assists=7,  headshot_kills=8,  damage=2420, mvps=3, score=54, rounds_won=16, kills_2k=3, kills_3k=1, kills_4k=0, kills_5k=0, first_kills=3, utility_damage=160, enemies_flashed=11, clutch_1v1_wins=1, clutch_1v2_wins=0, entry_wins=2),
        PlayerMatchStat(player_id=5, match_id=3, team=2, won=False, rounds_played=24, kills=12, deaths=20, assists=2,  headshot_kills=6,  damage=1680, mvps=1, score=33, rounds_won=8,  kills_2k=1, kills_3k=0, kills_4k=0, kills_5k=0, first_kills=1, utility_damage=70,  enemies_flashed=5,  clutch_1v1_wins=0, clutch_1v2_wins=0, entry_wins=1),
        PlayerMatchStat(player_id=6, match_id=3, team=2, won=False, rounds_played=24, kills=9,  deaths=20, assists=3,  headshot_kills=3,  damage=1290, mvps=0, score=24, rounds_won=8,  kills_2k=0, kills_3k=0, kills_4k=0, kills_5k=0, first_kills=1, utility_damage=80,  enemies_flashed=7,  clutch_1v1_wins=0, clutch_1v2_wins=0, entry_wins=1),

        # Match 4 — de_nuke: Delta Strike 16:16 Epsilon Crew
        PlayerMatchStat(player_id=7, match_id=4, team=1, won=False, rounds_played=32, kills=21, deaths=18, assists=7,  headshot_kills=13, damage=3010, mvps=4, score=62, rounds_won=16, kills_2k=3, kills_3k=2, kills_4k=1, kills_5k=0, first_kills=5, utility_damage=220, enemies_flashed=16, clutch_1v1_wins=2, clutch_1v2_wins=1, entry_wins=4),
        PlayerMatchStat(player_id=8, match_id=4, team=1, won=False, rounds_played=32, kills=17, deaths=20, assists=9,  headshot_kills=7,  damage=2560, mvps=2, score=51, rounds_won=16, kills_2k=2, kills_3k=1, kills_4k=0, kills_5k=0, first_kills=3, utility_damage=310, enemies_flashed=24, clutch_1v1_wins=1, clutch_1v2_wins=0, entry_wins=2),
        PlayerMatchStat(player_id=9, match_id=4, team=2, won=False, rounds_played=32, kills=23, deaths=16, assists=6,  headshot_kills=14, damage=3180, mvps=5, score=67, rounds_won=16, kills_2k=4, kills_3k=2, kills_4k=0, kills_5k=0, first_kills=6, utility_damage=180, enemies_flashed=13, clutch_1v1_wins=3, clutch_1v2_wins=1, entry_wins=5),
        PlayerMatchStat(player_id=10, match_id=4, team=2, won=False, rounds_played=32, kills=15, deaths=21, assists=11, headshot_kills=5, damage=2320, mvps=1, score=44, rounds_won=16, kills_2k=2, kills_3k=0, kills_4k=0, kills_5k=0, first_kills=2, utility_damage=260, enemies_flashed=19, clutch_1v1_wins=0, clutch_1v2_wins=0, entry_wins=1),

        # Match 5 — de_ancient: Alpha Squad 16:12 Delta Strike
        PlayerMatchStat(player_id=1, match_id=5, team=1, won=True,  rounds_played=28, kills=26, deaths=12, assists=6,  headshot_kills=15, damage=3420, mvps=7, score=74, rounds_won=16, kills_2k=5, kills_3k=3, kills_4k=1, kills_5k=1, first_kills=8, utility_damage=230, enemies_flashed=17, clutch_1v1_wins=3, clutch_1v2_wins=1, entry_wins=7),
        PlayerMatchStat(player_id=2, match_id=5, team=1, won=True,  rounds_played=28, kills=20, deaths=15, assists=9,  headshot_kills=10, damage=2810, mvps=3, score=58, rounds_won=16, kills_2k=3, kills_3k=1, kills_4k=0, kills_5k=0, first_kills=4, utility_damage=190, enemies_flashed=13, clutch_1v1_wins=1, clutch_1v2_wins=0, entry_wins=3),
        PlayerMatchStat(player_id=7, match_id=5, team=2, won=False, rounds_played=28, kills=19, deaths=21, assists=5,  headshot_kills=9,  damage=2640, mvps=3, score=52, rounds_won=12, kills_2k=3, kills_3k=1, kills_4k=0, kills_5k=0, first_kills=4, utility_damage=200, enemies_flashed=14, clutch_1v1_wins=1, clutch_1v2_wins=0, entry_wins=3),
        PlayerMatchStat(player_id=8, match_id=5, team=2, won=False, rounds_played=28, kills=14, deaths=22, assists=8,  headshot_kills=5,  damage=2150, mvps=1, score=40, rounds_won=12, kills_2k=1, kills_3k=0, kills_4k=0, kills_5k=0, first_kills=2, utility_damage=280, enemies_flashed=20, clutch_1v1_wins=0, clutch_1v2_wins=0, entry_wins=1),

        # Match 6 — de_overpass: Epsilon Crew 16:9 Gamma Wolves
        PlayerMatchStat(player_id=9, match_id=6, team=1, won=True,  rounds_played=25, kills=22, deaths=13, assists=7,  headshot_kills=12, damage=3050, mvps=5, score=64, rounds_won=16, kills_2k=4, kills_3k=2, kills_4k=1, kills_5k=0, first_kills=6, utility_damage=170, enemies_flashed=12, clutch_1v1_wins=2, clutch_1v2_wins=1, entry_wins=5),
        PlayerMatchStat(player_id=10, match_id=6, team=1, won=True, rounds_played=25, kills=16, deaths=15, assists=10, headshot_kills=6,  damage=2380, mvps=2, score=49, rounds_won=16, kills_2k=2, kills_3k=1, kills_4k=0, kills_5k=0, first_kills=3, utility_damage=240, enemies_flashed=18, clutch_1v1_wins=1, clutch_1v2_wins=0, entry_wins=2),
        PlayerMatchStat(player_id=5, match_id=6, team=2, won=False, rounds_played=25, kills=13, deaths=21, assists=4,  headshot_kills=7,  damage=1920, mvps=1, score=35, rounds_won=9,  kills_2k=1, kills_3k=0, kills_4k=0, kills_5k=0, first_kills=2, utility_damage=100, enemies_flashed=8,  clutch_1v1_wins=0, clutch_1v2_wins=0, entry_wins=1),
        PlayerMatchStat(player_id=6, match_id=6, team=2, won=False, rounds_played=25, kills=10, deaths=22, assists=3,  headshot_kills=4,  damage=1540, mvps=0, score=27, rounds_won=9,  kills_2k=1, kills_3k=0, kills_4k=0, kills_5k=0, first_kills=1, utility_damage=90,  enemies_flashed=6,  clutch_1v1_wins=0, clutch_1v2_wins=0, entry_wins=0),

        # Match 7 — de_anubis: Beta Force 15:14 Delta Strike
        PlayerMatchStat(player_id=3, match_id=7, team=1, won=True,  rounds_played=29, kills=21, deaths=16, assists=5,  headshot_kills=11, damage=2920, mvps=4, score=60, rounds_won=15, kills_2k=3, kills_3k=2, kills_4k=0, kills_5k=0, first_kills=5, utility_damage=150, enemies_flashed=11, clutch_1v1_wins=2, clutch_1v2_wins=0, entry_wins=4),
        PlayerMatchStat(player_id=4, match_id=7, team=1, won=True,  rounds_played=29, kills=16, deaths=17, assists=13, headshot_kills=6,  damage=2240, mvps=2, score=47, rounds_won=15, kills_2k=2, kills_3k=0, kills_4k=0, kills_5k=0, first_kills=2, utility_damage=310, enemies_flashed=25, clutch_1v1_wins=1, clutch_1v2_wins=0, entry_wins=2),
        PlayerMatchStat(player_id=7, match_id=7, team=2, won=False, rounds_played=29, kills=18, deaths=20, assists=6,  headshot_kills=10, damage=2610, mvps=3, score=53, rounds_won=14, kills_2k=3, kills_3k=1, kills_4k=0, kills_5k=0, first_kills=4, utility_damage=190, enemies_flashed=13, clutch_1v1_wins=1, clutch_1v2_wins=0, entry_wins=3),
        PlayerMatchStat(player_id=8, match_id=7, team=2, won=False, rounds_played=29, kills=13, deaths=21, assists=7,  headshot_kills=5,  damage=1980, mvps=1, score=37, rounds_won=14, kills_2k=1, kills_3k=0, kills_4k=0, kills_5k=0, first_kills=2, utility_damage=260, enemies_flashed=18, clutch_1v1_wins=0, clutch_1v2_wins=0, entry_wins=1),

        # Match 8 — de_mirage: Epsilon Crew 16:6 Beta Force
        PlayerMatchStat(player_id=9,  match_id=8, team=1, won=True,  rounds_played=22, kills=20, deaths=9,  assists=5,  headshot_kills=13, damage=2870, mvps=6, score=64, rounds_won=16, kills_2k=4, kills_3k=3, kills_4k=1, kills_5k=0, first_kills=7, utility_damage=160, enemies_flashed=11, clutch_1v1_wins=2, clutch_1v2_wins=1, entry_wins=5),
        PlayerMatchStat(player_id=10, match_id=8, team=1, won=True,  rounds_played=22, kills=15, deaths=10, assists=8,  headshot_kills=6,  damage=2180, mvps=2, score=48, rounds_won=16, kills_2k=2, kills_3k=1, kills_4k=0, kills_5k=0, first_kills=3, utility_damage=220, enemies_flashed=15, clutch_1v1_wins=1, clutch_1v2_wins=0, entry_wins=2),
        PlayerMatchStat(player_id=3,  match_id=8, team=2, won=False, rounds_played=22, kills=11, deaths=20, assists=3,  headshot_kills=5,  damage=1620, mvps=1, score=30, rounds_won=6,  kills_2k=1, kills_3k=0, kills_4k=0, kills_5k=0, first_kills=1, utility_damage=110, enemies_flashed=7,  clutch_1v1_wins=0, clutch_1v2_wins=0, entry_wins=1),
        PlayerMatchStat(player_id=4,  match_id=8, team=2, won=False, rounds_played=22, kills=8,  deaths=20, assists=6,  headshot_kills=3,  damage=1340, mvps=0, score=22, rounds_won=6,  kills_2k=0, kills_3k=0, kills_4k=0, kills_5k=0, first_kills=1, utility_damage=200, enemies_flashed=16, clutch_1v1_wins=0, clutch_1v2_wins=0, entry_wins=0),
    ]
    db.add_all(stats)
    db.flush()

    # ── ScheduledMatches ───────────────────────────────────────────────────
    scheduled = [
        ScheduledMatch(id=101, team_a="Alpha Squad",   team_b="Beta Force",    scheduled_at=datetime(2025, 5, 28, 19, 0),  match_id=1, winner="team_a", bets_processed=True,  bracket_round=1, bracket_position=0),
        ScheduledMatch(id=102, team_a="Beta Force",    team_b="Gamma Wolves",  scheduled_at=datetime(2025, 5, 25, 19, 30), match_id=2, winner=None,     bets_processed=False, bracket_round=1, bracket_position=1),
        ScheduledMatch(id=103, team_a="Alpha Squad",   team_b="Gamma Wolves",  scheduled_at=datetime(2025, 5, 20, 20, 0),  match_id=3, winner="team_a", bets_processed=True,  bracket_round=2, bracket_position=0),
        ScheduledMatch(id=104, team_a="Delta Strike",  team_b="Epsilon Crew",  scheduled_at=datetime(2025, 5, 15, 19, 0),  match_id=4, winner=None,     bets_processed=False, bracket_round=1, bracket_position=2),
        ScheduledMatch(id=105, team_a="Alpha Squad",   team_b="Delta Strike",  scheduled_at=datetime(2025, 5, 10, 20, 0),  match_id=5, winner="team_a", bets_processed=True,  bracket_round=2, bracket_position=1),
        ScheduledMatch(id=106, team_a="Epsilon Crew",  team_b="Gamma Wolves",  scheduled_at=datetime(2025, 5,  5, 19, 30), match_id=6, winner="team_a", bets_processed=True,  bracket_round=None, bracket_position=None),
        ScheduledMatch(id=107, team_a="Beta Force",    team_b="Delta Strike",  scheduled_at=datetime(2025, 4, 28, 20, 0),  match_id=7, winner="team_a", bets_processed=True,  bracket_round=None, bracket_position=None),
        ScheduledMatch(id=108, team_a="Epsilon Crew",  team_b="Beta Force",    scheduled_at=datetime(2025, 4, 20, 19, 0),  match_id=8, winner="team_a", bets_processed=True,  bracket_round=None, bracket_position=None),
        # Viitoare (pentru betting)
        ScheduledMatch(id=201, team_a="Alpha Squad",   team_b="Epsilon Crew",  scheduled_at=datetime(2030, 7, 15, 19, 0),  match_id=None, winner=None,  bets_processed=False, bracket_round=None, bracket_position=None),
        ScheduledMatch(id=202, team_a="Beta Force",    team_b="Delta Strike",  scheduled_at=datetime(2030, 7, 22, 20, 0),  match_id=None, winner=None,  bets_processed=False, bracket_round=None, bracket_position=None),
        ScheduledMatch(id=203, team_a="Gamma Wolves",  team_b="Epsilon Crew",  scheduled_at=datetime(2030, 7, 29, 19, 30), match_id=None, winner=None,  bets_processed=False, bracket_round=None, bracket_position=None),
        ScheduledMatch(id=204, team_a="Alpha Squad",   team_b="Delta Strike",  scheduled_at=datetime(2030, 8,  5, 20, 0),  match_id=None, winner=None,  bets_processed=False, bracket_round=None, bracket_position=None),
    ]
    db.add_all(scheduled)
    db.flush()

    # ── Bet Leaderboard ────────────────────────────────────────────────────
    bet_entries = [
        BetEntry(display_name="xHunterRO",     points=124, bets_total=42, bets_won=28, bets_draw=4, bets_lost=10, bets_pending=0),
        BetEntry(display_name="SilverKnight",  points=108, bets_total=38, bets_won=24, bets_draw=3, bets_lost=11, bets_pending=0),
        BetEntry(display_name="TacticalGhost", points=97,  bets_total=35, bets_won=21, bets_draw=3, bets_lost=11, bets_pending=0),
        BetEntry(display_name="NightOwl_CS",   points=83,  bets_total=32, bets_won=18, bets_draw=2, bets_lost=12, bets_pending=0),
        BetEntry(display_name="ShadowAce",     points=71,  bets_total=30, bets_won=15, bets_draw=4, bets_lost=11, bets_pending=0),
        BetEntry(display_name="FlashGod",      points=58,  bets_total=28, bets_won=12, bets_draw=3, bets_lost=13, bets_pending=0),
        BetEntry(display_name="BulletStorm",   points=45,  bets_total=25, bets_won=10, bets_draw=2, bets_lost=13, bets_pending=0),
        BetEntry(display_name="PixelSniper",   points=33,  bets_total=22, bets_won=8,  bets_draw=1, bets_lost=13, bets_pending=0),
        BetEntry(display_name="RushB_King",    points=21,  bets_total=18, bets_won=5,  bets_draw=1, bets_lost=12, bets_pending=0),
        BetEntry(display_name="IceWall",       points=12,  bets_total=15, bets_won=3,  bets_draw=1, bets_lost=11, bets_pending=0),
    ]
    db.add_all(bet_entries)
    db.commit()
