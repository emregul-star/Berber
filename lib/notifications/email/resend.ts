/**
 * Resend e-posta API'si (https://resend.com). Ek paket kurmamak için doğrudan HTTP ile çağrılır.
 * Ücretsiz plan: ayda 3.000, günde 100 e-posta.
 *
 * Not: Resend'de alan adı doğrulanmadan sadece "onboarding@resend.dev" adresinden ve sadece
 * hesap sahibinin e-posta adresine gönderim yapılabilir. Gerçek müşterilere gönderim için
 * alan adı doğrulaması gerekir (Bölüm 16, madde 6).
 */
import "server-only";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Alıcı "yanıtla" dediğinde gidecek adres (ör. dükkanın e-postası) */
  replyTo?: string | null;
  /** Gönderen adı (adres EMAIL_FROM'dan gelir), ör. "Demo Berber" */
  fromName?: string;
  attachments?: { filename: string; content: string; contentType: string }[];
  /** Aynı e-postanın (ör. tekrar denemede) iki kez gitmemesi için */
  idempotencyKey?: string;
};

const DEFAULT_FROM_ADDRESS = "onboarding@resend.dev";

export function isResendConfigured(): boolean {
  return Boolean(process.env.EMAIL_PROVIDER_API_KEY);
}

/** EMAIL_FROM "Ad <adres>" veya sadece "adres" olabilir; adres kısmını alır. */
function fromAddress(): string {
  const raw = process.env.EMAIL_FROM?.trim();
  if (!raw) return DEFAULT_FROM_ADDRESS;
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim();
}

/** Gönderen adında e-posta başlığını bozabilecek karakterleri temizler */
function safeDisplayName(name: string): string {
  return name.replace(/["<>\r\n]/g, "").trim();
}

/** E-postayı gönderir; başarılıysa Resend'in e-posta kimliğini döndürür, hata varsa fırlatır. */
export async function sendWithResend(message: EmailMessage): Promise<string> {
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY;
  if (!apiKey) throw new Error("EMAIL_PROVIDER_API_KEY tanımlı değil");

  const from = message.fromName ? `"${safeDisplayName(message.fromName)}" <${fromAddress()}>` : fromAddress();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(message.idempotencyKey ? { "Idempotency-Key": message.idempotencyKey.slice(0, 256) } : {}),
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      ...(message.attachments?.length
        ? {
            attachments: message.attachments.map((a) => ({
              filename: a.filename,
              content: a.content,
              content_type: a.contentType,
            })),
          }
        : {}),
    }),
    // E-posta servisi takılırsa sonsuza kadar beklemeyelim
    signal: AbortSignal.timeout(10_000),
  });

  const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
  if (!response.ok || !body.id) {
    throw new Error(`Resend hatası (HTTP ${response.status}): ${body.name ?? ""} ${body.message ?? ""}`.trim());
  }
  return body.id;
}
