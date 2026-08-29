package com.imangpt.khatm

import com.imangpt.khatm.ui.toPersianDigits
import org.junit.Assert.assertEquals
import org.junit.Test

class NumberFormattingTest {
    @Test
    fun convertsEveryLatinDigitToPersian() {
        assertEquals("۱۲۳۴۵۶۷۸۹۰", 1234567890.toPersianDigits())
    }

    @Test
    fun keepsMinusSignForNegativeNumbers() {
        assertEquals("-۱۴", (-14).toPersianDigits())
    }
}
