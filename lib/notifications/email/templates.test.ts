import { describe, expect, it } from "vitest";
import type { AppointmentNotificationData } from "../types";
import {
  customerCancelledEmail,
  customerCreatedEmail,
  customerRescheduledEmail,
  esc,
  shopCreatedEmail,
} from "./templates";

const base: AppointmentNotificationData = {
  appointmentId: "a1",
  status: "confirmed",
  serviceName: "Saç Kesimi",
  barberName: "Ahmet Yılmaz",
  startsAt: new Date("2026-10-12T11:30:00Z"),
  endsAt: new Date("2026-10-12T12:00:00Z"),
  whenLabel: "12 Ekim Pazartesi, 14:30",
  price: 350,
  customer: { name: "Ali Veli", phone: "905321234567", email: "ali@example.com", note: null },
  shop: {
    name: "Kral Berber",
    slug: "kral-berber",
    email: "dukkan@example.com",
    phone: "0216 555 00 00",
    whatsappNumber: "905550000000",
    address: "Bağdat Cad. 1",
    logoUrl: null,
    primaryColor: "#a4161a",
    onPrimaryColor: "#ffffff",
    isDemo: false,
    baseUrl: "https://kral-berber.berberplatform.com",
  },
  manageUrl: "https://kral-berber.berberplatform.com/randevu/TOKEN123",
};

describe("e-posta şablonları", () => {
  it("müşteriye oluşturma e-postası: özet, yönetim linki, Türkçe tarih ve ₺", () => {
    const email = customerCreatedEmail(base);
    expect(email.subject).toBe("Randevunuz oluşturuldu — 12 Ekim Pazartesi, 14:30");
    expect(email.html).toContain("https://kral-berber.berberplatform.com/randevu/TOKEN123");
    expect(email.html).toContain("Ahmet Yılmaz");
    expect(email.html).toMatch(/₺\s?350/);
    expect(email.html).toContain("#a4161a"); // dükkanın rengi
    expect(email.text).toContain("Randevunuzu yönetin");
  });

  it("onay bekleyen randevuda farklı başlık", () => {
    expect(customerCreatedEmail({ ...base, status: "pending" }).subject).toContain("Randevu talebiniz alındı");
    expect(shopCreatedEmail({ ...base, status: "pending" }).subject).toContain("onay bekliyor");
  });

  it("dükkana giden e-postada müşteri bilgileri ve panel linki", () => {
    const email = shopCreatedEmail({ ...base, customer: { ...base.customer, note: "Sakal da olsun" } });
    expect(email.html).toContain("0532 123 45 67");
    expect(email.html).toContain("Sakal da olsun");
    expect(email.html).toContain("https://kral-berber.berberplatform.com/panel");
  });

  it("müşterinin yazdığı HTML/link kaçırılır (zararlı içerik sokulamaz)", () => {
    const evil = {
      ...base,
      customer: {
        ...base.customer,
        name: '<a href="https://kotu.example">Tıkla</a>',
        note: "<script>alert(1)</script>",
      },
    };
    for (const email of [shopCreatedEmail(evil), customerCreatedEmail(evil)]) {
      expect(email.html).not.toContain("<script>");
      expect(email.html).not.toContain('<a href="https://kotu.example"');
      expect(email.html).toContain("&lt;a href=&quot;https://kotu.example&quot;&gt;");
    }
  });

  it("dükkan iptal ettiğinde müşteriye dükkan iletişim bilgisi verilir", () => {
    const email = customerCancelledEmail(base, "shop");
    expect(email.html).toContain("0216 555 00 00");
    expect(email.html).toContain("+905550000000");
    expect(email.html).toContain("https://kral-berber.berberplatform.com/randevu-al");
  });

  it("saat değişikliğinde eski ve yeni zaman", () => {
    const email = customerRescheduledEmail({ ...base, previousWhenLabel: "10 Ekim Cumartesi, 10:00" });
    expect(email.html).toContain("Eski zaman");
    expect(email.html).toContain("10 Ekim Cumartesi, 10:00");
    expect(email.html).toContain("12 Ekim Pazartesi, 14:30");
  });

  it("http(s) olmayan link butona konmaz", () => {
    const email = customerCreatedEmail({ ...base, manageUrl: "javascript:alert(1)" });
    expect(email.html).not.toContain("javascript:");
  });

  it("esc", () => {
    expect(esc(`<"'&>`)).toBe("&lt;&quot;&#39;&amp;&gt;");
    expect(esc(null)).toBe("");
  });
});

describe("kişiye özel link uyarısı", () => {
  it("sadece yönetim linkinin altında görünür", () => {
    expect(customerCreatedEmail(base).html).toContain("kimseyle paylaşmayın");
    expect(shopCreatedEmail(base).html).not.toContain("kimseyle paylaşmayın");
    expect(customerCancelledEmail(base, "shop").html).not.toContain("kimseyle paylaşmayın");
  });
});
