// Tailwind v4 — @tailwindcss/postcss replaces the old `tailwindcss` +
// `autoprefixer` pair as separate PostCSS plugins (v4 vendor-prefixes
// internally, so autoprefixer is no longer needed at all).
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
