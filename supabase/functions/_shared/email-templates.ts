const BRAND_PRIMARY = "#5B8DD9";
const BRAND_DARKER = "#3E6BB5";
const BRAND_BG = "#F8F9FB";
const BRAND_DARK_BG = "#1a2235";
const BRAND_TEXT = "#323D50";

function wrapper(content: string, lang: "en" | "ar", unsubscribeUrl: string): string {
  const dir = lang === "ar" ? "rtl" : "ltr";
  const fontFamily = lang === "ar"
    ? "'Segoe UI', Tahoma, Arial, sans-serif"
    : "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
  const unsubText = lang === "ar" ? "إلغاء الاشتراك" : "Unsubscribe";

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND_BG};font-family:${fontFamily}">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:24px;margin-bottom:24px">
  <tr>
    <td style="background:linear-gradient(135deg,${BRAND_PRIMARY},${BRAND_DARKER});padding:32px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:28px;font-weight:700;letter-spacing:1px">SHAMA</h1>
      <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:12px;letter-spacing:3px">${lang === "ar" ? "عطور فاخرة" : "LUXURY PERFUMES"}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:32px 24px">${content}</td>
  </tr>
  <tr>
    <td style="padding:16px 24px 24px;text-align:center;border-top:1px solid #eee">
      <a href="${unsubscribeUrl}" style="color:#999;font-size:11px;text-decoration:underline">${unsubText}</a>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function productCard(
  name: string,
  price: number,
  imageUrl: string,
  reason: string,
  productUrl: string,
  lang: "en" | "ar"
): string {
  const viewText = lang === "ar" ? "اكتشف الآن" : "Discover Now";
  return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;border:1px solid #eee;border-radius:12px;overflow:hidden">
  <tr>
    <td width="120" style="vertical-align:top">
      <img src="${imageUrl}" alt="${name}" width="120" height="120" style="display:block;object-fit:cover">
    </td>
    <td style="padding:16px;vertical-align:top">
      <h3 style="margin:0 0 4px;color:${BRAND_TEXT};font-size:16px">${name}</h3>
      <p style="margin:0 0 8px;color:${BRAND_PRIMARY};font-size:18px;font-weight:700">${price} LYD</p>
      <p style="margin:0 0 12px;color:#6B7B8D;font-size:13px;line-height:1.4">${reason}</p>
      <a href="${productUrl}" style="display:inline-block;background:linear-gradient(135deg,${BRAND_PRIMARY},${BRAND_DARKER});color:#fff;padding:8px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">${viewText}</a>
    </td>
  </tr>
</table>`;
}

function promoBlock(code: string, discount: number, lang: "en" | "ar"): string {
  const text = lang === "ar"
    ? `استخدم الكود <strong>${code}</strong> للحصول على خصم ${discount}% — صالح لمدة 7 أيام`
    : `Use code <strong>${code}</strong> for ${discount}% off — valid for 7 days`;
  return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background:linear-gradient(135deg,${BRAND_PRIMARY}15,${BRAND_DARKER}15);border:1px dashed ${BRAND_PRIMARY};border-radius:12px;padding:0">
  <tr>
    <td style="padding:16px;text-align:center;color:${BRAND_TEXT};font-size:14px">${text}</td>
  </tr>
</table>`;
}

export function buildNewProductEmail(
  product: { name: string; price: number; imageUrl: string; id: string },
  reason: string,
  promoCode: string,
  discount: number,
  siteUrl: string,
  lang: "en" | "ar",
  unsubscribeUrl: string,
  userName?: string
): string {
  const greeting = lang === "ar"
    ? `${userName ? `مرحباً ${userName}` : "مرحباً"}،`
    : `Hi${userName ? ` ${userName}` : ""},`;
  const heading = lang === "ar"
    ? "أضفنا عطراً جديداً قد يعجبك"
    : "We just added something you might love";
  const productUrl = `${siteUrl}/product/${product.id}`;

  const content = `
    <p style="color:${BRAND_TEXT};font-size:15px;margin:0 0 8px">${greeting}</p>
    <h2 style="color:${BRAND_TEXT};font-size:20px;margin:0 0 20px">${heading}</h2>
    ${productCard(product.name, product.price, product.imageUrl, reason, productUrl, lang)}
    ${promoBlock(promoCode, discount, lang)}
  `;

  return wrapper(content, lang, unsubscribeUrl);
}

export function buildDigestEmail(
  products: { name: string; price: number; imageUrl: string; id: string; reason: string }[],
  promoCode: string,
  discount: number,
  siteUrl: string,
  lang: "en" | "ar",
  unsubscribeUrl: string,
  period: "weekly" | "monthly",
  userName?: string
): string {
  const greeting = lang === "ar"
    ? `${userName ? `مرحباً ${userName}` : "مرحباً"}،`
    : `Hi${userName ? ` ${userName}` : ""},`;
  const heading = lang === "ar"
    ? `اختياراتك العطرية لهذا ${period === "weekly" ? "الأسبوع" : "الشهر"}`
    : `Your fragrance picks this ${period === "weekly" ? "week" : "month"}`;

  const cards = products
    .map((p) => productCard(p.name, p.price, p.imageUrl, p.reason, `${siteUrl}/product/${p.id}`, lang))
    .join("");

  const content = `
    <p style="color:${BRAND_TEXT};font-size:15px;margin:0 0 8px">${greeting}</p>
    <h2 style="color:${BRAND_TEXT};font-size:20px;margin:0 0 20px">${heading}</h2>
    ${cards}
    ${promoBlock(promoCode, discount, lang)}
  `;

  return wrapper(content, lang, unsubscribeUrl);
}

export function buildReEngagementEmail(
  products: { name: string; price: number; imageUrl: string; id: string; reason: string }[],
  promoCode: string,
  discount: number,
  siteUrl: string,
  lang: "en" | "ar",
  unsubscribeUrl: string,
  userName?: string
): string {
  const greeting = lang === "ar"
    ? `${userName ? `${userName}، اشتقنا لك!` : "اشتقنا لك!"}`
    : `${userName ? `We miss you, ${userName}!` : "We miss you!"}`;
  const heading = lang === "ar"
    ? "تعال واكتشف الجديد"
    : "Come discover what's new";

  const cards = products
    .map((p) => productCard(p.name, p.price, p.imageUrl, p.reason, `${siteUrl}/product/${p.id}`, lang))
    .join("");

  const exploreText = lang === "ar" ? "استكشف المجموعة" : "Explore Our Collection";

  const content = `
    <h2 style="color:${BRAND_TEXT};font-size:22px;margin:0 0 8px">${greeting}</h2>
    <p style="color:#6B7B8D;font-size:15px;margin:0 0 24px">${heading}</p>
    ${cards}
    ${promoBlock(promoCode, discount, lang)}
    <div style="text-align:center;margin-top:24px">
      <a href="${siteUrl}/collection" style="display:inline-block;background:linear-gradient(135deg,${BRAND_PRIMARY},${BRAND_DARKER});color:#fff;padding:12px 32px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:600">${exploreText}</a>
    </div>
  `;

  return wrapper(content, lang, unsubscribeUrl);
}
