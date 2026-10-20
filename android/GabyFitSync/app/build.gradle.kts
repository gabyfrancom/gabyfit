plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "com.gabyfit.sync"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.gabyfit.sync.v2"
        minSdk = 28
        targetSdk = 35
        versionCode = 5
        versionName = "0.5.0-staging"
    }
    val signingPath = System.getenv("GABYFIT_KEYSTORE_PATH")
    if (!signingPath.isNullOrBlank()) {
        signingConfigs {
            create("stable") {
                storeFile = file(signingPath)
                storePassword = System.getenv("GABYFIT_KEYSTORE_PASSWORD")
                keyAlias = "gabyfit-v2"
                keyPassword = System.getenv("GABYFIT_KEYSTORE_PASSWORD")
            }
        }
        buildTypes.getByName("release").signingConfig = signingConfigs.getByName("stable")
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}
dependencies {
    implementation("androidx.core:core-ktx:1.16.0")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.health.connect:connect-client:1.1.0")
    implementation("androidx.work:work-runtime-ktx:2.10.2")
}
