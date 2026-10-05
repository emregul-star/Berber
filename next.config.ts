import type { NextConfig } from "next";

// Supabase Storage'daki herkese açık görseller (logo, kapak, galeri) next/image ile
// optimize edilebilsin diye sadece bu projenin public storage yoluna izin veriyoruz.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseUrl
      ? [new URL(`${supabaseUrl}/storage/v1/object/public/**`)]
      : [],
  },
};

export default nextConfig;
