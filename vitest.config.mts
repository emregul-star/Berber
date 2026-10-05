import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // tsconfig'deki "@/..." kısayolunun testlerde de çalışması için
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // "server-only" paketi sadece Next.js'in sunucu derlemesinde boş modüldür; testlerde de boş olsun
      "server-only": fileURLToPath(new URL("./test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
