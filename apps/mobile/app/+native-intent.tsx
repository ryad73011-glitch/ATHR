
/**
 * Normalize incoming native deep links for the ATHR auth callback.
 * Leave unrelated links unchanged.
 */
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}) {
  try {
    const url = new URL(path, 'athr://app');

    const isCallback =
      url.pathname.toLowerCase().includes('callback');

    if (!isCallback) {
      return path;
    }

    return `/(auth)/callback${url.search}${url.hash}`;
  } catch {
    return path;
  }
}
