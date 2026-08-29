package com.imangpt.khatm.ui

import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.Crossfade
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.AutoStories
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.HourglassBottom
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.imangpt.khatm.data.AdminIntentionInput
import com.imangpt.khatm.data.IntentionOverview
import com.imangpt.khatm.data.KhatmRepository
import com.imangpt.khatm.data.KhatmSection
import com.imangpt.khatm.data.QuranClaim
import com.imangpt.khatm.ui.theme.Gold
import kotlinx.coroutines.delay
import java.text.NumberFormat
import java.time.Instant
import java.util.Locale
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KhatmApp(viewModel: KhatmViewModel = viewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    val context = LocalContext.current
    var showIntentions by rememberSaveable { mutableStateOf(false) }
    var showAdmin by rememberSaveable { mutableStateOf(false) }

    LaunchedEffect(state.message?.id) {
        state.message?.let {
            snackbar.showSnackbar(it.text)
            viewModel.dismissMessage(it.id)
        }
    }

    Box(
        Modifier.fillMaxSize().background(
            Brush.verticalGradient(
                listOf(
                    MaterialTheme.colorScheme.primary.copy(alpha = .10f),
                    MaterialTheme.colorScheme.background,
                    MaterialTheme.colorScheme.background,
                ),
            ),
        ),
    ) {
        Scaffold(containerColor = Color.Transparent, snackbarHost = { SnackbarHost(snackbar) }) { padding ->
            if (state.siteState == null && state.isLoading) {
                LoadingScreen(padding)
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(
                        start = 16.dp,
                        end = 16.dp,
                        top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding() + 12.dp,
                        bottom = padding.calculateBottomPadding() + 28.dp,
                    ),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    item {
                        AppHeader(
                            isOnline = state.isOnline,
                            isWorking = state.isWorking,
                            onRefresh = { viewModel.refresh() },
                            onShare = {
                                val text = "در ختم جمعی قرآن و صلوات همراه شو\n${state.selectedIntention?.title.orEmpty()}\n${KhatmRepository.BASE_URL}"
                                context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply {
                                    type = "text/plain"
                                    putExtra(Intent.EXTRA_TEXT, text)
                                }, "اشتراک‌گذاری ختم جمعی"))
                            },
                            onAdmin = { showAdmin = true },
                        )
                    }
                    item { IntentionSelector(state.selectedIntention) { showIntentions = true } }
                    item { SectionSwitcher(state.section, viewModel::setSection) }
                    item {
                        AnimatedContent(
                            targetState = state.section,
                            transitionSpec = { fadeIn() togetherWith fadeOut() },
                            label = "section",
                        ) { section ->
                            when (section) {
                                KhatmSection.QURAN -> QuranSection(
                                    state.selectedIntention,
                                    state.claim,
                                    state.isWorking,
                                    viewModel::claimAyah,
                                    viewModel::completeAyah,
                                )
                                KhatmSection.SALAWAT -> SalawatSection(
                                    state.selectedIntention,
                                    state.salawatDraft,
                                    state.isWorking,
                                    viewModel::setSalawatDraft,
                                    viewModel::addOneSalawat,
                                    viewModel::contributeSalawat,
                                )
                            }
                        }
                    }
                    item { FooterNote(state.isOnline) }
                }
            }
        }

        if (showIntentions) IntentionSheet(
            state.siteState?.intentions.orEmpty(),
            state.selectedIntentionId,
            onSelect = {
                viewModel.selectIntention(it)
                showIntentions = false
            },
            onDismiss = { showIntentions = false },
        )
        if (showAdmin) AdminSheet(
            state.siteState?.intentions.orEmpty(),
            state.isWorking,
            viewModel::createIntention,
            viewModel::updateIntention,
            viewModel::archiveIntention,
            onDismiss = { showAdmin = false },
        )
    }
}

