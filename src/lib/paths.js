const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH || process.env.BASE_PATH || '';

export const basePath = rawBasePath.replace(/\/+$/, '');

export function appPath(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!basePath) return normalizedPath;
  if (normalizedPath === '/') return basePath;

  return `${basePath}${normalizedPath}`;
}
