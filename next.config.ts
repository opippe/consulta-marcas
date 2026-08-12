import type { NextConfig } from "next";

const isGithubPagesBuild = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  ...(isGithubPagesBuild
    ? {
        // GitHub Pages serves only static files. The dynamic API route is
        // deployed separately and configured through NEXT_PUBLIC_API_BASE_URL.
        output: "export" as const,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
