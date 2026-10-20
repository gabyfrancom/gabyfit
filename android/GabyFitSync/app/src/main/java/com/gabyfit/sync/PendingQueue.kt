package com.gabyfit.sync

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONObject

/** Encrypted outbox; acknowledged fingerprints avoid retransmitting unchanged records. */
class PendingQueue(context: Context): SQLiteOpenHelper(context, "sync-outbox.db", null, 2) {
    private val secure = SecureSettings(context)
    init { setWriteAheadLoggingEnabled(true) }
    private fun acknowledgements(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE IF NOT EXISTS acknowledged (id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, confirmed_at INTEGER NOT NULL)")
        db.execSQL("CREATE INDEX IF NOT EXISTS acknowledged_age ON acknowledged(confirmed_at)")
    }
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE outbox (id TEXT PRIMARY KEY, payload TEXT NOT NULL)")
        acknowledgements(db)
    }
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        if (oldVersion < 2) acknowledgements(db)
    }
    private fun hash(value: String): String = java.security.MessageDigest.getInstance("SHA-256")
        .digest(value.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }
    private fun fingerprint(r: JSONObject): String {
        val fields = listOf("source","metric","source_record_id","start_time","end_time","unit").map { r.getString(it) }
        return hash((fields + r.getDouble("value").toString()).joinToString("\u0000"))
    }
    fun put(record: JSONObject) {
        val identity = record.getString("source") + ":" + record.getString("metric") + ":" + record.getString("source_record_id")
        val id = hash(identity)
        val fp = fingerprint(record)
        val db = writableDatabase
        db.rawQuery("SELECT fingerprint FROM acknowledged WHERE id=?", arrayOf(id)).use { c ->
            if (c.moveToFirst() && c.getString(0) == fp) return
        }
        db.execSQL("INSERT OR REPLACE INTO outbox(id,payload) VALUES (?,?)", arrayOf(id, secure.encrypt(record.toString())))
    }
    fun first(): List<Pair<String, JSONObject>> {
        val result = mutableListOf<Pair<String, JSONObject>>()
        readableDatabase.rawQuery("SELECT id,payload FROM outbox ORDER BY id LIMIT 100", null).use { c ->
            while (c.moveToNext()) {
                val plain = secure.decrypt(c.getString(1)) ?: error("No se pudo descifrar la cola; conserva la instalación y revisa Android Keystore")
                result.add(c.getString(0) to JSONObject(plain))
            }
        }
        return result
    }
    fun acknowledge(rows: List<Pair<String, JSONObject>>) {
        val db = writableDatabase
        db.beginTransaction()
        try {
            rows.forEach {
                db.execSQL("INSERT OR REPLACE INTO acknowledged(id,fingerprint,confirmed_at) VALUES (?,?,?)",
                    arrayOf(it.first, fingerprint(it.second), System.currentTimeMillis()))
                db.execSQL("DELETE FROM outbox WHERE id=?", arrayOf(it.first))
            }
            db.execSQL("DELETE FROM acknowledged WHERE confirmed_at < ?", arrayOf(System.currentTimeMillis() - 14L*86400000L))
            db.setTransactionSuccessful()
        } finally { db.endTransaction() }
    }
}
