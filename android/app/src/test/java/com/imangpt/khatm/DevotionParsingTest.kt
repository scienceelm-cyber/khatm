package com.imangpt.khatm

import com.imangpt.khatm.data.KhatmJson
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Test

class DevotionParsingTest {
    @Test
    fun parsesCatalogAndSynchronizedProgress() {
        val catalog = KhatmJson.parseCatalog(JSONObject("""
            {"devotions":[{"id":"ayat-kursi","title":"آیت‌الکرسی","shortTitle":"آیت‌الکرسی","description":"test","unitLabel":"قرائت","sourceLabel":"قرآن","sourceUrl":"https://example.com","evidenceNote":"note","blocks":[{"arabic":"اللّٰه","meaning":"خدا","repeat":1}]}],"guidance":[]}
        """.trimIndent()))
        val state = KhatmJson.parseState(JSONObject("""
            {"intentions":[{"id":"one","title":"نیت","subtitle":"","salawatTarget":14000,"quran":{},"salawat":{},"devotions":[{"id":"ayat-kursi","cycle":2,"current":3,"target":100,"completedCycles":1,"progressPercent":3.0}]}],"updatedAt":"now"}
        """.trimIndent()))

        assertEquals("ayat-kursi", catalog.devotions.single().id)
        assertEquals(1, catalog.devotions.single().blocks.single().repeat)
        assertEquals(3, state.intentions.single().devotions.single().current)
    }
}