@Composable
private fun LoadingScreen(padding: PaddingValues) {
    Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Surface(Modifier.size(76.dp), CircleShape, color = MaterialTheme.colorScheme.primary) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.AutoStories, null, Modifier.size(38.dp), tint = MaterialTheme.colorScheme.onPrimary)
                }
            }
            Spacer(Modifier.height(20.dp))
            Text("ختم جمعی", style = MaterialTheme.typography.headlineMedium)
            Spacer(Modifier.height(12.dp))
            CircularProgressIndicator(Modifier.size(28.dp), strokeWidth = 3.dp)
        }
    }
}

@Composable
private fun AppHeader(isOnline: Boolean, isWorking: Boolean, onRefresh: () -> Unit, onShare: () -> Unit, onAdmin: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Surface(Modifier.size(52.dp), RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.primary, shadowElevation = 6.dp) {
                Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.AutoStories, null, Modifier.size(28.dp), tint = MaterialTheme.colorScheme.onPrimary) }
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("ختم جمعی", style = MaterialTheme.typography.titleLarge)
                Text("هر آیه و هر صلوات، سهمی از یک نور جمعی", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            IconButton(onRefresh, enabled = !isWorking) { Icon(Icons.Default.Refresh, "به‌روزرسانی") }
            IconButton(onShare) { Icon(Icons.Default.Share, "اشتراک‌گذاری") }
            IconButton(onAdmin) { Icon(Icons.Default.AdminPanelSettings, "مدیریت نیت‌ها") }
        }
        Surface(
            shape = CircleShape,
            color = if (isOnline) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.errorContainer,
        ) {
            Row(Modifier.padding(horizontal = 12.dp, vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(if (isOnline) Icons.Default.Wifi else Icons.Default.WifiOff, null, Modifier.size(16.dp))
                Spacer(Modifier.width(7.dp))
                Text(if (isOnline) "همگام با سایت" else "نمایش آخرین اطلاعات ذخیره‌شده", style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}

@Composable
private fun IntentionSelector(intention: IntentionOverview?, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = .22f)),
        elevation = CardDefaults.cardElevation(2.dp),
    ) {
        Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(Modifier.size(45.dp), CircleShape, color = MaterialTheme.colorScheme.secondaryContainer) {
                Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.Verified, null, Modifier.size(23.dp)) }
            }
            Spacer(Modifier.width(13.dp))
            Column(Modifier.weight(1f)) {
                Text("نیت این همراهی", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                Text(intention?.title ?: "انتخاب نیت", style = MaterialTheme.typography.titleMedium)
                intention?.subtitle?.takeIf(String::isNotBlank)?.let {
                    Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2)
                }
            }
            Icon(Icons.Default.ExpandMore, "تغییر نیت")
        }
    }
}

@Composable
private fun SectionSwitcher(selected: KhatmSection, onSelect: (KhatmSection) -> Unit) {
    Surface(Modifier.fillMaxWidth(), RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .72f)) {
        Row(Modifier.padding(5.dp)) {
            SectionButton("ختم قرآن", Icons.Default.AutoStories, selected == KhatmSection.QURAN, Modifier.weight(1f)) { onSelect(KhatmSection.QURAN) }
            SectionButton("ختم صلوات", Icons.Default.Favorite, selected == KhatmSection.SALAWAT, Modifier.weight(1f)) { onSelect(KhatmSection.SALAWAT) }
        }
    }
}

@Composable
private fun SectionButton(title: String, icon: androidx.compose.ui.graphics.vector.ImageVector, selected: Boolean, modifier: Modifier, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        color = if (selected) MaterialTheme.colorScheme.primary else Color.Transparent,
        contentColor = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
        shadowElevation = if (selected) 3.dp else 0.dp,
    ) {
        Row(Modifier.padding(horizontal = 12.dp, vertical = 13.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, Modifier.size(20.dp)); Spacer(Modifier.width(8.dp)); Text(title, style = MaterialTheme.typography.labelLarge)
        }
    }
}

