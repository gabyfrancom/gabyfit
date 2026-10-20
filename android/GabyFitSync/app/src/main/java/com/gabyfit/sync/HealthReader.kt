package com.gabyfit.sync

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Instant
import java.time.temporal.ChronoUnit

class HealthReader(context: Context) {
    private val client = HealthConnectClient.getOrCreate(context)

    /** Diagnóstico: no sumar estas fuentes para construir totales globales: pueden solaparse. */
    suspend fun diagnose(): String {
        val now = Instant.now()
        val range = TimeRangeFilter.between(now.minus(7, ChronoUnit.DAYS), now)
        val steps = sortedMapOf<String, Long>()
        val heart = sortedMapOf<String, Int>()
        var token: String? = null
        do {
            val page = client.readRecords(ReadRecordsRequest(
                recordType = StepsRecord::class, timeRangeFilter = range,
                pageSize = 500, pageToken = token
            ))
            page.records.forEach { r ->
                val origin = r.metadata.dataOrigin.packageName
                steps[origin] = (steps[origin] ?: 0L) + r.count
            }
            token = page.pageToken
        } while (token != null)
        token = null
        do {
            val page = client.readRecords(ReadRecordsRequest(
                recordType = HeartRateRecord::class, timeRangeFilter = range,
                pageSize = 500, pageToken = token
            ))
            page.records.forEach { r ->
                val origin = r.metadata.dataOrigin.packageName
                heart[origin] = (heart[origin] ?: 0) + r.samples.size
            }
            token = page.pageToken
        } while (token != null)
        val sessions = sortedMapOf<String, Int>()
        token = null
        do {
            val page = client.readRecords(ReadRecordsRequest(recordType=SleepSessionRecord::class,timeRangeFilter=range,pageSize=250,pageToken=token))
            page.records.forEach { r -> val key="Sueño · ${r.metadata.dataOrigin.packageName}"; sessions[key]=(sessions[key]?:0)+1 }
            token=page.pageToken
        } while(token!=null)
        token = null
        do {
            val page = client.readRecords(ReadRecordsRequest(recordType=ExerciseSessionRecord::class,timeRangeFilter=range,pageSize=250,pageToken=token))
            page.records.forEach { r -> val key="Entrenamientos · ${r.metadata.dataOrigin.packageName}"; sessions[key]=(sessions[key]?:0)+1 }
            token=page.pageToken
        } while(token!=null)
        val extras = sortedMapOf<String,Int>()
        val missing = ExtraHealthMetrics.read(client) { r ->
            val key = "${r.getString("metric")} · ${r.getString("source")}"
            extras[key] = (extras[key] ?: 0) + 1
        }
        return buildString {
            appendLine("DIAGNÓSTICO DE LOS ÚLTIMOS 7 DÍAS")
            appendLine("PASOS (por fuente; podrían solaparse):")
            if (steps.isEmpty()) appendLine("Sin registros")
            steps.forEach { (source, value) -> appendLine("$source: $value") }
            appendLine("PULSO (cantidad de muestras por fuente):")
            if (heart.isEmpty()) appendLine("Sin registros")
            heart.forEach { (source, value) -> appendLine("$source: $value") }
            sessions.forEach { (source,count) -> appendLine("$source: $count sesiones") }
            appendLine("MÉTRICAS ADICIONALES (registros por origen):")
            extras.forEach { (key,count) -> appendLine("$key: $count") }
            if (extras.isEmpty()) appendLine("Sin registros adicionales con los permisos concedidos")
            if (missing.isNotEmpty()) appendLine("Sin permiso: ${missing.joinToString()}")
            appendLine("Este diagnóstico no envía datos. Usa Sincronizar solo si autorizas el envío a staging.")
        }
    }
}
