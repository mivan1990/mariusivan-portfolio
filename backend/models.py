from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    steam_account_id = Column(String, unique=True, index=True)
    steam_id64 = Column(String, unique=True, nullable=True)
    steam_nickname = Column(String)
    real_name = Column(String, nullable=True)
    team_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    aliases = Column(String, nullable=True)  # nicknames cunoscute, separate prin virgula
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    match_stats = relationship("PlayerMatchStat", back_populates="player", cascade="all, delete-orphan")


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, nullable=True)
    map_name = Column(String)
    rounds_played = Column(Integer, default=0)
    team1_score = Column(Integer, default=0)
    team2_score = Column(Integer, default=0)
    first_half_team1 = Column(Integer, default=0)
    first_half_team2 = Column(Integer, default=0)
    second_half_team1 = Column(Integer, default=0)
    second_half_team2 = Column(Integer, default=0)
    file_name = Column(String, nullable=True)
    session_id = Column(String, nullable=True, index=True)  # mtime round00 — identifica meciul live
    created_at = Column(DateTime, default=datetime.utcnow)

    player_stats = relationship("PlayerMatchStat", back_populates="match", cascade="all, delete-orphan")


class PlayerMatchStat(Base):
    __tablename__ = "player_match_stats"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id", ondelete="CASCADE"))
    match_id = Column(Integer, ForeignKey("matches.id", ondelete="CASCADE"))
    team = Column(Integer)        # 1 sau 2
    won = Column(Boolean, default=False)
    rounds_played = Column(Integer, default=0)

    # Stats de baza
    kills = Column(Integer, default=0)
    deaths = Column(Integer, default=0)
    assists = Column(Integer, default=0)
    headshot_kills = Column(Integer, default=0)
    damage = Column(Integer, default=0)
    mvps = Column(Integer, default=0)
    score = Column(Integer, default=0)
    rounds_won = Column(Integer, default=0)

    # Multi-kill rounds
    kills_2k = Column(Integer, default=0)
    kills_3k = Column(Integer, default=0)
    kills_4k = Column(Integer, default=0)
    kills_5k = Column(Integer, default=0)

    # Stats speciale
    first_kills = Column(Integer, default=0)
    clutch_kills = Column(Integer, default=0)
    entry_count = Column(Integer, default=0)
    entry_wins = Column(Integer, default=0)

    # Utility
    utility_damage = Column(Integer, default=0)
    enemies_flashed = Column(Integer, default=0)
    flash_count = Column(Integer, default=0)

    # Clutch 1v1 / 1v2
    clutch_1v1_count = Column(Integer, default=0)
    clutch_1v1_wins = Column(Integer, default=0)
    clutch_1v2_count = Column(Integer, default=0)
    clutch_1v2_wins = Column(Integer, default=0)

    # Kills pe arma
    kills_pistol = Column(Integer, default=0)
    kills_sniper = Column(Integer, default=0)
    kills_knife = Column(Integer, default=0)
    kills_taser = Column(Integer, default=0)

    player = relationship("Player", back_populates="match_stats")
    match = relationship("Match", back_populates="player_stats")


class ScheduledMatch(Base):
    __tablename__ = "scheduled_matches"

    id = Column(Integer, primary_key=True, index=True)
    team_a = Column(String, nullable=False)
    team_b = Column(String, nullable=False)
    scheduled_at = Column(DateTime, nullable=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=True)
    winner = Column(String, nullable=True)       # 'team_a', 'team_b', 'draw' — setat de admin dupa meci
    bets_processed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    bracket_round = Column(Integer, nullable=True)
    bracket_position = Column(Integer, nullable=True)

    match = relationship("Match", backref="scheduled_match", foreign_keys=[match_id])
    bets = relationship("Bet", back_populates="scheduled_match", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    display_name = Column(String, nullable=True)
    points = Column(Integer, default=0)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    bets = relationship("Bet", back_populates="user", cascade="all, delete-orphan")


class Bet(Base):
    __tablename__ = "bets"
    __table_args__ = (UniqueConstraint("user_id", "scheduled_match_id", name="uq_user_match"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    scheduled_match_id = Column(Integer, ForeignKey("scheduled_matches.id"), nullable=False)
    predicted_winner = Column(String, nullable=False)   # 'team_a' sau 'team_b'
    points_earned = Column(Integer, nullable=True)      # null pana la procesare
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="bets")
    scheduled_match = relationship("ScheduledMatch", back_populates="bets")


class PlayerBet(Base):
    __tablename__ = "player_bets"
    __table_args__ = (UniqueConstraint("user_id", "scheduled_match_id", name="uq_user_match_player"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    scheduled_match_id = Column(Integer, ForeignKey("scheduled_matches.id"), nullable=False)
    predicted_player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    points_earned = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    scheduled_match = relationship("ScheduledMatch")
    predicted_player = relationship("Player")


class WorldCupMatch(Base):
    __tablename__ = "worldcup_matches"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(Integer, unique=True, index=True)
    home_team = Column(String, nullable=False)
    away_team = Column(String, nullable=False)
    home_team_code = Column(String, nullable=True)   # TLA: BRA, ARG ...
    away_team_code = Column(String, nullable=True)
    scheduled_at = Column(DateTime, nullable=False)
    stage = Column(String, nullable=True)            # GROUP_STAGE, ROUND_OF_16 ...
    group = Column(String, nullable=True)            # Group A, Group B ...
    status = Column(String, default="SCHEDULED")     # SCHEDULED, IN_PLAY, FINISHED ...
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)
    result = Column(String, nullable=True)           # 'home_win', 'away_win', 'draw'
    bets_processed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    bets = relationship("WorldCupBet", back_populates="match", cascade="all, delete-orphan")


class WorldCupBet(Base):
    __tablename__ = "worldcup_bets"
    __table_args__ = (UniqueConstraint("user_id", "match_id", name="uq_wc_user_match"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    match_id = Column(Integer, ForeignKey("worldcup_matches.id"), nullable=False)
    predicted_outcome = Column(String, nullable=False)  # 'home_win', 'away_win', 'draw'
    points_earned = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    match = relationship("WorldCupMatch", back_populates="bets")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)
    detail = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class BetEntry(Base):
    """Pre-seeded bet leaderboard entries for portfolio demo."""
    __tablename__ = "bet_entries"

    id = Column(Integer, primary_key=True, index=True)
    display_name = Column(String, nullable=False)
    points = Column(Integer, default=0)
    bets_total = Column(Integer, default=0)
    bets_won = Column(Integer, default=0)
    bets_draw = Column(Integer, default=0)
    bets_lost = Column(Integer, default=0)
    bets_pending = Column(Integer, default=0)
