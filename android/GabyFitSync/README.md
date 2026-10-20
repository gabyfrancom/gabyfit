# GabyFit Sync · Fase 1

Proyecto Android nativo Kotlin. Diagnóstico de orígenes de pasos y pulso desde Health Connect y programación de lectura diaria local. **No incluye una conexión directa a Zepp**, Supabase ni a las API de IA.

## Abrir
1. Instala Android Studio actualizado, SDK 35 y JDK 17.
2. Abre la carpeta `GabyFitSync` con **Open**. El proyecto se suministra sin binarios del Gradle wrapper; Android Studio debe tener Gradle configurado, o genera el wrapper usando una instalación local de Gradle (`gradle wrapper --gradle-version 8.11.1`).
3. Sincroniza el proyecto con Gradle; ejecuta en un móvil físico Android con Health Connect.
4. En Zepp sincroniza manualmente el reloj; revisa que Zepp escriba pasos/pulso en Health Connect.
5. En la app: solicita permisos → diagnostica fuentes (7 días) → comprueba `dataOrigin.packageName`.
6. Si existe el permiso de Health Connect para segundo plano, concédelo y activa el trabajo diario.

## Resultado esperado
Si no hay datos, la app informa `Sin registros`. Si existen, muestra nombres de paquetes por origen. No concluyas que una fuente es Zepp hasta comprobar su identidad en tu móvil.

## Límites importantes
- La prueba aún no persiste registros ni sube datos a Supabase.
- WorkManager es aproximado, no garantiza ejecución a una hora exacta.
- No fuerza a Zepp a sincronizar el reloj por Bluetooth.
- Los pasos por origen pueden solaparse y no deben sumarse como total consolidado.
- Es un proyecto fuente sin APK precompilado y no se ha podido compilar contra un SDK Android en este entorno.
- La publicación en Google Play requiere completar las políticas y declaraciones de datos de salud.

## Próxima fase
Persistencia local cifrada; control de sincronizaciones, lectura incremental, backend autenticado y sincronización con Supabase. Nunca colocar las claves API de OpenAI o Anthropic en la aplicación móvil.
