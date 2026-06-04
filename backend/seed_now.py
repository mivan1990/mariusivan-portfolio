"""Truncate all tables and re-seed with dummy data."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from database import engine, Base, SessionLocal
import models  # noqa
from seed import seed

Base.metadata.create_all(bind=engine)

db = SessionLocal()
try:
    # Truncate all CS2 tables
    db.query(models.BetEntry).delete()
    db.query(models.PlayerMatchStat).delete()
    db.query(models.PlayerBet).delete()
    db.query(models.Bet).delete()
    db.query(models.ScheduledMatch).delete()
    db.query(models.Match).delete()
    db.query(models.Player).delete()
    db.query(models.User).filter(models.User.email == "demo@portfolio.ro").delete()
    db.query(models.ActivityLog).delete()
    db.commit()
    print("Cleared all tables.")
    seed(db)
    print(f"Done! Players: {db.query(models.Player).count()}, Users: {db.query(models.User).count()}")
finally:
    db.close()
