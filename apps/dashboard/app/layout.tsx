import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title:       'AI Enterprise OS — Mission Control',
  description: 'MCP-powered crew orchestration dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="relative z-10 antialiased">
        {children}
      </body>
    </html>
  );
}
