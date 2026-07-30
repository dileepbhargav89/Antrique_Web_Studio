export function isExternalUrl(url: string, siteUrl: string): boolean {
  try {
    return new URL(url, siteUrl).origin !== new URL(siteUrl).origin;
  } catch {
    return false;
  }
}

export function withQueryParams(
  path: string,
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  }
  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}
