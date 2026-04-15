import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'space-dark':   '#0d1022',
        'space-darker': '#0b0f1d',
        'space-card':   'rgba(255, 255, 255, 0.05)',
        'lcars-gold':   '#c9a227',
        'lcars-blue':   '#0077b6',
        'lcars-cyan':   '#00c2ff',
        'lcars-red':    '#c41e3a',
        'crew-green':   '#00ffaa',
      },
      backgroundImage: {
        'alex-gradient': 'linear-gradient(180deg, rgba(13,16,34,.95), rgba(11,15,29,.85))',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
