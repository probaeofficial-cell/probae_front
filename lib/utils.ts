export function getMediaUrl(baseUrl?: string | null, filename?: string | null): string | null {
  if (!baseUrl || !filename) return null;
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanFile = filename.startsWith('/') ? filename.slice(1) : filename;
  return `${cleanBase}/${cleanFile}`;
}
