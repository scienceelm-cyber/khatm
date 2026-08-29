package com.imangpt.khatm.data

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit
import com.imangpt.khatm.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets

class ApiException(val statusCode: Int, val errorCode: String) : IOException(errorCode)

class KhatmRepository(context: Context) {
    private val preferences: SharedPreferences =
        context.getSharedPreferences("khatm_secure_session", Context.MODE_PRIVATE)

    suspend fun refreshState(): SiteState = withContext(Dispatchers.IO) {
        KhatmJson.parseState(request("GET", "/api/state")).also(::saveState)
    }

    suspend fun claimAyah(intentionId: String): ClaimResult = withContext(Dispatchers.IO) {
        val root = request("POST", "/api/quran/claim", JSONObject().put("intentionId", intentionId))
        ClaimResult(
            claim = KhatmJson.parseClaim(root.getJSONObject("claim")),
            state = KhatmJson.parseState(root.getJSONObject("state")),
        ).also {
            saveState(it.state)
            saveClaim(StoredClaim(intentionId, it.claim))
        }
    }

    suspend fun completeAyah(claimId: String): MutationResult = withContext(Dispatchers.IO) {
        val root = request("POST", "/api/quran/complete", JSONObject().put("claimId", claimId))
        MutationResult(root.optBoolean("completedKhatm"), KhatmJson.parseState(root.getJSONObject("state"))).also {
            saveState(it.state)
            clearClaim()
        }
    }

    suspend fun contributeSalawat(intentionId: String, amount: Int): MutationResult = withContext(Dispatchers.IO) {
        val root = request(
            "POST", "/api/salawat/contribute",
            JSONObject().put("intentionId", intentionId).put("amount", amount),
        )
        MutationResult(root.optBoolean("completedKhatm"), KhatmJson.parseState(root.getJSONObject("state"))).also {
            saveState(it.state)
        }
    }

    suspend fun createIntention(token: String, input: AdminIntentionInput) = adminRequest(
        JSONObject().put("action", "create").put("token", token)
            .put("title", input.title).put("subtitle", input.subtitle)
            .put("salawatTarget", input.salawatTarget),
    )

    suspend fun updateIntention(token: String, id: String, input: AdminIntentionInput) = adminRequest(
        JSONObject().put("action", "update").put("id", id).put("token", token)
            .put("title", input.title).put("subtitle", input.subtitle)
            .put("salawatTarget", input.salawatTarget),
    )

    suspend fun archiveIntention(token: String, id: String) = adminRequest(
        JSONObject().put("action", "archive").put("id", id).put("token", token),
    )

    private suspend fun adminRequest(payload: JSONObject): SiteState = withContext(Dispatchers.IO) {
        KhatmJson.parseState(request("POST", "/api/admin/intentions", payload)).also(::saveState)
    }

    fun cachedState(): SiteState? = preferences.getString(KEY_STATE, null)?.let {
        runCatching { KhatmJson.parseState(JSONObject(it)) }.getOrNull()
    }

    fun cachedClaim(): StoredClaim? = preferences.getString(KEY_CLAIM, null)?.let {
        runCatching {
            val root = JSONObject(it)
            StoredClaim(root.getString("intentionId"), KhatmJson.parseClaim(root.getJSONObject("claim")))
        }.getOrNull()
    }

    fun clearClaim() { preferences.edit { remove(KEY_CLAIM) } }
    fun selectedIntentionId(): String? = preferences.getString(KEY_INTENTION, null)
    fun setSelectedIntentionId(id: String) { preferences.edit { putString(KEY_INTENTION, id) } }
    fun selectedSection(): KhatmSection = runCatching {
        KhatmSection.valueOf(preferences.getString(KEY_SECTION, KhatmSection.QURAN.name).orEmpty())
    }.getOrDefault(KhatmSection.QURAN)
    fun setSelectedSection(section: KhatmSection) {
        preferences.edit { putString(KEY_SECTION, section.name) }
    }

    private fun saveState(state: SiteState) {
        preferences.edit { putString(KEY_STATE, KhatmJson.stateToJson(state).toString()) }
    }

    private fun saveClaim(stored: StoredClaim) {
        preferences.edit {
            putString(
                KEY_CLAIM,
                JSONObject().put("intentionId", stored.intentionId)
                    .put("claim", KhatmJson.claimToJson(stored.claim)).toString(),
            )
        }
    }

    private fun request(method: String, path: String, payload: JSONObject? = null): JSONObject {
        val connection = (URL(BASE_URL + path).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 15_000
            readTimeout = 25_000
            useCaches = false
            setRequestProperty("Accept", "application/json")
            setRequestProperty("User-Agent", "KhatmAndroid/${BuildConfig.VERSION_NAME}")
            preferences.getString(KEY_COOKIE, null)?.let { setRequestProperty("Cookie", it) }
            if (payload != null) {
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
            }
        }
        return try {
            if (payload != null) {
                val bytes = payload.toString().toByteArray(StandardCharsets.UTF_8)
                connection.setFixedLengthStreamingMode(bytes.size)
                connection.outputStream.use { it.write(bytes) }
            }
            val status = connection.responseCode
            persistCookie(connection)
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val body = stream?.bufferedReader(StandardCharsets.UTF_8)?.use { it.readText() }.orEmpty()
            val root = runCatching { JSONObject(body) }.getOrElse { JSONObject() }
            if (status !in 200..299) throw ApiException(status, root.optString("error", "network_error"))
            root
        } finally {
            connection.disconnect()
        }
    }

    private fun persistCookie(connection: HttpURLConnection) {
        val cookies = connection.headerFields.entries
            .firstOrNull { it.key?.equals("Set-Cookie", ignoreCase = true) == true }?.value.orEmpty()
        cookies.asSequence().map { it.substringBefore(';').trim() }
            .firstOrNull { it.startsWith("khatm_sid=") }
            ?.let { cookie -> preferences.edit { putString(KEY_COOKIE, cookie) } }
    }

    companion object {
        const val BASE_URL = "https://khatm.imangpt1996.chatgpt.site"
        private const val KEY_COOKIE = "session_cookie"
        private const val KEY_STATE = "cached_state"
        private const val KEY_CLAIM = "cached_claim"
        private const val KEY_INTENTION = "selected_intention"
        private const val KEY_SECTION = "selected_section"
    }
}
