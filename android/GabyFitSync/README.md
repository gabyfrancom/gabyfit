# GabyFit Sync — staging 0.2

Android SDK36, JDK17, Gradle8.11.1. Rama de desarrollo; no se fusiona ni se modifica producción.

Lee pasos, pulso, sesiones de sueño y entrenamientos durante siete días, con diagnóstico de DataOrigin por tipo. La sesión de sueño no equivale a minutos de sueño efectivo. No se presupone que Zepp sea una fuente compatible.

Instala el APK de GitHub Releases, sin caducidad automática de Actions. Comprueba SOURCE-COMMIT.txt, SHA256SUMS.txt y APK-SIGNATURE.txt. Es un APK debug: no habilitar datos personales hasta validar permisos y procedencia en el móvil. Las firmas debug pueden variar entre compilaciones; conserva las credenciales antes de cambiar de instalación.

Importa el JSON privado de configuración desde el móvil. Nunca lo subas al repositorio ni lo compartas. Credenciales y cola cifradas mediante Android Keystore, backups Android desactivados, HTTPS y host de staging fijo, sin redirecciones. El secreto Access solo autoriza la ruta de ingesta, no el dashboard.

Pulsa solicitar permisos, Diagnosticar fuentes y Sincronizar ahora. Comprueba fuentes y horas en Health Connect y después en EvoluSalud staging. Solo programa la tarea diaria tras validar el envío manual; WorkManager depende de conectividad, batería y permiso de segundo plano. Existe botón para detenerla.

Se conserva la cola hasta recibir acuse con sync_id y número de registros. Se reintenta en fallos de conexión, 408, 429 y 5xx; otros estados requieren corregir configuración. Las claves de datos impiden duplicados por fuente, registro y métrica. Se vuelven a leer siete días; no existe todavía reconciliación de borrados ni cambios anteriores a esa ventana.

No se envían datos a IA. La prueba física y la validación visual autenticada del dashboard son obligatorias antes de considerar terminada la integración.
