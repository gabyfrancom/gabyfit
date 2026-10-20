package com.gabyfit.sync

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.Constraints
import androidx.work.NetworkType
import androidx.work.BackoffPolicy
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
                HealthPermission.getReadPermission(SleepSessionRecord::class),
                HealthPermission.getReadPermission(ExerciseSessionRecord::class),
                HealthPermission.getReadPermission(HeartRateRecord::class),
                HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND
            )
            if (!client.permissionController.getGrantedPermissions().containsAll(required)) {
                Result.failure()
            } else {
                // Envío a staging, sin datos de salud en Logcat.
                WearableUploader(applicationContext).upload()
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
    val availability = client.features.getFeatureStatus(
        HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_IN_BACKGROUND
    )
    if (availability != HealthConnectFeatures.FEATURE_STATUS_AVAILABLE) return
    val request = PeriodicWorkRequestBuilder<DailySyncWorker>(24, TimeUnit.HOURS)
        .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
        .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).build()
    WorkManager.getInstance(context).cancelUniqueWork("gabyfit_daily_diagnostic")
    WorkManager.getInstance(context).enqueueUniquePeriodicWork(
        "gabyfit_daily_sync", ExistingPeriodicWorkPolicy.UPDATE, request
    )
}
