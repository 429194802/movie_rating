const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const basePath = rawBasePath.replace(/\/+$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(basePath ? { basePath } : {})
};

export default nextConfig;
