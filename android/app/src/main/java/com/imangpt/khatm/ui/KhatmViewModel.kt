package com.imangpt.khatm.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.imangpt.khatm.data.AdminIntentionInput
import com.imangpt.khatm.data.ApiException
import com.imangpt.khatm.data.IntentionOverview
import com.imangpt.khatm.data.DevotionCatalog
import com.imangpt.khatm.data.KhatmRepository
import com.imangpt.khatm.data.KhatmSection
import com.imangpt.khatm.data.QuranClaim
import com.imangpt.khatm.data.SiteState
import com.imangpt.khatm.data.StoredClaim
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.Instant
import java.util.concurrent.atomic.AtomicLong

data class UiMessage(val id: Long, val text: String, val isError: Boolean = false)

data class KhatmUiState(
    val siteState: SiteState? = null,
    val selectedIntentionId: String? = null,
    val section: KhatmSection = KhatmSection.QURAN,
    val devotionCatalog: DevotionCatalog? = null,
    val selectedDevotionId: String = "ayat-kursi",
    val claim: QuranClaim? = null,
    val isLoading: Boolean = true,
    val isWorking: Boolean = false,
    val isOnline: Boolean = true,
    val salawatDraft: Int = 14,
    val message: UiMessage? = null,
) {
    val selectedIntention: IntentionOverview?
        get() = siteState?.intentions?.firstOrNull { it.id == selectedIntentionId }
}

class KhatmViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = KhatmRepository(application)
    private val messageIds = AtomicLong(0)
    private var storedClaim = repository.cachedClaim()?.takeIf { it.claim.isActive() }
    private val cachedState = repository.cachedState()
    private val cachedCatalog = repository.cachedCatalog()
    private val cachedSelectedId = repository.selectedIntentionId()
        ?.takeIf { id -> cachedState?.intentions?.any { it.id == id } == true }
        ?: cachedState?.intentions?.firstOrNull()?.id

    private val _uiState = MutableStateFlow(
        KhatmUiState(
            siteState = cachedState,
            selectedIntentionId = cachedSelectedId,
            section = repository.selectedSection(),
            devotionCatalog = cachedCatalog,
            selectedDevotionId = repository.selectedDevotionId(),
            claim = storedClaim?.takeIf { it.intentionId == cachedSelectedId }?.claim,
            isLoading = cachedState == null,
            isOnline = cachedState == null,
        ),
    )
    val uiState: StateFlow<KhatmUiState> = _uiState.asStateFlow()

    init {
        if (storedClaim == null) repository.clearClaim()
        refresh(false)
    }

    fun refresh(showSuccess: Boolean = true) {
        if (_uiState.value.isWorking) return
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = it.siteState == null, isWorking = true) }
            runCatching {
                val state = repository.refreshState()
                val catalog = if (repository.shouldRefreshCatalog()) {
                    runCatching { repository.refreshCatalog() }.getOrNull()
                } else null
                state to catalog
            }
                .onSuccess { (state, catalog) ->
                    applyState(state)
                    _uiState.update { it.copy(
                        devotionCatalog = catalog ?: it.devotionCatalog,
                        selectedDevotionId = (catalog ?: it.devotionCatalog)?.devotions
                            ?.firstOrNull { devotion -> devotion.id == it.selectedDevotionId }?.id
                            ?: (catalog ?: it.devotionCatalog)?.devotions?.firstOrNull()?.id
                            ?: it.selectedDevotionId,
                        isLoading = false,
                        isWorking = false,
                        isOnline = true,
                    ) }
                    if (showSuccess) postMessage("اطلاعات به‌روز شد")
                }
                .onFailure { error ->
                    _uiState.update { it.copy(isLoading = false, isWorking = false, isOnline = false, message = messageFor(error)) }
                }
        }
    }

    fun selectIntention(id: String) {
        if (_uiState.value.siteState?.intentions?.any { it.id == id } != true) return
        repository.setSelectedIntentionId(id)
        _uiState.update {
            it.copy(
                selectedIntentionId = id,
                claim = storedClaim?.takeIf { stored -> stored.intentionId == id && stored.claim.isActive() }?.claim,
            )
        }
    }

    fun setSection(section: KhatmSection) {
        repository.setSelectedSection(section)
        _uiState.update { it.copy(section = section) }
    }

    fun selectDevotion(id: String) {
        if (_uiState.value.devotionCatalog?.devotions?.any { it.id == id } != true) return
        repository.setSelectedDevotionId(id)
        _uiState.update { it.copy(selectedDevotionId = id) }
    }

    fun claimAyah() {
        val intentionId = _uiState.value.selectedIntentionId ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isWorking = true) }
            runCatching { repository.claimAyah(intentionId) }
                .onSuccess { result ->
                    storedClaim = StoredClaim(intentionId, result.claim)
                    applyState(result.state)
                    _uiState.update { it.copy(claim = result.claim, isWorking = false, isOnline = true) }
                    postMessage("این آیه تا ۴۵ دقیقه برای شما رزرو شد")
                }
                .onFailure(::handleFailure)
        }
    }

    fun completeAyah(requestNext: Boolean) {
        val claim = _uiState.value.claim ?: return
        val intentionId = _uiState.value.selectedIntentionId ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isWorking = true) }
            runCatching {
                val completion = repository.completeAyah(claim.claimId)
                storedClaim = null
                completion to if (requestNext) repository.claimAyah(intentionId) else null
            }.onSuccess { (completion, next) ->
                storedClaim = next?.let { StoredClaim(intentionId, it.claim) }
                applyState(next?.state ?: completion.state)
                _uiState.update { it.copy(claim = next?.claim, isWorking = false, isOnline = true) }
                postMessage(
                    when {
                        completion.completedKhatm -> "ختم قرآن کامل شد؛ قبول باشد ✨"
                        next != null -> "ثبت شد؛ آیه بعدی آماده است"
                        else -> "آیه با موفقیت ثبت شد؛ قبول باشد"
                    },
                )
            }.onFailure { error ->
                if (error is ApiException && error.errorCode in setOf("claim_expired", "claim_not_found")) {
                    storedClaim = null
                    repository.clearClaim()
                    _uiState.update { it.copy(claim = null) }
                }
                handleFailure(error)
            }
        }
    }

    fun setSalawatDraft(value: Int) { _uiState.update { it.copy(salawatDraft = value.coerceIn(1, 1_000)) } }
    fun addOneSalawat() = setSalawatDraft(_uiState.value.salawatDraft + 1)

    fun contributeSalawat() {
        val intentionId = _uiState.value.selectedIntentionId ?: return
        val amount = _uiState.value.salawatDraft
        viewModelScope.launch {
            _uiState.update { it.copy(isWorking = true) }
            runCatching { repository.contributeSalawat(intentionId, amount) }
                .onSuccess { result ->
                    applyState(result.state)
                    _uiState.update { it.copy(isWorking = false, isOnline = true, salawatDraft = 14) }
                    postMessage(
                        if (result.completedKhatm) "ختم صلوات کامل شد؛ قبول باشد ✨"
                        else "${amount.toPersianDigits()} صلوات ثبت شد؛ قبول باشد",
                    )
                }
                .onFailure(::handleFailure)
        }
    }

    fun contributeDevotion() {
        val intentionId = _uiState.value.selectedIntentionId ?: return
        val devotionId = _uiState.value.selectedDevotionId
        val title = _uiState.value.devotionCatalog?.devotions?.firstOrNull { it.id == devotionId }?.shortTitle
            ?: "قرائت"
        viewModelScope.launch {
            _uiState.update { it.copy(isWorking = true) }
            runCatching { repository.contributeDevotion(intentionId, devotionId) }
                .onSuccess { result ->
                    applyState(result.state)
                    _uiState.update { it.copy(isWorking = false, isOnline = true) }
                    postMessage(if (result.completedCycle) "این دور $title کامل شد؛ قبول باشد ✨" else "$title ثبت شد؛ قبول باشد")
                }
                .onFailure(::handleFailure)
        }
    }

    fun createIntention(token: String, input: AdminIntentionInput) =
        runAdmin("نیت تازه اضافه شد") { repository.createIntention(token, input) }
    fun updateIntention(token: String, id: String, input: AdminIntentionInput) =
        runAdmin("تغییرات نیت ذخیره شد") { repository.updateIntention(token, id, input) }
    fun archiveIntention(token: String, id: String) =
        runAdmin("نیت از فهرست عمومی برداشته شد") { repository.archiveIntention(token, id) }

    fun dismissMessage(id: Long) {
        _uiState.update { if (it.message?.id == id) it.copy(message = null) else it }
    }

    private fun runAdmin(success: String, action: suspend () -> SiteState) {
        viewModelScope.launch {
            _uiState.update { it.copy(isWorking = true) }
            runCatching { action() }
                .onSuccess { state ->
                    applyState(state)
                    _uiState.update { it.copy(isWorking = false, isOnline = true) }
                    postMessage(success)
                }
                .onFailure(::handleFailure)
        }
    }

    private fun applyState(state: SiteState) {
        val selectedId = _uiState.value.selectedIntentionId
            ?.takeIf { id -> state.intentions.any { it.id == id } }
            ?: state.intentions.firstOrNull()?.id
        if (selectedId != null) repository.setSelectedIntentionId(selectedId)
        _uiState.update {
            it.copy(
                siteState = state,
                selectedIntentionId = selectedId,
                claim = storedClaim?.takeIf { stored -> stored.intentionId == selectedId && stored.claim.isActive() }?.claim,
            )
        }
    }

    private fun handleFailure(error: Throwable) {
        _uiState.update { it.copy(isWorking = false, isOnline = false, message = messageFor(error)) }
    }

    private fun postMessage(text: String) {
        _uiState.update { it.copy(message = UiMessage(messageIds.incrementAndGet(), text)) }
    }

    private fun messageFor(error: Throwable): UiMessage {
        val text = when ((error as? ApiException)?.errorCode) {
            "unauthorized" -> "رمز مدیریت درست نیست"
            "last_intention" -> "آخرین نیت فعال را نمی‌توان حذف کرد"
            "intention_not_found" -> "این نیت دیگر در دسترس نیست"
            "claim_expired" -> "زمان رزرو آیه تمام شده؛ یک آیه تازه بگیرید"
            "claim_not_found" -> "رزرو این آیه پیدا نشد؛ دوباره آیه بگیرید"
            "all_currently_claimed" -> "همه آیه‌های این دور فعلاً در حال خواندن‌اند"
            "invalid_request" -> "اطلاعات واردشده معتبر نیست"
            "admin_not_configured" -> "مدیریت سایت هنوز پیکربندی نشده است"
            else -> "اتصال برقرار نشد؛ اینترنت را بررسی و دوباره تلاش کنید"
        }
        return UiMessage(messageIds.incrementAndGet(), text, true)
    }
}

private fun QuranClaim.isActive() = runCatching { Instant.parse(expiresAt).isAfter(Instant.now()) }.getOrDefault(false)

internal fun Int.toPersianDigits(): String = toString().map {
    when (it) {
        '0' -> '۰'; '1' -> '۱'; '2' -> '۲'; '3' -> '۳'; '4' -> '۴'
        '5' -> '۵'; '6' -> '۶'; '7' -> '۷'; '8' -> '۸'; '9' -> '۹'
        else -> it
    }
}.joinToString("")