@Composable
private fun ProgressCard(title: String, subtitle: String, progressPercent: Double, primaryStat: String, primaryLabel: String, secondaryStat: String, secondaryLabel: String) {
    val target = (progressPercent / 100).toFloat().coerceIn(0f, 1f)
    val progress by animateFloatAsState(target, label = "progress")
    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
        Column(Modifier.padding(20.dp)) {
            Text(title, style = MaterialTheme.typography.titleLarge)
            Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = .72f))
            Spacer(Modifier.height(18.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier.size(112.dp).semantics {
                        progressBarRangeInfo = ProgressBarRangeInfo(progress, 0f..1f)
                        contentDescription = "پیشرفت ${progressPercent.roundToInt().toPersianDigits()} درصد"
                    },
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(progress = { progress }, modifier = Modifier.fillMaxSize(), strokeWidth = 10.dp, trackColor = MaterialTheme.colorScheme.surface.copy(alpha = .65f))
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(progressPercent.roundToInt().toPersianDigits() + "٪", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                        Text("پیشرفت", style = MaterialTheme.typography.bodyMedium)
                    }
                }
                Spacer(Modifier.width(22.dp))
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(13.dp)) {
                    StatLine(primaryStat, primaryLabel); HorizontalDivider(); StatLine(secondaryStat, secondaryLabel)
                }
            }
        }
    }
}

@Composable
private fun StatLine(value: String, label: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = MaterialTheme.typography.bodyMedium); Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Black)
    }
}

@Composable
private fun QuranSection(intention: IntentionOverview?, claim: QuranClaim?, isWorking: Boolean, onClaim: () -> Unit, onComplete: (Boolean) -> Unit) {
    if (intention == null) return EmptyState("نیتی برای ختم قرآن در دسترس نیست")
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        ProgressCard(
            "دور ${intention.quran.cycle.toPersianDigits()} ختم قرآن",
            "هر همراه یک آیه؛ بدون تداخل و به‌ترتیب",
            intention.quran.progressPercent,
            "${intention.quran.completedAyahs.formatFa()} از ۶٬۲۳۶",
            "آیه خوانده‌شده",
            intention.quran.completedKhatms.formatFa(),
            "ختم کامل‌شده",
        )
        Crossfade(claim, label = "claim") { active ->
            if (active == null) ClaimInvitation(isWorking, onClaim)
            else AyahCard(active, isWorking, onComplete, onClaim)
        }
        ReadingGuide()
    }
}

@Composable
private fun ClaimInvitation(isWorking: Boolean, onClaim: () -> Unit) {
    Card(
        Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = .22f)),
    ) {
        Column(Modifier.padding(22.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Surface(Modifier.size(78.dp), CircleShape, color = MaterialTheme.colorScheme.secondaryContainer) {
                Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.AutoStories, null, Modifier.size(38.dp)) }
            }
            Spacer(Modifier.height(17.dp))
            Text("سهم نورانی شما آماده است", style = MaterialTheme.typography.titleLarge, textAlign = TextAlign.Center)
            Spacer(Modifier.height(7.dp))
            Text("با دریافت سهم، یک آیه از ختم جاری تا ۴۵ دقیقه فقط برای شما رزرو می‌شود.", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
            Spacer(Modifier.height(20.dp))
            Button(onClick = onClaim, enabled = !isWorking, modifier = Modifier.fillMaxWidth().height(54.dp)) {
                if (isWorking) CircularProgressIndicator(Modifier.size(21.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.5.dp)
                else Icon(Icons.Default.AutoStories, null)
                Spacer(Modifier.width(9.dp)); Text(if (isWorking) "در حال دریافت…" else "دریافت آیه من")
            }
        }
    }
}

