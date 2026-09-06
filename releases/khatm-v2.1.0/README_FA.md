# انتشار نهایی مشترک `khatm-v2.1.0`

این انتشار، سایت و اپ Android را به‌عنوان یک جفت هماهنگ معرفی می‌کند.

| مورد | مقدار رسمی |
| --- | --- |
| شناسه انتشار مشترک | `khatm-v2.1.0` |
| نسخه سایت | `2.1.0` |
| نسخه اپ Android | `2.1.0` |
| کد نسخه Android | `3` |
| نام بسته Android | `com.imangpt.khatm` |
| آدرس سایت و API | `https://khatm.imangpt1996.chatgpt.site` |
| حداقل Android | Android 8.0، سطح API 26 |
| وضعیت | نهایی، کامل و امضاشده |
| Commit سورس مشترک | `a2ca4e99f9e37786d4f2199db8b4c36b0ebbced4` |
| شاخه قفل سورس | `source-lock/v2.1.0-selfhost-final` |

## دانلود اپ کامل

فایل رسمی:

[`Khatm-Android-v2.1.0_for-Khatm-Site-v2.1.0_FULL.apk`](./Khatm-Android-v2.1.0_for-Khatm-Site-v2.1.0_FULL.apk)

این APK کامل است و برای نصب تازه به نسخه قبلی نیاز ندارد. فایل Patch یا آپدیت جزئی نیست.

## کنترل اصالت

```text
SHA-256: 0fea6280f756b88e294ee56e31e63a6b42983488b4f40970bafcb665abf48ca5
Signing certificate SHA-256: 08b74fd8a857acfefb70fde94b26af400fc0e820658d871b33259a9871129c14
```

جزئیات در [`SHA256SUMS.txt`](./SHA256SUMS.txt) و [`release.json`](./release.json) ثبت شده است.

## قانون استفاده

- برای سایت نسخه `2.1.0` فقط از همین APK نسخه `2.1.0` استفاده کنید.
- APK داخل پوشه نسخه قدیمی را با سورس نسخه جدید ترکیب نکنید.
- برای هاست شخصی، از سورس شاخه قفل‌شده استفاده و آدرس HTTPS هاست را هنگام Build اپ تنظیم کنید.
- رمز مدیریت و کلید خصوصی امضا عمداً در GitHub قرار نگرفته‌اند.

## نتیجه بررسی انتشار

- آزمون‌های وب: موفق
- بررسی وابستگی‌های Production: بدون آسیب‌پذیری گزارش‌شده
- Android Unit Tests و `lintRelease`: موفق
- Android Release Build: موفق
- CodeQL و CI: موفق
- امضای APK: طرح‌های v2 و v3 معتبر
- ارتباط HTTP ناامن: غیرفعال
- Android Backup: غیرفعال
