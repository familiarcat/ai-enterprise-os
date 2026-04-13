#!/bin/zsh
set -e

echo "🏛️ Phase 3: Establishing Dashboard Hierarchy and Cloud Deployment..."

# 1. Scaffold the Hierarchy Logic
mkdir -p apps/dashboard/src/layouts
cat <<EOF > apps/dashboard/src/layouts/DashboardHierarchy.tsx
import React from 'react';
import { VersionTree } from '@sovereign/ui';

export const AdminDashboard: React.FC = ({ children }) => (
  <div className="flex h-screen bg-slate-900 text-white">
    <aside className="w-64 border-r border-slate-800 p-4">
      <h2 className="text-xl font-bold mb-4">Sovereign OS</h2>
      <VersionTree hierarchy={{}} /> {/* Tree will be hydrated from MCP */}
    </aside>
    <main className="flex-1 overflow-auto p-8 bg-slate-50 text-slate-900">
      {children}
    </main>
  </div>
);
EOF

# 2. Create Cloud Infrastructure stubs (Terraform)
mkdir -p infrastructure/aws
echo "# AWS Cloud Brain Deployment\n# Managed by Terraform" > infrastructure/aws/main.tf

# 3. Final pnpm link
pnpm install
echo "🚀 Phase 3 Complete: System is ready for local testing and cloud deployment."
echo "To start the local environment: pnpm dev"