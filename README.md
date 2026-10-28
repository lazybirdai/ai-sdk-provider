# Lazybird provider for the AI SDK

[Lazybird](https://lazybird.app) text to speech for the [Vercel AI SDK](https://ai-sdk.dev): 500+ voices in 150+ languages and accents, your own cloned and designed voices, and SSML for pauses and pronunciation.

## Setup

```bash
npm install @lazybirdai/ai-sdk-provider ai
```

Create an API key in [Lazybird Studio](https://lazybird.app) settings and set it as `LAZYBIRD_API_KEY`. The free plan includes 10,000 characters a month.

## Usage

```ts
import { generateSpeech } from 'ai';
import { lazybird } from '@lazybirdai/ai-sdk-provider';
import { writeFile } from 'node:fs/promises';

const { audio } = await generateSpeech({
  model: lazybird.speech(),
  text: 'Welcome to the show.',
  voice: 'tgJ2Hes6DauwTg8kFrRPLN', // Elyssia, the default voice
});

await writeFile('speech.mp3', audio.uint8Array);
```

The result is an MP3 file.

### Voices

Pass any voice `id` as `voice`. Browse and preview the library at [lazybird.app/voices](https://lazybird.app/voices), or list voices with `GET https://api.lazybird.app/v2/voices`. Cloned and designed voices from your account work the same way.

### Settings

| Option | Maps to |
| --- | --- |
| `speed` | Speaking rate. 1 is normal. |
| `language` | A locale with a region, such as `es-ES`. Any voice can speak any supported language. A bare language code such as `es` is ignored with a warning. |

Lazybird-specific settings go in `providerOptions.lazybird`:

```ts
await generateSpeech({
  model: lazybird.speech(),
  text: '<speak>One moment.<break time="1s"/>Here we go.</speak>',
  providerOptions: {
    lazybird: {
      ssml: true, // treat text as SSML
      pitch: 1.05, // 1 is the voice's normal pitch
      volume: 1, // 1 is normal, 0 is silent
      style: 'cheerful', // one of the voice's styleList values
      styleIntensity: 1.5,
    },
  },
});
```

`outputFormat` (other than `mp3`) and `instructions` are not supported and return a warning.

### Custom settings

```ts
import { createLazybird } from '@lazybirdai/ai-sdk-provider';

const lazybird = createLazybird({
  apiKey: process.env.MY_LAZYBIRD_KEY,
});
```

`createLazybird` also takes `baseURL`, `headers` and `fetch`.

## Links

- [Text to speech API](https://lazybird.app/text-to-speech-api)
- [API reference](https://lazybird.app/docs/api-reference)
- [Pricing](https://lazybird.app/pricing)

## License

MIT