@Composable
private fun AyahCard(claim: QuranClaim, isWorking: Boolean, onComplete: (Boolean) -> Unit, onRenew: () -> Unit) {
    var remaining by remember(claim.expiresAt) { mutableLongStateOf(secondsUntil(claim.expiresAt)) }
    LaunchedEffect(claim.expiresAt) {
        while (remaining > 0) { delay(1_000); remaining = secondsUntil(claim.expiresAt) }
    }
    Card(
        Modifier.fillMaxWidth().animateContentSize(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.secondary.copy(alpha = .42f)),
    ) {
        Column(Modifier.padding(20.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Surface(shape = CircleShape, color = if (remaining > 0) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.errorContainer) {
                    Row(Modifier.padding(horizontal = 11.dp, vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.HourglassBottom, null, Modifier.size(16.dp)); Spacer(Modifier.width(5.dp))
                        Text(if (remaining > 0) "رزرو: ${formatCountdown(remaining)}" else "زمان رزرو پایان یافت", style = MaterialTheme.typography.labelLarge)
                    }
                }
                Spacer(Modifier.weight(1f))
                Text("آیه ${claim.ayah.globalNumber.formatFa()}", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
            }
            Spacer(Modifier.height(16.dp))
            LazyRow(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                items(listOf("سوره ${claim.ayah.surahName}", "آیه ${claim.ayah.numberInSurah.toPersianDigits()}", "جزء ${claim.ayah.juz.toPersianDigits()}", "صفحه ${claim.ayah.page.toPersianDigits()}")) { MetaChip(it) }
            }
            Spacer(Modifier.height(18.dp))
            Surface(Modifier.fillMaxWidth(), RoundedCornerShape(24.dp), color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = .58f)) {
                Text(
                    claim.ayah.arabic,
                    Modifier.padding(horizontal = 20.dp, vertical = 25.dp),
                    style = MaterialTheme.typography.headlineMedium.copy(fontFamily = FontFamily.Serif, fontSize = 29.sp, lineHeight = 52.sp, textDirection = TextDirection.Rtl),
                    textAlign = TextAlign.Center,
                )
            }
            Spacer(Modifier.height(17.dp))
            Text("ترجمه فارسی", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.height(6.dp))
            Text(claim.ayah.persian, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(18.dp)); AudioPlayerButton(claim.ayah.audioUrl); Spacer(Modifier.height(18.dp))
            if (remaining <= 0) {
                Button(onRenew, enabled = !isWorking, modifier = Modifier.fillMaxWidth().height(52.dp)) {
                    Icon(Icons.Default.Refresh, null); Spacer(Modifier.width(8.dp)); Text("دریافت آیه تازه")
                }
            } else {
                Button({ onComplete(true) }, enabled = !isWorking, modifier = Modifier.fillMaxWidth().height(54.dp)) {
                    if (isWorking) CircularProgressIndicator(Modifier.size(21.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.5.dp)
                    else Icon(Icons.Default.CheckCircle, null)
                    Spacer(Modifier.width(9.dp)); Text(if (isWorking) "در حال ثبت…" else "خواندم؛ آیه بعدی")
                }
                Spacer(Modifier.height(9.dp))
                OutlinedButton({ onComplete(false) }, enabled = !isWorking, modifier = Modifier.fillMaxWidth()) { Text("فقط ثبت خواندن") }
            }
        }
    }
}

@Composable
private fun MetaChip(text: String) {
    Surface(shape = CircleShape, color = MaterialTheme.colorScheme.surfaceVariant) {
        Text(text, Modifier.padding(horizontal = 10.dp, vertical = 6.dp), style = MaterialTheme.typography.bodyMedium)
    }
}

private enum class AudioState { IDLE, LOADING, PLAYING, PAUSED, ERROR }

@Composable
private fun AudioPlayerButton(audioUrl: String) {
    var player by remember(audioUrl) { mutableStateOf<MediaPlayer?>(null) }
    var state by remember(audioUrl) { mutableStateOf(AudioState.IDLE) }
    DisposableEffect(audioUrl) { onDispose { player?.release(); player = null } }
    FilledTonalButton(
        onClick = {
            when (state) {
                AudioState.PLAYING -> { player?.pause(); state = AudioState.PAUSED }
                AudioState.PAUSED -> { player?.start(); state = AudioState.PLAYING }
                AudioState.LOADING -> Unit
                else -> {
                    player?.release(); state = AudioState.LOADING
                    player = MediaPlayer().apply {
                        setAudioAttributes(AudioAttributes.Builder().setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).setUsage(AudioAttributes.USAGE_MEDIA).build())
                        setDataSource(audioUrl)
                        setOnPreparedListener { it.start(); state = AudioState.PLAYING }
                        setOnCompletionListener { state = AudioState.IDLE }
                        setOnErrorListener { _, _, _ -> state = AudioState.ERROR; true }
                        prepareAsync()
                    }
                }
            }
        },
        modifier = Modifier.fillMaxWidth(),
        enabled = state != AudioState.LOADING,
    ) {
        when (state) {
            AudioState.LOADING -> CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.3.dp)
            AudioState.PLAYING -> Icon(Icons.Default.Pause, null)
            else -> Icon(Icons.Default.PlayArrow, null)
        }
        Spacer(Modifier.width(8.dp))
        Text(when (state) {
            AudioState.LOADING -> "در حال آماده‌سازی صوت…"; AudioState.PLAYING -> "توقف تلاوت"
            AudioState.PAUSED -> "ادامه تلاوت"; AudioState.ERROR -> "تلاش دوباره برای پخش"
            AudioState.IDLE -> "شنیدن تلاوت آیه"
        })
    }
}

