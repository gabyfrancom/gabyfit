package com.gabyfit.sync

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Instant
import java.time.temporal.ChronoUnit
import kotlin.reflect.KClass
import org.json.JSONObject

/** Optional metrics: a refused permission never blocks the existing four metrics. */
object ExtraHealthMetrics {
    val types: List<KClass<out Record>> = listOf(OxygenSaturationRecord::class, RestingHeartRateRecord::class, DistanceRecord::class, ActiveCaloriesBurnedRecord::class, TotalCaloriesBurnedRecord::class, HeartRateVariabilityRmssdRecord::class, RespiratoryRateRecord::class, Vo2MaxRecord::class, WeightRecord::class, BodyFatRecord::class, BodyTemperatureRecord::class)
    val permissions: Set<String> = types.map { HealthPermission.getReadPermission(it) }.toSet()

    suspend fun read(client: HealthConnectClient, consume: (JSONObject) -> Unit): Set<String> {
        val granted = client.permissionController.getGrantedPermissions()
        val now = Instant.now()
        val range = TimeRangeFilter.between(now.minus(7, ChronoUnit.DAYS), now)
        val missing = mutableSetOf<String>()
        suspend fun <T: Record> scan(type: KClass<T>, metric: String, start: (T)->Instant, end: (T)->Instant, value: (T)->Double, unit: String) {
            if (HealthPermission.getReadPermission(type) !in granted) { missing.add(metric); return }
            var token: String? = null
            do {
                val page = client.readRecords(ReadRecordsRequest(recordType=type,timeRangeFilter=range,pageSize=250,pageToken=token))
                for (r in page.records) {
                    consume(JSONObject().put("source",r.metadata.dataOrigin.packageName).put("source_record_id",r.metadata.id)
                        .put("metric",metric).put("start_time",start(r).toString()).put("end_time",end(r).toString())
                        .put("value",value(r)).put("unit",unit))
                }
                token = page.pageToken
            } while (token != null)
        }
        scan(OxygenSaturationRecord::class,"oxygen_saturation",{it.time},{it.time},{it.percentage.value},"percent")
        scan(RestingHeartRateRecord::class,"resting_heart_rate",{it.time},{it.time},{it.beatsPerMinute.toDouble()},"bpm")
        scan(DistanceRecord::class,"distance",{it.startTime},{it.endTime},{it.distance.inMeters},"meters")
        scan(ActiveCaloriesBurnedRecord::class,"active_calories",{it.startTime},{it.endTime},{it.energy.inKilocalories},"kcal")
        scan(TotalCaloriesBurnedRecord::class,"total_calories",{it.startTime},{it.endTime},{it.energy.inKilocalories},"kcal")
        scan(HeartRateVariabilityRmssdRecord::class,"hrv_rmssd",{it.time},{it.time},{it.heartRateVariabilityMillis},"ms")
        scan(RespiratoryRateRecord::class,"respiratory_rate",{it.time},{it.time},{it.rate},"rpm")
        scan(Vo2MaxRecord::class,"vo2_max",{it.time},{it.time},{it.vo2MillilitersPerMinuteKilogram},"ml/kg/min")
        scan(WeightRecord::class,"weight",{it.time},{it.time},{it.weight.inKilograms},"kg")
        scan(BodyFatRecord::class,"body_fat",{it.time},{it.time},{it.percentage.value},"percent")
        scan(BodyTemperatureRecord::class,"body_temperature",{it.time},{it.time},{it.temperature.inCelsius},"celsius")
        return missing
    }
}
