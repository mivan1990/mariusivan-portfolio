"""
Migration: adauga bracket_round si bracket_position la scheduled_matches.
Ruleaza o singura data: python migrate_bracket_positions.py
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
    created_at DATETIME,
    bracket_round INTEGER,
    bracket_position INTEGER
);

INSERT INTO scheduled_matches_new
    SELECT id, team_a, team_b, scheduled_at, match_id, winner, bets_processed, created_at, NULL, NULL
    FROM scheduled_matches;

DROP TABLE scheduled_matches;
ALTER TABLE scheduled_matches_new RENAME TO scheduled_matches;

PRAGMA foreign_keys = ON;
""")

# Asigna bracket_round=1 si pozitie meciurilor existente fara bracket info
rows = cur.execute(
    "SELECT id FROM scheduled_matches WHERE bracket_round IS NULL ORDER BY id"
).fetchall()
for i, (mid,) in enumerate(rows):
    cur.execute(
        "UPDATE scheduled_matches SET bracket_round=1, bracket_position=? WHERE id=?",
        (i, mid),
    )

conn.commit()
conn.close()
print(f"Migrare finalizata: bracket_round/bracket_position adaugate. {len(rows)} meciuri existente → runda 1.")
