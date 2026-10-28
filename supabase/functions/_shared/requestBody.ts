export type LimitedJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: 'too_large' | 'invalid_json' };

/**
 * Parse JSON without buffering an unbounded request body in memory.
 * The stream is cancelled as soon as the byte limit is exceeded.
 */
export async function readJsonLimited(
  req: Request,
  maxBytes: number,
): Promise<LimitedJsonResult> {
  const contentLength = req.headers.get('content-length');
  if (
    contentLength &&
    /^\d+$/.test(contentLength) &&
    Number(contentLength) > maxBytes
  ) {
    return { ok: false, reason: 'too_large' };
  }

  const reader = req.body?.getReader();
  if (!reader || !Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    return { ok: false, reason: 'invalid_json' };
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;

      if (totalBytes > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // The request is already being rejected; cancellation is best-effort.
        }
        return { ok: false, reason: 'too_large' };
      }

      chunks.push(value);
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, reason: 'invalid_json' };
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // A cancelled stream may already have released its lock.
    }
  }
}
