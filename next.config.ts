import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    // TODO: Remove this once Supabase types are generated
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
