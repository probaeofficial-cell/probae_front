export function getMediaUrl(baseUrl?: string | null, filename?: string | null): string | null {
  let file = filename;
  let base = baseUrl;

  // Support calling getMediaUrl(filename) directly
  if ((arguments.length === 1 || !filename) && baseUrl && !baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    file = baseUrl;
    base = null;
  }

  if (!file) return null;

  // If already an absolute URL, return as-is
  if (file.startsWith('http://') || file.startsWith('https://')) {
    return file;
  }

  const effectiveBase = base || process.env.NEXT_PUBLIC_R2_BASE_URL || "https://pub-8a340b3e7e9443b19263b23a9e5d6044.r2.dev";
  const cleanBase = effectiveBase.endsWith('/') ? effectiveBase.slice(0, -1) : effectiveBase;
  const cleanFile = file.startsWith('/') ? file.slice(1) : file;
  return `${cleanBase}/${cleanFile}`;
}
