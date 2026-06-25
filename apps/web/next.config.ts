import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@termopane/calculation", "@termopane/drawing"],
};

export default nextConfig;