@Composable
private fun ReadingGuide() {
    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = .55f))) {
        Row(Modifier.padding(17.dp), verticalAlignment = Alignment.Top) {
            Icon(Icons.Default.Groups, null); Spacer(Modifier.width(11.dp))
            Column {
                Text("چطور کار می‌کند؟", style = MaterialTheme.typography.titleMedium)
                Text("آیه‌ها به‌ترتیب و بدون تداخل تقسیم می‌شوند. اگر تا پایان زمان رزرو ثبت نکنید، آیه دوباره در اختیار همراه دیگری قرار می‌گیرد.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun SalawatSection(
    intention: IntentionOverview?, amount: Int, isWorking: Boolean,
    onAmountChange: (Int) -> Unit, onTap: () -> Unit, onSubmit: () -> Unit,
) {
    if (intention == null) return EmptyState("نیتی برای ختم صلوات در دسترس نیست")
    var showCustom by rememberSaveable { mutableStateOf(false) }
    val haptics = LocalHapticFeedback.current
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        ProgressCard(
            "دور ${intention.salawat.cycle.toPersianDigits()} ختم صلوات",
            "هر ذکر شما همان لحظه به جمع افزوده می‌شود",
            intention.salawat.progressPercent,
            "${intention.salawat.current.formatFa()} از ${intention.salawat.target.formatFa()}",
            "صلوات ثبت‌شده",
            intention.salawat.completedKhatms.formatFa(),
            "ختم کامل‌شده",
        )
        Card(
            Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = .22f)),
        ) {
            Column(Modifier.padding(horizontal = 20.dp, vertical = 23.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    "اللّهُمَّ صَلِّ عَلیٰ مُحَمَّدٍ وَ آلِ مُحَمَّد",
                    style = MaterialTheme.typography.titleLarge.copy(fontFamily = FontFamily.Serif, lineHeight = 34.sp),
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.primary,
                )
                Spacer(Modifier.height(20.dp))
                Surface(
                    onClick = { haptics.performHapticFeedback(HapticFeedbackType.LongPress); onTap() },
                    modifier = Modifier.size(178.dp).semantics { contentDescription = "افزودن یک صلوات؛ تعداد فعلی ${amount.toPersianDigits()}" },
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                    shadowElevation = 8.dp,
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.Favorite, null, Modifier.size(30.dp), tint = Gold)
                            Spacer(Modifier.height(8.dp))
                            AnimatedContent(amount, label = "count") { Text(it.formatFa(), style = MaterialTheme.typography.displaySmall) }
                            Text("صلوات", style = MaterialTheme.typography.labelLarge)
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
                Text("برای افزودن یک صلوات، دایره را لمس کنید", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(18.dp))
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    FilledTonalIconButton({ onAmountChange(amount - 1) }, enabled = amount > 1) { Icon(Icons.Default.Remove, "یک عدد کم کن") }
                    Text(amount.formatFa(), Modifier.widthIn(min = 82.dp), style = MaterialTheme.typography.headlineMedium, textAlign = TextAlign.Center)
                    FilledTonalIconButton({ onAmountChange(amount + 1) }, enabled = amount < 1_000) { Icon(Icons.Default.Add, "یک عدد اضافه کن") }
                }
                Spacer(Modifier.height(16.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(horizontal = 2.dp)) {
                    items(listOf(1, 14, 100, 313, 1_000)) { preset ->
                        OutlinedButton(
                            onClick = { onAmountChange(preset) },
                            colors = if (amount == preset) ButtonDefaults.outlinedButtonColors(containerColor = MaterialTheme.colorScheme.primaryContainer) else ButtonDefaults.outlinedButtonColors(),
                        ) { Text(preset.formatFa()) }
                    }
                    item { TextButton({ showCustom = true }) { Text("تعداد دلخواه") } }
                }
                Spacer(Modifier.height(16.dp))
                Button(onSubmit, enabled = !isWorking, modifier = Modifier.fillMaxWidth().height(54.dp)) {
                    if (isWorking) CircularProgressIndicator(Modifier.size(21.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.5.dp)
                    else Icon(Icons.Default.Favorite, null)
                    Spacer(Modifier.width(9.dp)); Text(if (isWorking) "در حال ثبت…" else "ثبت ${amount.formatFa()} صلوات")
                }
                Spacer(Modifier.height(8.dp))
                Text("در هر بار می‌توانید بین ۱ تا ۱٬۰۰۰ صلوات ثبت کنید.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
            }
        }
    }
    if (showCustom) CustomAmountDialog(amount, { showCustom = false }) { onAmountChange(it); showCustom = false }
}

@Composable
private fun CustomAmountDialog(current: Int, onDismiss: () -> Unit, onConfirm: (Int) -> Unit) {
    var value by remember(current) { mutableStateOf(current.toString()) }
    val parsed = value.toLocalizedIntOrNull()?.takeIf { it in 1..1_000 }
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = { Icon(Icons.Default.Favorite, null) },
        title = { Text("تعداد دلخواه صلوات") },
        text = {
            OutlinedTextField(
                value, { input -> if (input.length <= 4 && input.all(Char::isLocalizedDigit)) value = input },
                Modifier.fillMaxWidth(), label = { Text("از ۱ تا ۱٬۰۰۰") }, singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                isError = value.isNotBlank() && parsed == null,
            )
        },
        confirmButton = { Button({ parsed?.let(onConfirm) }, enabled = parsed != null) { Text("تأیید") } },
        dismissButton = { TextButton(onDismiss) { Text("انصراف") } },
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun IntentionSheet(intentions: List<IntentionOverview>, selectedId: String?, onSelect: (String) -> Unit, onDismiss: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 18.dp)) {
            Text("انتخاب نیت", style = MaterialTheme.typography.headlineMedium)
            Text("پیشرفت قرآن و صلوات برای هر نیت جداگانه نگه‌داری می‌شود.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(16.dp))
            intentions.forEach { intention ->
                val selected = intention.id == selectedId
                Card(
                    onClick = { onSelect(intention.id) },
                    modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp),
                    colors = CardDefaults.cardColors(containerColor = if (selected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .55f)),
                    border = if (selected) BorderStroke(1.5.dp, MaterialTheme.colorScheme.primary) else null,
                ) {
                    Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(intention.title, style = MaterialTheme.typography.titleMedium)
                            if (intention.subtitle.isNotBlank()) Text(intention.subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        AnimatedVisibility(selected) { Icon(Icons.Default.CheckCircle, "انتخاب‌شده", tint = MaterialTheme.colorScheme.primary) }
                    }
                }
            }
            Spacer(Modifier.height(WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding() + 16.dp))
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AdminSheet(
    intentions: List<IntentionOverview>, isWorking: Boolean,
    onCreate: (String, AdminIntentionInput) -> Unit,
    onUpdate: (String, String, AdminIntentionInput) -> Unit,
    onArchive: (String, String) -> Unit,
    onDismiss: () -> Unit,
) {
    var token by remember { mutableStateOf("") }
    var editing by remember { mutableStateOf<IntentionOverview?>(null) }
    var adding by remember { mutableStateOf(false) }
    var archiveTarget by remember { mutableStateOf<IntentionOverview?>(null) }
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.fillMaxWidth().fillMaxHeight(.90f).imePadding().padding(horizontal = 18.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("مدیریت نیت‌ها", style = MaterialTheme.typography.headlineMedium)
                    Text("افزودن، ویرایش یا برداشتن از فهرست عمومی", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                IconButton(onDismiss) { Icon(Icons.Default.Close, "بستن") }
            }
            Spacer(Modifier.height(14.dp))
            OutlinedTextField(
                token, { token = it.take(512) }, Modifier.fillMaxWidth(),
                label = { Text("رمز مدیریت") }, supportingText = { Text("رمز در اپ ذخیره نمی‌شود") },
                singleLine = true, visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                leadingIcon = { Icon(Icons.Default.AdminPanelSettings, null) },
            )
            Spacer(Modifier.height(10.dp))
            Button({ adding = true }, enabled = token.isNotBlank() && !isWorking, modifier = Modifier.fillMaxWidth()) {
                Icon(Icons.Default.Add, null); Spacer(Modifier.width(8.dp)); Text("افزودن نیت تازه")
            }
            Spacer(Modifier.height(14.dp)); HorizontalDivider(); Spacer(Modifier.height(8.dp))
            LazyColumn(
                Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(bottom = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding() + 20.dp),
            ) {
                items(intentions, key = { it.id }) { intention ->
                    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .5f))) {
                        Row(Modifier.padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(intention.title, style = MaterialTheme.typography.titleMedium)
                                if (intention.subtitle.isNotBlank()) Text(intention.subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2)
                                Text("هدف صلوات: ${intention.salawatTarget.formatFa()}", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                            }
                            IconButton({ editing = intention }, enabled = token.isNotBlank() && !isWorking) { Icon(Icons.Default.Edit, "ویرایش") }
                            IconButton({ archiveTarget = intention }, enabled = token.isNotBlank() && !isWorking) { Icon(Icons.Default.DeleteOutline, "برداشتن", tint = MaterialTheme.colorScheme.error) }
                        }
                    }
                }
            }
        }
    }
    if (adding || editing != null) IntentionEditorDialog(editing, { adding = false; editing = null }) { input ->
        editing?.let { onUpdate(token, it.id, input) } ?: onCreate(token, input)
        adding = false; editing = null
    }
    archiveTarget?.let { intention ->
        AlertDialog(
            onDismissRequest = { archiveTarget = null }, icon = { Icon(Icons.Default.DeleteOutline, null) },
            title = { Text("برداشتن نیت؟") },
            text = { Text("«${intention.title}» از فهرست عمومی برداشته می‌شود؛ آمار و سابقه آن حذف نخواهد شد.") },
            confirmButton = {
                Button(
                    { onArchive(token, intention.id); archiveTarget = null },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                ) { Text("برداشتن") }
            },
            dismissButton = { TextButton({ archiveTarget = null }) { Text("انصراف") } },
        )
    }
}

