import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: "/flameguard-os",
  images: { unoptimized: true },
};

export default nextConfig;
