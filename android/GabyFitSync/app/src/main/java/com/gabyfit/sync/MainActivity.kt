package com.gabyfit.sync

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.EditText
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.first

class MainActivity: ComponentActivity() {
    private var syncInProgress = false
    private lateinit var status: TextView
    private val basePermissions = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
                HealthPermission.getReadPermission(ExerciseSessionRecord::class),
                HealthPermission.getReadPermission(HeartRateRecord::class)
    )
    private val launcher = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { granted -> status.text = if (granted.containsAll(basePermissions))
        "Permisos básicos aceptados. Las métricas adicionales se leen solo con su permiso." else "Permisos incompletos" }

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
        root.addView(TextView(this).apply { text = "GabyFit Sync 2 · 0.5"; textSize = 23f })
        button("1 · Solicitar permisos") {
            if (HealthConnectClient.getSdkStatus(this) != HealthConnectClient.SDK_AVAILABLE) {
                status.text = "Health Connect no está disponible o requiere actualización"
            } else launcher.launch(basePermissions + ExtraHealthMetrics.permissions)
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
                    launcher.launch(basePermissions + ExtraHealthMetrics.permissions + HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND)
                } else status.text = "Lectura en segundo plano no compatible"
            }
        }
        button("4 · Programar sincronización diaria") {
            lifecycleScope.launch {
                try {
                    val client = HealthConnectClient.getOrCreate(this@MainActivity)
                    val required = basePermissions + HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND
                    if (!client.permissionController.getGrantedPermissions().containsAll(required)) {
                        status.text = "Concede primero el permiso de segundo plano"
                    } else {
                        scheduleDailySync(this@MainActivity)
                        status.text = "Sincronización periódica programada (aproximadamente cada 24 h)."
                    }
                } catch (e: Exception) { status.text = "Error: ${e.localizedMessage}" }
            }
        }
        root.addView(TextView(this).apply { text = "Conexión EvoluSalud: introduce las credenciales del dispositivo. No se guardan en el código." })
        val secure = SecureSettings(this)
        fun field(title: String, key: String, secret: Boolean = false): EditText {
            val input = EditText(this).apply {
                hint = title
                if (secret) inputType = 129
                setSingleLine(true)
                setText(secure.get(key).orEmpty())
            }
            root.addView(input)
            return input
        }
        val endpoint = field("Servidor de staging", "endpoint").apply { setText(WearableUploader.ENDPOINT); isEnabled = false }
        val bearer = field("Token de ingestión", "bearer", true)
        val cfid = field("Cloudflare Access Client ID", "cf_client_id")
        val cfsecret = field("Cloudflare Access Client Secret", "cf_client_secret", true)
        button("5 · Guardar conexión cifrada") {
            secure.save("endpoint", endpoint.text.toString().trim())
            secure.save("bearer", bearer.text.toString().trim())
            secure.save("cf_client_id", cfid.text.toString().trim())
            secure.save("cf_client_secret", cfsecret.text.toString().trim())
            status.text = "Credenciales guardadas cifradas en este móvil"
        }
        val importCredentials = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
            if (uri != null) lifecycleScope.launch {
                try {
                    val text = contentResolver.openInputStream(uri)!!.bufferedReader().use { it.readText() }
                    require(text.length <= 8192)
                    val data = org.json.JSONObject(text)
                    require(data.getString("endpoint") == WearableUploader.ENDPOINT)
                    for (key in listOf("endpoint","bearer","cf_client_id","cf_client_secret")) secure.save(key,data.getString(key))
                    bearer.setText(secure.get("bearer")); cfid.setText(secure.get("cf_client_id")); cfsecret.setText(secure.get("cf_client_secret"))
                    status.text = "Configuración cifrada importada. Puedes sincronizar."
                } catch (_: Exception) { status.text = "Archivo de configuración inválido" }
            }
        }
        button("Importar configuración privada del móvil") { importCredentials.launch(arrayOf("application/json")) }
        button("Detener sincronización diaria") { androidx.work.WorkManager.getInstance(this).cancelUniqueWork("gabyfit_daily_sync"); status.text = "Sincronización diaria detenida" }
        button("6 · Sincronizar ahora") {
            lifecycleScope.launch {
                if (syncInProgress) return@launch
                syncInProgress = true
                try {
                    val client = HealthConnectClient.getOrCreate(this@MainActivity)
                    if (!client.permissionController.getGrantedPermissions().containsAll(basePermissions)) {
                        status.text = "Concede primero permisos de lectura"
                    } else {
                        status.text = "Enviando registros..."
                        val sent = WearableUploader(this@MainActivity).upload { confirmed ->
                            status.text = "Registros confirmados: $confirmed. Continúa la sincronización…"
                        }
                        secure.save("last_manual_success_at", java.time.Instant.now().toString())
                        secure.save("last_manual_count", sent.toString())
                        status.text = if (sent == 0) "Sin registros nuevos: los disponibles ya estaban confirmados." else "Registros confirmados: $sent"
                    }
                } catch (e: Exception) { status.text = "No se completó el envío: ${e.localizedMessage}" }
                finally { syncInProgress = false }
            }
        }
        button("Ver estado de sincronización") {
            lifecycleScope.launch {
                val last = secure.get("last_daily_success_at") ?: "Todavía sin envío automático confirmado"
                val count = secure.get("last_daily_count") ?: "—"
                val work = androidx.work.WorkManager.getInstance(this@MainActivity)
                    .getWorkInfosForUniqueWorkFlow("gabyfit_daily_sync").first()
                status.text = "Tarea diaria: " + (work.firstOrNull()?.state?.toString() ?: "No programada") +
                    "\nÚltimo envío automático completado: " + last + "\nRegistros confirmados: " + count
            }
        }
        root.addView(TextView(this).apply {
            text = "Primera instalación de Sync 2: importa tu archivo privado. Conserva la aplicación anterior; detén su tarea diaria para evitar dos sincronizadores."
        })
        button("Privacidad") { startActivity(Intent(this, PrivacyActivity::class.java)) }
        root.addView(status)
        setContentView(ScrollView(this).apply { addView(root) })
    }
}
