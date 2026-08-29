package com.imangpt.khatm.data

import org.json.JSONArray
import org.json.JSONObject

const val TOTAL_QURAN_AYAHS = 6_236

enum class KhatmSection { QURAN, SALAWAT }

data class QuranProgress(
    val cycle: Int,
    val completedKhatms: Int,
    val completedAyahs: Int,
    val activeReaders: Int,
    val progressPercent: Double,
)

data class SalawatProgress(
    val cycle: Int,
    val current: Int,
    val target: Int,
    val completedKhatms: Int,
    val progressPercent: Double,
)

data class IntentionOverview(
    val id: String,
    val title: String,
    val subtitle: String,
    val salawatTarget: Int,
    val quran: QuranProgress,
    val salawat: SalawatProgress,
)

data class SiteState(val intentions: List<IntentionOverview>, val updatedAt: String)

data class AyahContent(
    val globalNumber: Int,
    val surahNumber: Int,
    val surahName: String,
    val surahEnglishName: String,
    val numberInSurah: Int,
    val juz: Int,
    val page: Int,
    val arabic: String,
    val persian: String,
    val audioUrl: String,
)

data class QuranClaim(val claimId: String, val expiresAt: String, val ayah: AyahContent)
data class StoredClaim(val intentionId: String, val claim: QuranClaim)
data class ClaimResult(val claim: QuranClaim, val state: SiteState)
data class MutationResult(val completedKhatm: Boolean, val state: SiteState)
data class AdminIntentionInput(val title: String, val subtitle: String, val salawatTarget: Int)

internal object KhatmJson {
    fun parseState(root: JSONObject): SiteState {
        val source = root.optJSONArray("intentions") ?: JSONArray()
        val intentions = buildList {
            for (index in 0 until source.length()) {
                val item = source.getJSONObject(index)
                val quran = item.getJSONObject("quran")
                val salawat = item.getJSONObject("salawat")
                add(
                    IntentionOverview(
                        id = item.getString("id"),
                        title = item.getString("title"),
                        subtitle = item.optString("subtitle"),
                        salawatTarget = item.optInt("salawatTarget", salawat.optInt("target", 14_000)),
                        quran = QuranProgress(
                            cycle = quran.optInt("cycle", 1),
                            completedKhatms = quran.optInt("completedKhatms"),
                            completedAyahs = quran.optInt("completedAyahs"),
                            activeReaders = quran.optInt("activeReaders"),
                            progressPercent = quran.optDouble("progressPercent"),
                        ),
                        salawat = SalawatProgress(
                            cycle = salawat.optInt("cycle", 1),
                            current = salawat.optInt("current"),
                            target = salawat.optInt("target", 14_000),
                            completedKhatms = salawat.optInt("completedKhatms"),
                            progressPercent = salawat.optDouble("progressPercent"),
                        ),
                    ),
                )
            }
        }
        return SiteState(intentions, root.optString("updatedAt"))
    }

    fun parseClaim(root: JSONObject): QuranClaim {
        val ayah = root.getJSONObject("ayah")
        return QuranClaim(
            claimId = root.getString("claimId"),
            expiresAt = root.getString("expiresAt"),
            ayah = AyahContent(
                globalNumber = ayah.getInt("globalNumber"),
                surahNumber = ayah.getInt("surahNumber"),
                surahName = ayah.getString("surahName"),
                surahEnglishName = ayah.optString("surahEnglishName"),
                numberInSurah = ayah.getInt("numberInSurah"),
                juz = ayah.getInt("juz"),
                page = ayah.getInt("page"),
                arabic = ayah.getString("arabic"),
                persian = ayah.getString("persian"),
                audioUrl = ayah.getString("audioUrl"),
            ),
        )
    }

    fun stateToJson(state: SiteState) = JSONObject().apply {
        put("updatedAt", state.updatedAt)
        put("intentions", JSONArray().apply {
            state.intentions.forEach { intention -> put(JSONObject().apply {
                put("id", intention.id)
                put("title", intention.title)
                put("subtitle", intention.subtitle)
                put("salawatTarget", intention.salawatTarget)
                put("quran", JSONObject().apply {
                    put("cycle", intention.quran.cycle)
                    put("completedKhatms", intention.quran.completedKhatms)
                    put("completedAyahs", intention.quran.completedAyahs)
                    put("activeReaders", intention.quran.activeReaders)
                    put("progressPercent", intention.quran.progressPercent)
                })
                put("salawat", JSONObject().apply {
                    put("cycle", intention.salawat.cycle)
                    put("current", intention.salawat.current)
                    put("target", intention.salawat.target)
                    put("completedKhatms", intention.salawat.completedKhatms)
                    put("progressPercent", intention.salawat.progressPercent)
                })
            }) }
        })
    }

    fun claimToJson(claim: QuranClaim) = JSONObject().apply {
        put("claimId", claim.claimId)
        put("expiresAt", claim.expiresAt)
        put("ayah", JSONObject().apply {
            put("globalNumber", claim.ayah.globalNumber)
            put("surahNumber", claim.ayah.surahNumber)
            put("surahName", claim.ayah.surahName)
            put("surahEnglishName", claim.ayah.surahEnglishName)
            put("numberInSurah", claim.ayah.numberInSurah)
            put("juz", claim.ayah.juz)
            put("page", claim.ayah.page)
            put("arabic", claim.ayah.arabic)
            put("persian", claim.ayah.persian)
            put("audioUrl", claim.ayah.audioUrl)
        })
    }
}
