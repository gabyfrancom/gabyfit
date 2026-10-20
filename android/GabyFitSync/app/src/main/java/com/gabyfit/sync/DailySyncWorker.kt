package com.gabyfit.sync

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.io.IOException
import java.util.concurrent.TimeUnit

class DailySyncWorker(context: Context, params: WorkerParameters): CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = try {
        if (HealthConnectClient.getSdkStatus(applicationContext) != HealthConnectClient.SDK_AVAILABLE) {
            Result.failure()
        } else {
            val client = HealthConnectClient.getOrCreate(applicationContext)
            val required = setOf(
                HealthPermission.getReadPermission(StepsRecord::class),
                HealthPermission.getReadPermission(HeartRateRecord::class),
                HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND
            )
            if (!client.permissionController.getGrantedPermissions().containsAll(required)) {
                Result.failure()
            } else {
                // Temporary local diagnostic, without logging or transmitting health values.
                HealthReader(applicationContext).diagnose()
                Result.success()
            }
        }
    } catch (e: IOException) {
        Result.retry()
    } catch (e: SecurityException) {
        Result.failure()
    } catch (e: Exception) {
        Result.failure()
    }
}

fun scheduleDailySync(context: Context) {
    if (HealthConnectClient.getSdkStatus(context) != HealthConnectClient.SDK_AVAILABLE) return
    val client = HealthConnectClient.getOrCreate(context)
    if (client.features.getFeatureStatus(
        HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_IN_BACKGROUND
    ) != HealthConnectFeatures.FEATURE_STATUS_AVAILABLE) return
    val request = PeriodicWorkRequestBuilder<DailySyncWorker>(24, TimeUnit.HOURS).build()
    WorkManager.getInstance(context).enqueueUniquePeriodicWork(
        "gabyfit_daily_diagnostic", ExistingPeriodicWorkPolicy.KEEP, request
    )
}
