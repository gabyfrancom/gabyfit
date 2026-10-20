package com.gabyfit.sync

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Instant
import java.time.temporal.ChronoUnit

class HealthReader(context: Context) {
    private val client = HealthConnectClient.getOrCreate(context)

    /** Diagnostic only: sources may overlap. Do not use sums as consolidated daily steps. */
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
                val source = r.metadata.dataOrigin.packageName
                steps[source] = (steps[source] ?: 0L) + r.count
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
                val source = r.metadata.dataOrigin.packageName
                heart[source] = (heart[source] ?: 0) + r.samples.size
            }
            token = page.pageToken
        } while (token != null)
        return buildString {
            appendLine("DIAGNÓSTICO DE LOS ÚLTIMOS 7 DÍAS")
            appendLine("PASOS (por fuente; podrían solaparse):")
            if (steps.isEmpty()) appendLine("Sin registros")
            steps.forEach { (source, value) -> appendLine("$source: $value") }
            appendLine("PULSO (cantidad de muestras por fuente):")
            if (heart.isEmpty()) appendLine("Sin registros")
            heart.forEach { (source, value) -> appendLine("$source: $value") }
            appendLine("Estos datos permanecen en el dispositivo.")
        }
    }
}
