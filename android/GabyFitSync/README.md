# GabyFit Sync · Android

Prueba local de Health Connect para pasos y pulso. Aún no hay conexión directa con Zepp, Supabase, OpenAI ni Anthropic.

1. Abre esta carpeta en Android Studio (JDK 17, SDK 35).
2. Este código aún no incluye Gradle Wrapper binario: instala Gradle 8.11.1 y ejecuta `gradle wrapper --gradle-version 8.11.1` o genera el wrapper con Android Studio.
3. Compila e instala en Android con Health Connect disponible.
4. Sincroniza Zepp; concede permisos para leer pasos y pulso; pulsa «Diagnosticar fuentes».
5. Comprueba los nombres de paquete obtenidos. No se puede asegurar que Zepp esté escribiendo datos sin esa verificación.
6. El permiso de segundo plano debe solicitarse explícitamente y estar disponible.

El trabajo periódico ejecuta una lectura local **sin persistir ni enviar datos** y puede retrasarse por ahorro de batería. No interpreta clínicamente el pulso.

## Siguiente fase
Añadir persistencia y trazas no sensibles, normalización por fuente y sincronización autenticada hacia Supabase. No subir credenciales ni registros de salud a GitHub.
