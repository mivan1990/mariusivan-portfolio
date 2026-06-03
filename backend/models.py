from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


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
