import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only Next.js indicator button floats bottom-left and covers the sidebar's
  // "ย่อเมนู" button — move it to the bottom-right corner instead.
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
