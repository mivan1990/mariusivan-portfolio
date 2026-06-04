"""
Migrare: face scheduled_at nullable in tabelul scheduled_matches.
Ruleaza o singura data pe server: python migrate_nullable_scheduled_at.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "cs2leaderboard.db")

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.executescript("""
PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS scheduled_matches_new (
    id INTEGER PRIMARY KEY,
    team_a VARCHAR NOT NULL,
    team_b VARCHAR NOT NULL,
    scheduled_at DATETIME,
    match_id INTEGER REFERENCES matches(id),
    winner VARCHAR,
    bets_processed BOOLEAN DEFAULT 0,
    created_at DATETIME
);

INSERT INTO scheduled_matches_new
    SELECT id, team_a, team_b, scheduled_at, match_id, winner, bets_processed, created_at
    FROM scheduled_matches;

DROP TABLE scheduled_matches;

ALTER TABLE scheduled_matches_new RENAME TO scheduled_matches;

PRAGMA foreign_keys = ON;
""")

conn.commit()
conn.close()
print("Migrare finalizata: scheduled_at este acum nullable.")
