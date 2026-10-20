package com.gabyfit.sync

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch

class MainActivity: ComponentActivity() {
    private lateinit var status: TextView
    private val basePermissions = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(HeartRateRecord::class)
    )
    private val launcher = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { granted -> status.text = if (granted.containsAll(basePermissions))
        "Permisos de pasos y pulso aceptados" else "Permisos incompletos" }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (intent?.action == "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE") {
            startActivity(Intent(this, PrivacyActivity::class.java))
        }
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 48, 32, 32)
        }
        status = TextView(this).apply { text = "Comprueba la disponibilidad y los permisos." }
        fun button(label: String, action: () -> Unit) {
            root.addView(Button(this).apply { text = label; setOnClickListener { action() } })
        }
        root.addView(TextView(this).apply { text = "GabyFit Sync · Fase 1"; textSize = 23f })
        button("1 · Solicitar permisos") {
            if (HealthConnectClient.getSdkStatus(this) != HealthConnectClient.SDK_AVAILABLE) {
                status.text = "Health Connect no está disponible o requiere actualización"
            } else launcher.launch(basePermissions)
        }
        button("2 · Diagnosticar fuentes (7 días)") {
            lifecycleScope.launch {
                try {
                    val client = HealthConnectClient.getOrCreate(this@MainActivity)
                    if (!client.permissionController.getGrantedPermissions().containsAll(basePermissions)) {
                        status.text = "Concede los permisos primero"
                    } else {
                        status.text = "Leyendo registros..."
                        status.text = HealthReader(this@MainActivity).diagnose()
                    }
                } catch (e: Exception) { status.text = "Error: ${e.localizedMessage}" }
            }
        }
        button("3 · Solicitar acceso en segundo plano") {
            if (HealthConnectClient.getSdkStatus(this) == HealthConnectClient.SDK_AVAILABLE) {
                val client = HealthConnectClient.getOrCreate(this)
                val feature = client.features.getFeatureStatus(
                    HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_IN_BACKGROUND
                )
                if (feature == HealthConnectFeatures.FEATURE_STATUS_AVAILABLE) {
                    launcher.launch(basePermissions + HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND)
                } else status.text = "Lectura en segundo plano no compatible"
            }
        }
        button("4 · Programar diagnóstico diario") {
            lifecycleScope.launch {
                try {
                    val client = HealthConnectClient.getOrCreate(this@MainActivity)
                    val required = basePermissions + HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND
                    if (!client.permissionController.getGrantedPermissions().containsAll(required)) {
                        status.text = "Concede primero el permiso de segundo plano"
                    } else {
                        scheduleDailySync(this@MainActivity)
                        status.text = "Diagnóstico periódico programado (aproximadamente cada 24 h)."
                    }
                } catch (e: Exception) { status.text = "Error: ${e.localizedMessage}" }
            }
        }
        button("Privacidad") { startActivity(Intent(this, PrivacyActivity::class.java)) }
        root.addView(status)
        setContentView(ScrollView(this).apply { addView(root) })
    }
}
