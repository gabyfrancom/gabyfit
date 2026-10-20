package com.gabyfit.sync

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.records.*
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant
import java.time.Duration
import java.time.temporal.ChronoUnit
import kotlin.reflect.KClass

class PermanentSyncException(message: String): Exception(message)

/** Only this isolated staging host can receive data. No redirects, keys in APK, or health values in logs. */
class WearableUploader(context: Context) {
    companion object {
        const val ENDPOINT = "https://evolusalud-health-staging.gaby-franco.workers.dev"
        private val lock = kotlinx.coroutines.sync.Mutex()
    }
    private val app = context.applicationContext
    private val config = SecureSettings(app)
    private val health = HealthConnectClient.getOrCreate(app)
    private val filter = TimeRangeFilter.between(Instant.now().minus(7, ChronoUnit.DAYS), Instant.now())

    private suspend fun <T: Record> read(type: KClass<T>, consume: (T)->Unit) {
        var token: String? = null
        do {
            val page = health.readRecords(ReadRecordsRequest(recordType=type, timeRangeFilter=filter, pageSize=250, pageToken=token))
            page.records.forEach(consume)
            token = page.pageToken
        } while (token != null)
    }
    private fun row(source: String, id: String, metric: String, start: Instant, end: Instant, value: Double, unit: String) =
        JSONObject().put("source", source).put("source_record_id", id).put("metric", metric)
            .put("start_time", start.toString()).put("end_time", end.toString()).put("value", value).put("unit", unit)

    suspend fun upload(): Int = withContext(Dispatchers.IO) {
        lock.lock()
        try {
            val endpoint = config.get("endpoint").orEmpty().trimEnd('/')
            if (endpoint != ENDPOINT) throw PermanentSyncException("Solo se permite el servidor de staging configurado")
            val bearer = config.get("bearer").orEmpty()
            val clientId = config.get("cf_client_id").orEmpty()
            val clientSecret = config.get("cf_client_secret").orEmpty()
            if (bearer.length < 32 || clientId.isBlank() || clientSecret.isBlank()) throw PermanentSyncException("Importa las credenciales del móvil")
            PendingQueue(app).use { queue ->
                suspend fun drain(): Int {
                    var sent = 0
                    while (true) {
                        val chunk = queue.first()
                        if (chunk.isEmpty()) return sent
                        val records = JSONArray().apply { chunk.forEach { put(it.second) } }
                        val canonical = records.toString()
                        val syncId = java.security.MessageDigest.getInstance("SHA-256").digest(canonical.toByteArray())
                            .joinToString("") { "%02x".format(it) }
                        val body = JSONObject().put("sync_id", syncId).put("records", records).toString()
                        val connection = URL("$endpoint/api/wearables/ingest").openConnection() as HttpURLConnection
                        try {
                            connection.instanceFollowRedirects = false
                            connection.requestMethod = "POST"
                            connection.connectTimeout = 20000; connection.readTimeout = 20000
                            connection.doOutput = true
                            connection.setRequestProperty("Content-Type", "application/json")
                            connection.setRequestProperty("Authorization", "Bearer $bearer")
                            connection.setRequestProperty("CF-Access-Client-Id", clientId)
                            connection.setRequestProperty("CF-Access-Client-Secret", clientSecret)
                            connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
                            val status = connection.responseCode
                            if (status == 408 || status == 429 || status >= 500) throw IOException("Error temporal HTTP $status; se conserva la cola")
                            if (status !in 200..299) throw PermanentSyncException("HTTP $status: revisa credenciales/permisos; se conserva la cola")
                            val bytes = connection.inputStream.use { input ->
                                val buffer = java.io.ByteArrayOutputStream()
                                while (buffer.size() <= 4096) { val b = input.read(); if (b < 0) break; buffer.write(b) }; buffer.toByteArray()
                            }
                            if (bytes.size > 4096) throw IOException("Respuesta demasiado grande")
                            val ack = JSONObject(String(bytes, Charsets.UTF_8))
                            if (!ack.optBoolean("ok") || ack.optInt("accepted", -1) != chunk.size || ack.optString("sync_id") != syncId)
                                throw IOException("Acuse de recibo inválido; se conserva la cola")
                            queue.acknowledge(chunk)
                            sent += chunk.size
                        } finally { connection.disconnect() }
                    }
                }
                var total = drain()
                read(StepsRecord::class) { r -> queue.put(row(r.metadata.dataOrigin.packageName,r.metadata.id,"steps",r.startTime,r.endTime,r.count.toDouble(),"count")) }
                total += drain()
                read(HeartRateRecord::class) { r -> r.samples.forEach { sample ->
                    queue.put(row(r.metadata.dataOrigin.packageName,"${r.metadata.id}:${sample.time.epochSecond}:${sample.time.nano}","heart_rate",sample.time,sample.time,sample.beatsPerMinute.toDouble(),"bpm"))
                } }
                total += drain()
                read(SleepSessionRecord::class) { r -> queue.put(row(r.metadata.dataOrigin.packageName,r.metadata.id,"sleep_duration",r.startTime,r.endTime,Duration.between(r.startTime,r.endTime).toMillis()/60000.0,"minutes")) }
                total += drain()
                read(ExerciseSessionRecord::class) { r -> queue.put(row(r.metadata.dataOrigin.packageName,r.metadata.id,"workout_duration",r.startTime,r.endTime,Duration.between(r.startTime,r.endTime).toMillis()/60000.0,"minutes")) }
                total + drain()
            }
        } finally { lock.unlock() }
    }
}