@Composable
private fun IntentionEditorDialog(existing: IntentionOverview?, onDismiss: () -> Unit, onConfirm: (AdminIntentionInput) -> Unit) {
    var title by remember(existing?.id) { mutableStateOf(existing?.title.orEmpty()) }
    var subtitle by remember(existing?.id) { mutableStateOf(existing?.subtitle.orEmpty()) }
    var target by remember(existing?.id) { mutableStateOf((existing?.salawatTarget ?: 14_000).toString()) }
    val parsed = target.toLocalizedIntOrNull()
    val valid = title.trim().length in 3..160 && subtitle.trim().length <= 240 && parsed != null && parsed in 100..10_000_000
    AlertDialog(
        onDismissRequest = onDismiss,
        icon = { Icon(if (existing == null) Icons.Default.Add else Icons.Default.Edit, null) },
        title = { Text(if (existing == null) "نیت تازه" else "ویرایش نیت") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(title, { title = it.take(160) }, Modifier.fillMaxWidth(), label = { Text("عنوان نیت") }, singleLine = true)
                OutlinedTextField(subtitle, { subtitle = it.take(240) }, Modifier.fillMaxWidth(), label = { Text("توضیح کوتاه") }, minLines = 2, maxLines = 3)
                OutlinedTextField(
                    target, { input -> if (input.length <= 8 && input.all(Char::isLocalizedDigit)) target = input },
                    Modifier.fillMaxWidth(), label = { Text("هدف هر دور ختم صلوات") },
                    supportingText = { Text("بین ۱۰۰ تا ۱۰٬۰۰۰٬۰۰۰") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    isError = target.isNotBlank() && (parsed == null || parsed !in 100..10_000_000),
                )
            }
        },
        confirmButton = {
            Button(
                { onConfirm(AdminIntentionInput(title.trim(), subtitle.trim(), parsed ?: 14_000)) },
                enabled = valid,
            ) { Text(if (existing == null) "افزودن" else "ذخیره") }
        },
        dismissButton = { TextButton(onDismiss) { Text("انصراف") } },
    )
}

