import { generateSpeech } from 'ai';
import { describe, expect, it } from 'vitest';
import { createLazybird } from './lazybird-provider';

const audioBytes = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00, 0x00]);

function mockFetch(
  response: () => Response = () =>
    new Response(audioBytes, { headers: { 'content-type': 'audio/mpeg' } }),
) {
  const calls: { url: string; headers: Headers; body: any }[] = [];
  const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      headers: new Headers(init?.headers),
      body: JSON.parse(String(init?.body)),
    });
    return response();
  };
  return { fetch, calls };
}

function provider(fetch: ReturnType<typeof mockFetch>['fetch']) {
  return createLazybird({ apiKey: 'test-key', fetch });
}

describe('LazybirdSpeechModel', () => {
  it('posts text with the voice and API key and returns the MP3', async () => {
    const { fetch, calls } = mockFetch();
    const result = await generateSpeech({
      model: provider(fetch).speech(),
      text: 'Hello from Lazybird.',
      voice: 'voice-123',
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.lazybird.app/v2/generate-speech');
    expect(calls[0].headers.get('x-api-key')).toBe('test-key');
    expect(calls[0].body).toEqual({
      voiceId: 'voice-123',
      text: 'Hello from Lazybird.',
    });
    expect(result.audio.uint8Array).toEqual(audioBytes);
    expect(result.warnings).toEqual([]);
  });

  it('uses the default voice when none is given', async () => {
    const { fetch, calls } = mockFetch();
    await generateSpeech({ model: provider(fetch)(), text: 'Hi.' });
    expect(calls[0].body.voiceId).toBe('tgJ2Hes6DauwTg8kFrRPLN');
  });

  it('maps speed, a regional language and provider options to settings', async () => {
    const { fetch, calls } = mockFetch();
    await generateSpeech({
      model: provider(fetch).speech(),
      text: 'Hola.',
      speed: 1.2,
      language: 'es_es',
      providerOptions: {
        lazybird: { pitch: 0.9, volume: 1.1, style: 'cheerful', styleIntensity: 2 },
      },
    });
    expect(calls[0].body.settings).toEqual({
      locale: 'es-ES',
      speed: 1.2,
      pitch: 0.9,
      volume: 1.1,
      style: 'cheerful',
      styleIntensity: 2,
    });
  });

  it('sends SSML when asked', async () => {
    const { fetch, calls } = mockFetch();
    const ssml = '<speak>Wait<break time="1s"/>now.</speak>';
    await generateSpeech({
      model: provider(fetch).speech(),
      text: ssml,
      providerOptions: { lazybird: { ssml: true } },
    });
    expect(calls[0].body.ssml).toBe(ssml);
    expect(calls[0].body.text).toBeUndefined();
  });

  it('warns about settings the API does not take', async () => {
    const { fetch, calls } = mockFetch();
    const result = await generateSpeech({
      model: provider(fetch).speech(),
      text: 'Hi.',
      language: 'es',
      outputFormat: 'wav',
      instructions: 'Whisper',
    });
    expect(calls[0].body.settings).toBeUndefined();
    expect(result.warnings.map(w => (w as { feature: string }).feature)).toEqual([
      'outputFormat',
      'instructions',
      'language',
    ]);
  });

  it('prefers a valid language over the locale provider option', async () => {
    const { fetch, calls } = mockFetch();
    await generateSpeech({
      model: provider(fetch).speech(),
      text: 'Hi.',
      language: 'fr-CA',
      providerOptions: { lazybird: { locale: 'fr-FR' } },
    });
    expect(calls[0].body.settings).toEqual({ locale: 'fr-CA' });
  });

  it('surfaces the API error message', async () => {
    const { fetch } = mockFetch(
      () =>
        new Response(
          JSON.stringify({
            error: 'Authorization Error: Invalid API key',
            name: 'AuthorizationError',
          }),
          { status: 401, headers: { 'content-type': 'application/json' } },
        ),
    );
    await expect(
      generateSpeech({ model: provider(fetch).speech(), text: 'Hi.', maxRetries: 0 }),
    ).rejects.toThrow('Authorization Error: Invalid API key');
  });
});

describe('createLazybird', () => {
  it('honours a custom base URL', async () => {
    const { fetch, calls } = mockFetch();
    await generateSpeech({
      model: createLazybird({
        apiKey: 'k',
        baseURL: 'https://example.test/v2/',
        fetch,
      }).speech(),
      text: 'Hi.',
    });
    expect(calls[0].url).toBe('https://example.test/v2/generate-speech');
  });

  it('has no language, embedding or image models', () => {
    const lazybird = createLazybird({ apiKey: 'k' });
    expect(() => lazybird.languageModel('x')).toThrow();
    expect(() => lazybird.embeddingModel('x')).toThrow();
    expect(() => lazybird.imageModel('x')).toThrow();
  });
});
