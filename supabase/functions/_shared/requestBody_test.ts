import { readJsonLimited } from './requestBody.ts';

Deno.test('readJsonLimited accepts valid JSON within the byte limit', async () => {
  const req = new Request('https://example.test', {
    method: 'POST',
    body: JSON.stringify({ message: 'ok' }),
  });
  const result = await readJsonLimited(req, 1024);
  if (!result.ok) throw new Error(`Expected valid JSON, got ${result.reason}`);
  if (JSON.stringify(result.value) !== JSON.stringify({ message: 'ok' })) {
    throw new Error('Parsed JSON did not match the request body');
  }
});

Deno.test('readJsonLimited rejects a body that exceeds the byte limit', async () => {
  const req = new Request('https://example.test', {
    method: 'POST',
    body: JSON.stringify({ message: 'x'.repeat(256) }),
  });
  const result = await readJsonLimited(req, 64);
  if (result.ok || result.reason !== 'too_large') {
    throw new Error('Expected oversized request body to be rejected');
  }
});

Deno.test('readJsonLimited rejects malformed JSON under the byte limit', async () => {
  const req = new Request('https://example.test', {
    method: 'POST',
    body: '{invalid}',
  });
  const result = await readJsonLimited(req, 64);
  if (result.ok || result.reason !== 'invalid_json') {
    throw new Error('Expected malformed JSON to be rejected');
  }
});
