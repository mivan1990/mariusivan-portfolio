from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


# ── CS2 models ─────────────────────────────────────────────────────────────

class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    steam_account_id = Column(String, unique=True, index=True)
    steam_nickname = Column(String)
    real_name = Column(String, nullable=True)
    team_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    match_stats = relationship("PlayerMatchStat", back_populates="player", cascade="all, delete-orphan")


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
    created_at = Column(DateTime, default=datetime.utcnow)

    player_stats = relationship("PlayerMatchStat", back_populates="match", cascade="all, delete-orphan")


class PlayerMatchStat(Base):
    __tablename__ = "player_match_stats"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id", ondelete="CASCADE"))
    match_id = Column(Integer, ForeignKey("matches.id", ondelete="CASCADE"))
    team = Column(Integer)
    won = Column(Boolean, default=False)
    rounds_played = Column(Integer, default=0)
    kills = Column(Integer, default=0)
    deaths = Column(Integer, default=0)
    assists = Column(Integer, default=0)
    headshot_kills = Column(Integer, default=0)
    damage = Column(Integer, default=0)
    mvps = Column(Integer, default=0)
    score = Column(Integer, default=0)
    rounds_won = Column(Integer, default=0)
    kills_2k = Column(Integer, default=0)
    kills_3k = Column(Integer, default=0)
    kills_4k = Column(Integer, default=0)
    kills_5k = Column(Integer, default=0)
    first_kills = Column(Integer, default=0)
    utility_damage = Column(Integer, default=0)
    enemies_flashed = Column(Integer, default=0)
    clutch_1v1_wins = Column(Integer, default=0)
    clutch_1v2_wins = Column(Integer, default=0)
    entry_wins = Column(Integer, default=0)

    player = relationship("Player", back_populates="match_stats")
    match = relationship("Match", back_populates="player_stats")


class ScheduledMatch(Base):
    __tablename__ = "scheduled_matches"

    id = Column(Integer, primary_key=True, index=True)
    team_a = Column(String, nullable=False)
    team_b = Column(String, nullable=False)
    scheduled_at = Column(DateTime, nullable=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=True)
    winner = Column(String, nullable=True)
    bets_processed = Column(Boolean, default=False)
    bracket_round = Column(Integer, nullable=True)
    bracket_position = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    match = relationship("Match", backref="scheduled_match", foreign_keys=[match_id])


class BetEntry(Base):
    """Pre-seeded bet leaderboard entries (no real user auth needed)."""
    __tablename__ = "bet_entries"

    id = Column(Integer, primary_key=True, index=True)
    display_name = Column(String, nullable=False)
    points = Column(Integer, default=0)
    bets_total = Column(Integer, default=0)
    bets_won = Column(Integer, default=0)
    bets_draw = Column(Integer, default=0)
    bets_lost = Column(Integer, default=0)
    bets_pending = Column(Integer, default=0)


# ── User / WorldCup models ──────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False, default="")
    display_name = Column(String, nullable=True)
    points = Column(Integer, default=100)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    wc_bets = relationship("WorldCupBet", back_populates="user", cascade="all, delete-orphan")


class WorldCupMatch(Base):
    __tablename__ = "worldcup_matches"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(Integer, unique=True, index=True)
    home_team = Column(String, nullable=False)
    away_team = Column(String, nullable=False)
    home_team_code = Column(String, nullable=True)
    away_team_code = Column(String, nullable=True)
    scheduled_at = Column(DateTime, nullable=False)
    stage = Column(String, nullable=True)
    group = Column(String, nullable=True)
    status = Column(String, default="SCHEDULED")
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)
    result = Column(String, nullable=True)
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
    predicted_outcome = Column(String, nullable=False)
    points_earned = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    match = relationship("WorldCupMatch", back_populates="bets")