@Composable
private fun EmptyState(message: String) {
    Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.AutoStories, null, Modifier.size(42.dp), tint = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.height(12.dp)); Text(message, style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun FooterNote(isOnline: Boolean) {
    Row(Modifier.fillMaxWidth().padding(vertical = 10.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
        Icon(if (isOnline) Icons.Default.Verified else Icons.Default.WifiOff, null, Modifier.size(17.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.width(7.dp))
        Text(if (isOnline) "اطلاعات اپ و وب‌سایت یکپارچه است" else "پس از اتصال، اطلاعات خودکار همگام می‌شود", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

private fun Int.formatFa(): String = NumberFormat.getIntegerInstance(Locale.forLanguageTag("fa-IR")).format(this)
private fun secondsUntil(iso: String) = runCatching { (Instant.parse(iso).epochSecond - Instant.now().epochSecond).coerceAtLeast(0) }.getOrDefault(0)
private fun formatCountdown(total: Long): String {
    val minutes = (total / 60).toInt().toPersianDigits()
    val seconds = (total % 60).toInt().toPersianDigits().padStart(2, '۰')
    return "$minutes:$seconds"
}
private fun Char.isLocalizedDigit() = this in '0'..'9' || this in '۰'..'۹' || this in '٠'..'٩'
private fun String.toLocalizedIntOrNull(): Int? = map {
    when (it) {
        in '۰'..'۹' -> ('0'.code + it.code - '۰'.code).toChar()
        in '٠'..'٩' -> ('0'.code + it.code - '٠'.code).toChar()
        else -> it
    }
}.joinToString("").toIntOrNull()
