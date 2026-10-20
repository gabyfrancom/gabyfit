package com.gabyfit.sync

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONObject

/** Ciphertext only; backups disabled by the manifest. Each acknowledgement deletes exact queued rows. */
class PendingQueue(context: Context): SQLiteOpenHelper(context, "sync-outbox.db", null, 1) {
    private val secure = SecureSettings(context)
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE outbox (id TEXT PRIMARY KEY, payload TEXT NOT NULL)")
    }
    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit
    fun put(record: JSONObject) {
        val identity = record.getString("source") + ":" + record.getString("metric") + ":" + record.getString("source_record_id")
        val id = java.security.MessageDigest.getInstance("SHA-256").digest(identity.toByteArray())
            .joinToString("") { "%02x".format(it) }
        writableDatabase.execSQL("INSERT OR REPLACE INTO outbox(id,payload) VALUES (?,?)", arrayOf(id, secure.encrypt(record.toString())))
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
        try { rows.forEach { db.execSQL("DELETE FROM outbox WHERE id=?", arrayOf(it.first)) }; db.setTransactionSuccessful() }
        finally { db.endTransaction() }
    }
}
