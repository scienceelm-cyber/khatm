package com.imangpt.khatm

import com.imangpt.khatm.data.DevotionProgress
import com.imangpt.khatm.data.KhatmSection
import org.junit.Assert.assertEquals
import org.junit.Test

class DevotionParsingTest {
    @Test
    fun modelsSynchronizedProgressAndThirdSection() {
        val progress = DevotionProgress("ayat-kursi", 2, 3, 100, 1, 3.0)

        assertEquals("ayat-kursi", progress.id)
        assertEquals(3, progress.current)
        assertEquals(KhatmSection.DEVOTIONS, KhatmSection.valueOf("DEVOTIONS"))
    }
}
