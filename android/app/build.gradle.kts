import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import java.util.Properties

val khatmLocalProperties = Properties()
val khatmLocalPropertiesFile = rootProject.file("khatm.local.properties")
if (khatmLocalPropertiesFile.isFile) {
    khatmLocalPropertiesFile.inputStream().use(khatmLocalProperties::load)
}

val khatmBaseUrl = providers.gradleProperty("KHATM_BASE_URL")
    .orElse(providers.environmentVariable("KHATM_BASE_URL"))
    .orElse(
        khatmLocalProperties.getProperty("KHATM_BASE_URL")
            ?: "https://khatm.imangpt1996.chatgpt.site",
    )
    .get()
    .trimEnd('/')

require(khatmBaseUrl.startsWith("https://")) {
    "KHATM_BASE_URL must start with https://"
}
require(!khatmBaseUrl.any(Char::isWhitespace)) {
    "KHATM_BASE_URL must not contain spaces"
}

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.imangpt.khatm"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.imangpt.khatm"
        minSdk = 26
        targetSdk = 37
        versionCode = 3
        versionName = "2.1.0"

        buildConfigField("String", "KHATM_BASE_URL", "\"$khatmBaseUrl\"")

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables.useSupportLibrary = true
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources.excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }

    testOptions {
        unitTests.isReturnDefaultValues = true
    }
}

kotlin {
    compilerOptions {
        jvmTarget = JvmTarget.JVM_17
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2026.08.00")

    implementation(composeBom)
    androidTestImplementation(composeBom)
    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.core:core-ktx:1.18.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.10.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.10.0")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")

    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
    testImplementation("junit:junit:4.13.2")
}
