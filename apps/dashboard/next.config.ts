import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    MCP_BRIDGE_URL: process.env.MCP_BRIDGE_URL || 'http://localhost:3002',
    NEXT_PUBLIC_MCP_BRIDGE_URL: process.env.NEXT_PUBLIC_MCP_BRIDGE_URL || 'http://localhost:3002',
  },
};

export default nextConfig;
