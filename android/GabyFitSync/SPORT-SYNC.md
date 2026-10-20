# Sincronización deportiva 0.4

Añade velocidad (m/s), cadencia (pasos/min), potencia (W) y ascenso (m), solo con permisos concedidos. Cada muestra conserva origen y timestamp; identificadores estables permiten reenvíos sin duplicados. Zepp debe publicar los tipos correspondientes en Health Connect; disponer de estos datos en Zepp no demuestra que los exporte.

Referencia: https://developer.android.com/health-and-fitness/health-connect/experiences/workouts

Carga y efectos de Zepp, zancada, oscilación y contacto con el suelo no se estiman de estos registros. Se conservan como registro manual en EvoluSalud. Sin rutas GPS ni datos personales en este repositorio.

Después de instalar: solicitar permisos de nuevo, diagnosticar, sincronizar manualmente y comprobar origen, fecha, unidades y repetición sin duplicados. WorkManager no fija una hora exacta. La validación física sigue pendiente.

Backend: tabla aditiva wearable_sport_readings; sin alterar analíticas ni INR. Las medias mostradas corresponden a muestras del día, no a una media ponderada por duración ni necesariamente a una sesión concreta.
