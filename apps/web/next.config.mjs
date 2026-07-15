/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lean, self-contained server bundle for the Docker runtime image.
  output: 'standalone',
};

export default nextConfig;
