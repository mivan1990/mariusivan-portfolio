"""
Migrare: adauga campurile duration, extra_time_home/away, penalties_home/away
in tabelul worldcup_matches.
Ruleaza o singura data pe server: python migrate_worldcup_fields.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "cs2leaderboard.db")

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

existing = {row[1] for row in cur.execute("PRAGMA table_info(worldcup_matches)")}

migrations = [
    ("duration",         "ALTER TABLE worldcup_matches ADD COLUMN duration VARCHAR"),
    ("extra_time_home",  "ALTER TABLE worldcup_matches ADD COLUMN extra_time_home INTEGER"),
    ("extra_time_away",  "ALTER TABLE worldcup_matches ADD COLUMN extra_time_away INTEGER"),
    ("penalties_home",   "ALTER TABLE worldcup_matches ADD COLUMN penalties_home INTEGER"),
    ("penalties_away",   "ALTER TABLE worldcup_matches ADD COLUMN penalties_away INTEGER"),
]

for col, sql in migrations:
    if col not in existing:
        cur.execute(sql)
        print(f"  + {col} adaugat")
    else:
        print(f"  ~ {col} exista deja, skip")

conn.commit()
conn.close()
print("Migrare finalizata.")
