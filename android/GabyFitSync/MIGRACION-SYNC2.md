# GabyFit Sync 2 · 0.5 · migración sin desinstalar

El paquete nuevo `com.gabyfit.sync.v2` se instala junto al anterior `com.gabyfit.sync`. No lee ni borra la configuración o cola del anterior. No modifica Zepp, Health Connect ni los datos ya guardados en D1.

## Instalación
1. En la aplicación anterior, terminar el envío y detener su sincronización diaria.
2. Instalar el APK **GabyFitSync2-staging.apk** de la Release del commit correcto.
3. Abrir **GabyFit Sync 2**, importar el JSON privado que ya conserva la persona y conceder permisos.
4. Diagnosticar y sincronizar manualmente. Revisar fecha y origen en EvoluSalud.
5. Repetir: los registros sin cambios ya confirmados se omiten localmente; el servidor mantiene su deduplicación.
6. Solicitar segundo plano y programar la tarea diaria solo en Sync 2.
7. El botón Ver estado muestra la tarea y la fecha del último envío automático completado. Verificar dos ejecuciones reales antes de cerrar la integración.
8. Conservar la app anterior hasta validar el recorrido. No hace falta desinstalarla para instalar Sync 2.

## Firma estable
El pipeline previo generaba claves debug efímeras. No se dispone de la clave privada con la que se firmó el APK instalado anteriormente; no se promete actualizar ese paquete sobre sí mismo.

El paquete nuevo usa una identidad estable. El material privado se conserva como secretos de un Worker dedicado; no está en el repositorio, APK, artefactos ni logs. GitHub Actions solicita acceso mediante un JWT OIDC de corta duración. El servicio verifica firma RS256, issuer, audiencia, IDs numéricos de repositorio y propietario, rama, sujeto, workflow, evento push y vigencia. PRs y otras ramas no reciben material de firma.

Huella SHA-256 del certificado: `bd73cb2df937dc23bc1cab74ef62ab940de13eeb2b5be9091d11a93743663855`.
El pipeline comprueba esa huella y el application ID antes de publicar. Si no puede obtener la firma estable, falla; no publica un reemplazo firmado con debug.

## Envíos y pruebas
La cola cifra los registros. El registro de acuses conserva hashes, sin valores de salud en claro. Solo se omite una entrada tras un acuse del servidor; si cambia su contenido se vuelve a enviar. La actualización del acuse y eliminación de cola es transaccional. La conservación prevista del registro de acuses es de 14 días, con limpieza tras confirmaciones.

Pruebas: JWT firmado y rechazos; SQL real de cola, rollback, omisión tras ACK y reenvío de cambios; compilación/lint; paquete y firma APK. La prueba física, permiso de segundo plano, fuentes adicionales y dos ciclos reales siguen siendo comprobaciones del dispositivo.

Sin cambios de tratamiento ni cálculos clínicos. Sin envío a IA. Sin fusión del PR.
