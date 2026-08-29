package com.imangpt.khatm.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

val Evergreen = Color(0xFF0B3B2E)
val Gold = Color(0xFFD1A753)

private val LightColors = lightColorScheme(
    primary = Evergreen,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFD7E9E0),
    onPrimaryContainer = Color(0xFF08251C),
    secondary = Gold,
    onSecondary = Color(0xFF342700),
    secondaryContainer = Color(0xFFFFE9B2),
    onSecondaryContainer = Color(0xFF291D00),
    background = Color(0xFFF8F3E8),
    onBackground = Color(0xFF18251F),
    surface = Color(0xFFFFFBF4),
    onSurface = Color(0xFF18251F),
    surfaceVariant = Color(0xFFEFE5D2),
    onSurfaceVariant = Color(0xFF59655F),
    outline = Color(0xFF86928B),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF8ED5B7),
    onPrimary = Color(0xFF003829),
    primaryContainer = Color(0xFF0E4F3B),
    onPrimaryContainer = Color(0xFFB9F2D7),
    secondary = Color(0xFFE7C56F),
    onSecondary = Color(0xFF3D2F00),
    secondaryContainer = Color(0xFF574600),
    onSecondaryContainer = Color(0xFFFFE9A9),
    background = Color(0xFF071D17),
    onBackground = Color(0xFFE1E9E3),
    surface = Color(0xFF0C261E),
    onSurface = Color(0xFFE1E9E3),
    surfaceVariant = Color(0xFF1A382E),
    onSurfaceVariant = Color(0xFFBECAC3),
    outline = Color(0xFF87948D),
)

private val AppTypography = Typography(
    displaySmall = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Black, fontSize = 32.sp, lineHeight = 42.sp),
    headlineMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.ExtraBold, fontSize = 25.sp, lineHeight = 34.sp),
    titleLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Bold, fontSize = 20.sp, lineHeight = 29.sp),
    titleMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Bold, fontSize = 16.sp, lineHeight = 24.sp),
    bodyLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontSize = 16.sp, lineHeight = 27.sp),
    bodyMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontSize = 14.sp, lineHeight = 23.sp),
    labelLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Bold, fontSize = 14.sp, lineHeight = 20.sp),
)

@Composable
fun KhatmTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = AppTypography,
        shapes = Shapes(
            extraSmall = RoundedCornerShape(10.dp),
            small = RoundedCornerShape(14.dp),
            medium = RoundedCornerShape(20.dp),
            large = RoundedCornerShape(28.dp),
            extraLarge = RoundedCornerShape(34.dp),
        ),
        content = content,
    )
}
