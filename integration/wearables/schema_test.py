import sqlite3, pathlib
db=sqlite3.connect(':memory:')
base="(owner_id TEXT NOT NULL,source TEXT NOT NULL,source_record_id TEXT NOT NULL,metric TEXT NOT NULL,start_time TEXT NOT NULL,end_time TEXT NOT NULL,value REAL NOT NULL,unit TEXT NOT NULL,recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(owner_id,source,source_record_id,metric))"
for name in ('wearable_readings','wearable_extra_readings'): db.execute('CREATE TABLE '+name+base)
db.executescript(pathlib.Path(__file__).with_name('sport-migration.sql').read_text())
sql="INSERT INTO wearable_sport_readings(owner_id,source,source_record_id,metric,start_time,end_time,value,unit) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(owner_id,source,source_record_id,metric) DO UPDATE SET value=excluded.value"
row=('synthetic-owner','com.example.synthetic','record-1','power','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z',90,'watts')
db.execute(sql,row); db.execute(sql,row)
assert db.execute('SELECT COUNT(*) FROM wearable_all_readings').fetchone()[0]==1
db.execute(sql,('other-owner',)+row[1:])
assert db.execute('SELECT COUNT(*) FROM wearable_all_readings').fetchone()[0]==2
try: db.execute(sql,row[:3]+('unknown',)+row[4:])
except sqlite3.IntegrityError: pass
else: raise AssertionError('Unknown metric accepted')
assert db.execute("SELECT COUNT(*) FROM wearable_all_readings WHERE owner_id='synthetic-owner'").fetchone()[0]==1
print('PASS: isolated SQLite migration, deduplication, owner separation and metric constraint.')
