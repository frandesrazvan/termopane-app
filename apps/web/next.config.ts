import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@termopane/calculation", "@termopane/drawing", "@termopane/pdf"],
};

export default nextConfig;
