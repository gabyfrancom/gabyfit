package com.gabyfit.sync

import android.app.Activity
import android.os.Bundle
import android.widget.TextView

class PrivacyActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(TextView(this).apply {
            setPadding(40, 56, 40, 40)
            textSize = 18f
            text = "Privacidad · GabyFit Sync\n\nEsta prueba lee pasos y pulso desde Health Connect solo para identificar las fuentes en este móvil. No envía información a servidores, ChatGPT ni Claude. Los permisos pueden revocarse desde Health Connect. El diagnóstico periódico no persiste datos y no es una herramienta médica."
        })
    }
}
