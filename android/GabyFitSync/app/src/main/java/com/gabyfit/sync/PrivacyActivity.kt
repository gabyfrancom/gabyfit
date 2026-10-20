package com.gabyfit.sync
import android.app.Activity
import android.os.Bundle
import android.widget.TextView
class PrivacyActivity: Activity() {
 override fun onCreate(savedInstanceState: Bundle?) {
  super.onCreate(savedInstanceState)
  setContentView(TextView(this).apply {
   setPadding(40,56,40,40); textSize=18f
   text="Privacidad · GabyFit Sync\n\nLee pasos, pulso, sesiones de sueño y entrenamientos de Health Connect. Con permisos opcionales lee oxígeno, pulso en reposo, distancia, calorías, HRV RMSSD, respiración, VO2máx, peso, grasa temperatura corporal, velocidad, cadencia, potencia y ascenso. Solo hay datos si la aplicación de origen los publica. El diagnóstico muestra las fuentes localmente. Al pulsar Sincronizar o programar la sincronización, se envían los últimos siete días a tu servidor de ingesta en Cloudflare y D1; los registros de Zepp se reflejan en EvoluSalud. No envía datos a modelos de IA. Las credenciales y la cola local están cifradas con Android Keystore; las copias Android están desactivadas. Puedes detener la tarea y revocar permisos. WorkManager no garantiza una hora exacta. La duración de sueño es el intervalo de sesión, no minutos de sueño efectivo. No es una herramienta médica."
  })
 }
}
