import { describe, expect, it } from "vitest";
import { isValidSlug, normalizeHostname, resolveTenant } from "./tenant";

describe("normalizeHostname", () => {
  it("portu ve sondaki noktayı atar, küçük harfe çevirir", () => {
    expect(normalizeHostname("Demo.LocalHost:3000")).toBe("demo.localhost");
    expect(normalizeHostname("berberplatform.com.")).toBe("berberplatform.com");
  });
});

describe("isValidSlug", () => {
  it.each(["demo", "kral-berber", "berber34", "a"])("%s geçerli", (slug) => {
    expect(isValidSlug(slug)).toBe(true);
  });

  it.each(["", "-demo", "demo-", "Demo", "a.b", "a_b", "../admin", "x".repeat(64)])(
    "%s geçersiz",
    (slug) => {
      expect(isValidSlug(slug)).toBe(false);
    },
  );
});

describe("resolveTenant — yerel geliştirme (localhost:3000)", () => {
  const root = "localhost:3000";

  it("ana alan adı platform sayfasıdır", () => {
    expect(resolveTenant("localhost:3000", root)).toEqual({ kind: "platform" });
  });

  it("admin alt alan adı süper yönetici panelidir", () => {
    expect(resolveTenant("admin.localhost:3000", root)).toEqual({ kind: "admin" });
  });

  it("diğer alt alan adları dükkandır", () => {
    expect(resolveTenant("demo.localhost:3000", root)).toEqual({ kind: "shop", slug: "demo" });
  });
});

describe("resolveTenant — yayın (berberplatform.com)", () => {
  const root = "berberplatform.com";

  it("ana alan adı ve www platform sayfasıdır", () => {
    expect(resolveTenant("berberplatform.com", root)).toEqual({ kind: "platform" });
    expect(resolveTenant("www.berberplatform.com", root)).toEqual({ kind: "platform" });
  });

  it("dükkan alt alan adı", () => {
    expect(resolveTenant("kral-berber.berberplatform.com", root)).toEqual({
      kind: "shop",
      slug: "kral-berber",
    });
  });

  it("Vercel önizleme adresi platform sayfasıdır", () => {
    expect(resolveTenant("berber-abc123.vercel.app", root)).toEqual({ kind: "platform" });
  });

  it("başka bir alan adı dükkanın kendi alan adı olarak değerlendirilir", () => {
    expect(resolveTenant("www.kralberber.com", root)).toEqual({
      kind: "custom-domain",
      hostname: "www.kralberber.com",
    });
  });

  it("platform alan adıyla biten ama alt alan adı olmayan host karışmaz", () => {
    expect(resolveTenant("evilberberplatform.com", root)).toEqual({
      kind: "custom-domain",
      hostname: "evilberberplatform.com",
    });
  });
});
