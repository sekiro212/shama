# وثيقة مواصفات المتطلبات (SRS)
# متجر شمّة للعطور الفاخرة

**Software Requirements Specification**
**الإصدار:** 2.0
**التاريخ:** 2026-03-26
**المعيار:** IEEE 830-1998

---

## جدول المحتويات

1. [المقدمة](#1-المقدمة)
2. [الوصف العام](#2-الوصف-العام)
3. [ميزات النظام](#3-ميزات-النظام)
4. [متطلبات الواجهات الخارجية](#4-متطلبات-الواجهات-الخارجية)
5. [المتطلبات غير الوظيفية](#5-المتطلبات-غير-الوظيفية)
6. [نموذج حالات الاستخدام](#6-نموذج-حالات-الاستخدام)
7. [نموذج تدفق البيانات](#7-نموذج-تدفق-البيانات)
8. [مخطط قاعدة البيانات](#8-مخطط-قاعدة-البيانات)
9. [الملاحق](#9-الملاحق)

---

## 1. المقدمة

### 1.1 الغرض
تحدد هذه الوثيقة المتطلبات الكاملة لمنصة شمّة للتجارة الإلكترونية للعطور الفاخرة، بما في ذلك المتطلبات الوظيفية وغير الوظيفية، وتكامل بوابة الدفع Moamalat وخدمة التوصيل Vanex.

### 1.2 النطاق
**اسم المنتج:** شمّة - متجر العطور الفاخرة (Shama Luxury Perfumes)

**الوصف:** منصة تجارة إلكترونية متكاملة لبيع العطور الفاخرة في ليبيا، تتضمن:
- واجهة متجر للعملاء مع ذكاء اصطناعي
- لوحة تحكم للمسؤول
- بوابة دفع إلكتروني (Moamalat) + دفع عند الاستلام (COD)
- تكامل مع خدمة التوصيل (Vanex)
- مساعد ذكي (Chatbot) ونظام توصيات

**الفوائد:**
- تجربة تسوق فاخرة عبر الإنترنت
- توصيات مخصصة بالذكاء الاصطناعي
- دفع إلكتروني آمن
- توصيل سريع مع تتبع مباشر

### 1.3 التعريفات والاختصارات

| الاختصار | التعريف |
|----------|---------|
| SRS | Software Requirements Specification - وثيقة مواصفات المتطلبات |
| COD | Cash on Delivery - الدفع عند الاستلام |
| LYD | الدينار الليبي |
| API | Application Programming Interface - واجهة برمجة التطبيقات |
| CRUD | Create, Read, Update, Delete - إنشاء، قراءة، تحديث، حذف |
| AI | Artificial Intelligence - الذكاء الاصطناعي |
| UUID | Universally Unique Identifier - معرف فريد عالمياً |
| TTL | Time To Live - مدة الصلاحية |
| HMAC | Hash-based Message Authentication Code |
| SDK | Software Development Kit |
| RLS | Row-Level Security |
| CDN | Content Delivery Network |

### 1.4 المراجع

| المرجع | الرابط |
|--------|-------|
| وثيقة المتطلبات الوظيفية | `docs/functional-requirements.md` |
| وثيقة المتطلبات غير الوظيفية | `docs/non-functional-requirements.md` |
| مخطط قاعدة البيانات | `supabase_schema.sql` |
| توثيق Moamalat LightBox | `https://docs.moamalat.net/lightBox.html` |
| توثيق Vanex API | `https://docs.vanex.ly/` |
| توثيق Supabase | `https://supabase.com/docs` |
| توثيق Google Gemini | `https://ai.google.dev/docs` |

---

## 2. الوصف العام

### 2.1 منظور المنتج
شمّة هو نظام قائم بذاته يتكامل مع عدة خدمات خارجية:

```
┌──────────────────────────────────────────────┐
│           تطبيق شمّة (React/TypeScript)       │
│  ┌─────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ واجهة   │ │ لوحة    │ │ طبقة          │  │
│  │ العميل  │ │ المسؤول │ │ الخدمات       │  │
│  └────┬────┘ └────┬─────┘ └───────┬───────┘  │
│       └───────────┼───────────────┘           │
└───────────────────┼──────────────────────────┘
                    │
    ┌───────────────┼───────────────────────┐
    │               │                       │
    ▼               ▼               ▼       ▼
┌────────┐  ┌──────────┐  ┌─────────┐ ┌──────┐
│Supabase│  │Gemini AI │  │Moamalat │ │Vanex │
│  DB    │  │  API     │  │ الدفع   │ │التوصيل│
└────────┘  └──────────┘  └─────────┘ └──────┘
```

### 2.2 فئات المستخدمين

| الفئة | الوصف | المستوى التقني |
|-------|-------|---------------|
| **العميل** | مشتري العطور، لا يحتاج تسجيل دخول | منخفض - متوسط |
| **المسؤول** | مدير المتجر، يحتاج مصادقة | متوسط - عالي |
| **المساعد الذكي** | نظام AI تلقائي (Gemini) | - |
| **النظام** | عمليات خلفية تلقائية | - |

### 2.3 بيئة التشغيل
- **الواجهة الأمامية:** React 18 + TypeScript 5.5 + Vite 5.4
- **التصميم:** Tailwind CSS 3.4 + Radix UI + Framer Motion
- **قاعدة البيانات:** Supabase (PostgreSQL)
- **الذكاء الاصطناعي:** Google Gemini 2.0 Flash
- **الدفع:** Moamalat LightBox SDK
- **التوصيل:** Vanex REST API
- **المتصفحات:** Chrome, Firefox, Safari, Edge (أحدث إصدارين)

### 2.4 القيود
1. **العملة:** الدينار الليبي (LYD) فقط
2. **التوصيل:** داخل ليبيا فقط (54+ مدينة)
3. **الدفع:** Moamalat + COD فقط (لا يوجد PayPal/Stripe)
4. **اللغة:** واجهة المستخدم إنجليزية، المحادثة الذكية ثنائية اللغة (عربي/إنجليزي)
5. **حد الصور:** 5MB لكل صورة، أنواع: JPEG, PNG, WebP
6. **حد AI:** 1024 token لكل استجابة، Cache لـ 5 دقائق

### 2.5 الافتراضات
1. العميل لديه اتصال إنترنت مستقر
2. المسؤول لديه بيانات اعتماد Moamalat (MID, TID, SecretKey)
3. المسؤول لديه حساب Vanex مع API token
4. Gemini API متاح بالمنطقة

---

## 3. ميزات النظام

> **ملاحظة:** التفاصيل الكاملة لكل متطلب موجودة في `docs/functional-requirements.md`

### 3.1 تصفح المنتجات (FR-C-001 → FR-C-007)
**الأولوية:** عالية
- عرض مجموعة العطور مع ترقيم الصفحات (8/صفحة)
- فلاتر: الجنس، النوتات العطرية، الترتيب
- شارات: متميز، نفاد المخزون، مخزون منخفض

### 3.2 تفاصيل المنتج (FR-C-008 → FR-C-016)
**الأولوية:** عالية
- معرض صور متعدد مع تكبير
- نوتات عطرية (علوية، وسطى، قاعدية)
- اختيار الحجم (عينات + زجاجات)
- تحكم بالكمية مع فحص المخزون

### 3.3 البحث (FR-C-017 → FR-C-021)
**الأولوية:** عالية
- بحث نصي فوري (ILIKE)
- بحث ذكي بالذكاء الاصطناعي (Gemini)
- Debounce 300ms، اختصار Ctrl+K

### 3.4 السلة (FR-C-022 → FR-C-030)
**الأولوية:** عالية
- مفتاح مركب (id + size)
- فحص المخزون المستمر
- حفظ في localStorage

### 3.5 الدفع وإتمام الطلب (FR-C-037 → FR-C-056)
**الأولوية:** حرجة

#### 3.5.1 نموذج الدفع
```
العميل يختار طريقة الدفع:
├── الدفع عند الاستلام (COD)
│   └── الطلب يُنشأ بحالة: payment_status = "cod_pending"
│
└── الدفع الإلكتروني (Moamalat)
    ├── فتح LightBox SDK
    ├── العميل يدخل بيانات البطاقة/التحويل
    ├── Moamalat تعالج الدفع
    │   ├── نجاح → completeCallback → payment_status = "paid"
    │   ├── فشل → errorCallback → رسالة خطأ
    │   └── إلغاء → cancelCallback → العودة للصفحة
    └── التحقق من SecureHash (HMAC SHA-256)
```

#### 3.5.2 إعداد Moamalat LightBox
```javascript
// الإعداد المطلوب
Lightbox.Checkout.configure({
  MID: "معرف التاجر",          // 11-18 حرف
  TID: "معرف المحطة",          // 6-8 حرف
  AmountTrxn: amount * 1000,    // 1 دينار = 1000
  SecureHash: "HMAC SHA-256",   // 64 حرف
  TrxDateTime: "yyyyMMddHHmm",
  completeCallback: function(data) { /* نجاح */ },
  errorCallback: function(data) { /* خطأ */ },
  cancelCallback: function() { /* إلغاء */ }
});
Lightbox.Checkout.showLightbox();
```

### 3.6 تتبع الطلبات (FR-C-057 → FR-C-063)
**الأولوية:** عالية
- بحث برقم الطلب أو البريد الإلكتروني
- خط زمني: معلق → مؤكد → قيد المعالجة → تم الشحن → تم التوصيل
- **جديد:** عرض حالة الدفع + تتبع Vanex

### 3.7 اختبار العطور (FR-C-064 → FR-C-074)
**الأولوية:** متوسطة
- 6 أسئلة: المناسبة، الموسم، عائلة العطر، الكثافة، الجنس، الميزانية
- توصيات AI: أفضل 3 عطور مع نسبة تطابق

### 3.8 المساعد الذكي (FR-C-075 → FR-C-080)
**الأولوية:** متوسطة
- محادثة تدفقية (Streaming)
- ثنائي اللغة (عربي/إنجليزي)
- توصيات من الكاتالوج الحقيقي

### 3.9 إدارة الطلبات - المسؤول (FR-A-005 → FR-A-012)
**الأولوية:** حرجة

#### 3.9.1 تدفق تأكيد الطلب
```
المسؤول يؤكد الطلب
    │
    ├── تحديث حالة الطلب → "confirmed"
    │
    ├── إنشاء شحنة في Vanex API تلقائياً
    │   ├── إرسال: اسم المستلم، العنوان، المدينة، الهاتف، المنتجات
    │   ├── استقبال: رقم التتبع (vanex_tracking_id)
    │   └── تحديث حالة الطلب → "processing"
    │
    └── في حالة فشل Vanex API:
        ├── تسجيل الخطأ
        ├── إعلام المسؤول
        └── زر "إعادة الإرسال" يدوياً
```

### 3.10 إدارة المنتجات - المسؤول (FR-A-013 → FR-A-023)
**الأولوية:** عالية
- CRUD كامل للعطور
- رفع صور (5MB, JPEG/PNG/WebP)
- إدارة العينات والأحجام
- توليد أوصاف بالذكاء الاصطناعي

### 3.11 التحليلات (FR-A-024 → FR-A-030)
**الأولوية:** متوسطة
- إحصائيات: طلبات، إيرادات، متوسط القيمة
- أفضل المدن، تحليل شهري
- **جديد:** إحصائيات الدفع (COD vs Moamalat)

---

## 4. متطلبات الواجهات الخارجية

### 4.1 واجهة المستخدم (UI)

| الخاصية | القيمة |
|---------|-------|
| إطار العمل | React 18 + TypeScript |
| التصميم | Tailwind CSS + Radix UI |
| السمة | داكنة فاخرة (#0e0a1d + #b24ce2) |
| الحركات | Framer Motion + GSAP |
| التجاوب | Mobile-first (نقاط توقف: sm, md, lg, xl) |
| المكونات | 60+ مكون قابل لإعادة الاستخدام |

### 4.2 واجهة Supabase

| الخاصية | القيمة |
|---------|-------|
| SDK | @supabase/supabase-js 2.52 |
| قاعدة البيانات | PostgreSQL |
| التخزين | Supabase Storage (bucket: perfume-images) |
| المصادقة | جدول users مخصص (ليس Supabase Auth) |
| المتغيرات | VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY |

### 4.3 واجهة Gemini AI

| الخاصية | القيمة |
|---------|-------|
| SDK | @google/genai 1.10 |
| النموذج | gemini-2.0-flash |
| حد الاستجابة | 1024 tokens |
| درجة الحرارة | 0.3 (بحث) → 0.5 (اختبار) → 0.7 (محادثة) → 0.8 (أوصاف) |
| التخزين المؤقت | 5 دقائق لسياق المنتجات |
| المتغيرات | VITE_GEMINI_API_KEY |

### 4.4 واجهة Moamalat (جديد)

| الخاصية | القيمة |
|---------|-------|
| النوع | LightBox JavaScript SDK |
| بيئة الاختبار | `https://tnpg.moamalat.net:6006/js/lightbox.js` |
| بيئة الإنتاج | `https://npg.moamalat.net:6006/js/lightbox.js` |
| المصادقة | MerchantID + TerminalID + SecureHash |
| التشفير | HMAC SHA-256 |
| العملة | 434 (LYD)، المبلغ × 1000 |
| طرق الدفع | بطاقة، تحويل (Tahweel)، mVisa |
| المتغيرات | VITE_MOAMALAT_MID, VITE_MOAMALAT_TID, MOAMALAT_SECRET_KEY (server) |

### 4.5 واجهة Vanex API (جديد - placeholder)

| الخاصية | القيمة |
|---------|-------|
| النوع | REST API |
| التوثيق | `https://docs.vanex.ly/` (Swagger UI) |
| المصادقة | API Token (تفاصيل ستُحدد لاحقاً) |
| Endpoints المتوقعة | إنشاء شحنة، تتبع، مدن، حساب السعر، إلغاء |
| المتغيرات | VANEX_API_TOKEN (server), VANEX_API_URL |

---

## 5. المتطلبات غير الوظيفية

> **ملاحظة:** التفاصيل الكاملة في `docs/non-functional-requirements.md`

### 5.1 الأداء

| المقياس | الهدف |
|---------|-------|
| تحميل الصفحة الأولى | < 3 ثوانٍ |
| استجابة البحث النصي | < 500ms |
| استجابة AI | < 3 ثوانٍ |
| فتح LightBox | < 2 ثانية |
| تأكيد + Vanex | < 5 ثوانٍ |

### 5.2 الأمان

| البند | الوصف |
|-------|-------|
| دفع Moamalat | HMAC SHA-256، التحقق من الاستجابة، المفتاح السري server-side |
| Vanex API | Token server-side، proxy، تسجيل الطلبات |
| المصادقة | localStorage 24h (يحتاج تحسين: bcrypt, httpOnly cookies) |
| البيانات | RLS مطلوب، Input Sanitization مطلوب |

### 5.3 التوافرية
- تدهور رشيق لجميع APIs الخارجية
- إعادة محاولة Vanex (حتى 3 مرات)
- بديل COD عند عدم توفر Moamalat

---

## 6. نموذج حالات الاستخدام

### 6.1 مخطط حالات استخدام العميل
**الملف:** مخطط Excalidraw - Customer Use Case Diagram

**الفاعلون:** العميل، المساعد الذكي، بوابة Moamalat، Vanex API

**حالات الاستخدام الرئيسية:**
- تصفح المنتجات
- البحث (يمتد → البحث الذكي AI)
- إدارة السلة
- إتمام الطلب (يتضمن → اختيار طريقة الدفع)
  - الدفع عبر Moamalat
  - الدفع عند الاستلام
- تتبع الطلب (يتضمن → حالة الدفع + حالة التوصيل Vanex)
- اختبار العطور (يتضمن → توصيات AI)
- محادثة المساعد الذكي
- إدارة قائمة الأمنيات

### 6.2 مخطط حالات استخدام المسؤول
**الملف:** مخطط Excalidraw - Admin Use Case Diagram

**الفاعلون:** المسؤول، Vanex API، Gemini AI

**حالات الاستخدام الرئيسية:**
- تسجيل الدخول/الخروج
- إدارة الطلبات (عرض، تصفية، تحديث)
- تأكيد الطلب (يتضمن → إرسال لـ Vanex API)
- عرض تتبع Vanex
- إدارة المنتجات (يتضمن → توليد وصف AI)
- لوحة التحليلات

### 6.3 مخطط حالات استخدام النظام
**الملف:** مخطط Excalidraw - System Use Case Diagram

**الفاعلون:** Supabase DB، Gemini AI، Moamalat، Vanex API

**حالات الاستخدام الرئيسية:**
- التحقق من المخزون
- معالجة الدفع + التحقق من SecureHash
- إنشاء شحنة Vanex + مزامنة الحالة
- تخزين سياق AI مؤقت
- إدارة الجلسات

---

## 7. نموذج تدفق البيانات

### 7.1 مخطط السياق (المستوى 0)
**الملف:** مخطط Excalidraw - Context DFD Level 0

**الكيانات الخارجية (6):**
1. العميل
2. المسؤول
3. Supabase DB
4. Gemini AI
5. Moamalat (بوابة الدفع)
6. Vanex (خدمة التوصيل)

**العملية المركزية:** نظام شمّة للتجارة الإلكترونية

**تدفقات البيانات الرئيسية:**
- العميل ↔ النظام: بحث، سلة، دفع، اختبار ←→ منتجات، تأكيد، توصيات
- المسؤول ↔ النظام: تسجيل، تأكيد طلب، CRUD ←→ طلبات، تحليلات
- النظام ↔ Supabase: CRUD + صور ←→ بيانات
- النظام ↔ Gemini: استعلام + سياق ←→ استجابات
- النظام → Moamalat: طلب دفع + Hash ←→ نتيجة + تحقق
- النظام → Vanex: إنشاء شحنة ←→ تتبع + حالة

### 7.2 المخطط التفصيلي (المستوى 1)
**الملف:** مخطط Excalidraw - Detailed DFD Level 1

**العمليات (7):**
| رقم | العملية | الوصف |
|-----|---------|-------|
| 1.0 | إدارة المنتجات | جلب، تصفية، بحث، CRUD |
| 2.0 | السلة وإتمام الطلب | إضافة، فحص مخزون، إنشاء طلب |
| 3.0 | معالجة الدفع | Moamalat LightBox, COD, تحقق Hash |
| 4.0 | إدارة الطلبات | تتبع، تحديث حالة، تحليلات |
| 5.0 | تكامل التوصيل | إنشاء شحنة Vanex، مزامنة الحالة |
| 6.0 | خدمات AI | محادثة، بحث ذكي، اختبار، أوصاف |
| 7.0 | المصادقة والجلسات | تسجيل دخول، تحقق، انتهاء صلاحية |

**مخازن البيانات (7):**
| رقم | المخزن | الوصف |
|-----|--------|-------|
| D1 | المنتجات | perfumes + perfume_images + samples + bottle_sizes |
| D2 | الطلبات | orders (+ payment_status, vanex_tracking) |
| D3 | المستخدمون | users (admin) |
| D4 | localStorage | سلة، أمنيات، مصادقة، مشاهدات |
| D5 | AI Cache | سياق المنتجات (TTL: 5 دقائق) |
| D6 | معاملات الدفع | payment_transactions |
| D7 | بيانات الشحن | vanex tracking data |

---

## 8. مخطط قاعدة البيانات

### 8.1 الجداول الحالية

#### جدول users (المستخدمون)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### جدول perfumes (العطور)
```sql
CREATE TABLE perfumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    fragrance_notes JSONB,  -- {top:[], middle:[], base:[]}
    size VARCHAR(50),
    type VARCHAR(20) CHECK (type IN ('bottle','sample','gift')),
    rating DECIMAL(3,2) DEFAULT 4.5,
    reviews JSONB,
    gender VARCHAR(20) CHECK (gender IN ('men','women','unisex')),
    stock_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    has_samples BOOLEAN DEFAULT false,
    has_bottle_sizes BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### جدول perfume_images (صور العطور)
```sql
CREATE TABLE perfume_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    perfume_id UUID REFERENCES perfumes(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_name VARCHAR(255),
    file_path TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    is_primary BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### جدول perfume_samples (عينات العطور)
```sql
CREATE TABLE perfume_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    perfume_id UUID REFERENCES perfumes(id) ON DELETE CASCADE,
    size VARCHAR(20) CHECK (size IN ('3ml','5ml','10ml','15ml','20ml','25ml','30ml')),
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(perfume_id, size)
);
```

#### جدول perfume_bottle_sizes (أحجام الزجاجات)
```sql
CREATE TABLE perfume_bottle_sizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    perfume_id UUID REFERENCES perfumes(id) ON DELETE CASCADE,
    size VARCHAR(20) CHECK (size IN ('30ml','50ml','75ml','100ml','125ml','150ml','200ml')),
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(perfume_id, size)
);
```

#### جدول orders (الطلبات) - محدّث
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    city VARCHAR(255) NOT NULL,
    place_name VARCHAR(255),
    total DECIMAL(10,2) NOT NULL,
    order_date TIMESTAMP NOT NULL,
    items JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending','confirmed','processing','shipped','delivered','accepted','returned')),
    processed_at TIMESTAMP,
    -- أعمدة جديدة للدفع
    payment_method VARCHAR(20) DEFAULT 'cod'
        CHECK (payment_method IN ('cod','moamalat')),
    payment_status VARCHAR(20) DEFAULT 'pending'
        CHECK (payment_status IN ('pending','paid','failed','refunded','cod_pending','cod_collected')),
    payment_reference TEXT,           -- Moamalat SystemReference
    -- أعمدة جديدة للتوصيل
    vanex_tracking_id TEXT,           -- رقم تتبع Vanex
    vanex_status VARCHAR(50),         -- حالة التوصيل من Vanex
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    -- timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 8.2 جدول جديد - payment_transactions (معاملات الدفع)
```sql
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'LYD',
    method VARCHAR(20) NOT NULL CHECK (method IN ('moamalat','cod')),
    moamalat_system_ref TEXT,         -- SystemReference من Moamalat
    moamalat_network_ref TEXT,        -- NetworkReference من Moamalat
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending','completed','failed','cancelled','refunded')),
    secure_hash TEXT,                 -- SecureHash للتحقق
    paid_through VARCHAR(50),         -- Card, Tahweel, mVisa
    payer_account VARCHAR(50),        -- رقم البطاقة المقنع
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 8.3 مخطط العلاقات (ERD)

```
users (1) ──────────────────────── لا علاقة مباشرة بالجداول الأخرى

perfumes (1) ────┬──── (N) perfume_images
                 ├──── (N) perfume_samples
                 └──── (N) perfume_bottle_sizes

orders (1) ──────┬──── (N) payment_transactions
                 └──── items (JSONB: مصفوفة من المنتجات المطلوبة)
```

### 8.4 Triggers (المشغلات)
```sql
-- تحديث تلقائي لحقل updated_at على جميع الجداول
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- مطبق على: users, perfumes, orders, perfume_images,
--           perfume_samples, perfume_bottle_sizes, payment_transactions
```

---

## 9. الملاحق

### 9.1 قائمة المدن الليبية المدعومة
طرابلس، بنغازي، مصراتة، الزاوية، زليتن، صبراتة، الخمس، غريان، ترهونة، البيضاء، المرج، درنة، طبرق، سرت، أجدابيا، الأبيار، الجميل، صرمان، العجيلات، بني وليد، تاجوراء، جنزور، عين زارة، السواني، قصر بن غشير، أبو سليم، الجفارة، سوق الجمعة، جادو، نالوت، يفرن، الرجبان، مزدة، الشويرف، وادي الشاطئ، سبها، مرزق، أوباري، غات، الكفرة، الجغبوب، البريقة، رأس لانوف، الزويتينة، توكرة، شحات، سوسة، القبة، المرقب، القره بوللي، تازربو، ودان، هون، زلة

### 9.2 حالات الطلب (Status Enum)

| الحالة | الاسم بالعربية | اللون | الوصف |
|--------|---------------|-------|-------|
| pending | معلق | رمادي | في انتظار تأكيد المسؤول |
| confirmed | مؤكد | بنفسجي | المسؤول أكد → يُرسل لـ Vanex |
| processing | قيد المعالجة | أصفر | Vanex استلم الشحنة |
| shipped | تم الشحن | أزرق | في الطريق للعميل |
| delivered | تم التوصيل | أخضر | وصل للعميل |
| accepted | مقبول | أخضر داكن | العميل استلم وقبل |
| returned | مرتجع | أحمر | تم إرجاع الطلب |

### 9.3 حالات الدفع (Payment Status Enum)

| الحالة | الوصف |
|--------|-------|
| pending | في انتظار الدفع (Moamalat) |
| paid | تم الدفع بنجاح |
| failed | فشل الدفع الإلكتروني |
| refunded | تم استرداد المبلغ |
| cod_pending | دفع عند الاستلام - معلق |
| cod_collected | دفع عند الاستلام - تم التحصيل |

### 9.4 هيكل النوتات العطرية (JSONB)
```json
{
  "top": ["برغموت", "ليمون", "نعناع"],
  "middle": ["ورد", "ياسمين", "لافندر"],
  "base": ["عود", "مسك", "عنبر"]
}
```

### 9.5 هيكل عناصر الطلب (JSONB)
```json
[
  {
    "id": "uuid",
    "name": "اسم العطر",
    "price": 150.00,
    "size": "100ml",
    "quantity": 2,
    "image": "https://..."
  }
]
```

### 9.6 إعداد SecureHash لـ Moamalat
```
الخطوات:
1. ترتيب المعاملات أبجدياً
2. ربطها بـ = و &
3. فك ترميز المفتاح السري من Hex
4. حساب HMAC SHA-256
5. ترميز النتيجة بـ Hex
6. تحويل لأحرف كبيرة

مثال:
AmountTrxn=150000&DateTimeLocalTrxn=202603261430&MerchantId=MID123&TerminalId=TID123
→ HMAC-SHA256(hex_decode(SecretKey), request_string)
→ النتيجة: 64 حرف Hex uppercase
```

---

**نهاية الوثيقة**

**المراجعة التالية:** عند توفر تفاصيل Vanex API الكاملة
**المسؤول عن الوثيقة:** فريق تطوير شمّة
