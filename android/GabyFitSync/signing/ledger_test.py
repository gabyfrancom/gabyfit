import sqlite3,pathlib,re
source=pathlib.Path(__file__).parents[1].joinpath('app/src/main/java/com/gabyfit/sync/PendingQueue.kt').read_text()
def sql(prefix):
    matches=re.findall(r'"([^"\n]*'+re.escape(prefix)+r'[^"\n]*)"',source)
    assert len(matches)==1,(prefix,matches)
    return matches[0]
db=sqlite3.connect(':memory:')
db.execute(sql('CREATE TABLE outbox'))
db.execute(sql('CREATE TABLE IF NOT EXISTS acknowledged'))
def put(key,fp,payload):
    row=db.execute(sql('SELECT fingerprint FROM acknowledged'),(key,)).fetchone()
    if row and row[0]==fp:return False
    db.execute(sql('INSERT OR REPLACE INTO outbox'),(key,payload));db.commit();return True
def ack(key,fp,fail=False):
    try:
        with db:
            db.execute(sql('INSERT OR REPLACE INTO acknowledged'),(key,fp,1))
            if fail:raise RuntimeError('synthetic crash')
            db.execute(sql('DELETE FROM outbox WHERE'),(key,))
    except RuntimeError:pass
assert put('synthetic','v1','ciphertext-1')
assert put('synthetic','v1','ciphertext-retry')
assert db.execute('SELECT COUNT(*) FROM acknowledged').fetchone()[0]==0
ack('synthetic','v1',fail=True)
assert db.execute('SELECT COUNT(*) FROM acknowledged').fetchone()[0]==0
assert db.execute('SELECT COUNT(*) FROM outbox').fetchone()[0]==1
ack('synthetic','v1')
assert not put('synthetic','v1','same')
assert db.execute('SELECT COUNT(*) FROM outbox').fetchone()[0]==0
assert put('synthetic','v2','changed')
ack('synthetic','v2')
assert not put('synthetic','v2','same')
assert put('another-source-record','v2','different-record')
assert 'oldVersion < 2' in source
assert 'getDouble("value")' in source
print('PASS: actual outbox SQL, no skip before ACK, rollback, unchanged skip, changed resend and distinct IDs.')
