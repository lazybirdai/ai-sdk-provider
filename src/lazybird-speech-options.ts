import { lazySchema, zodSchema, type InferSchema } from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

/**
 * Lazybird has one speech model. The voice you pick (`voice` in
 * `generateSpeech`) decides how it sounds.
 */
export type LazybirdSpeechModelId = 'default' | (string & {});

/**
 * A voice `id` from https://lazybird.app/voices or `GET /v2/voices`, including
 * your own cloned and designed voices. The default voice is Elyssia.
 */
export type LazybirdSpeechVoiceId = (string & {});

export const DEFAULT_VOICE_ID = 'tgJ2Hes6DauwTg8kFrRPLN';

export const lazybirdSpeechModelOptionsSchema = lazySchema(() =>
  zodSchema(
    z.object({
      /**
       * Treat `text` as SSML (wrapped in a `<speak>` element) for pauses and
       * pronunciation control.
       */
      ssml: z.boolean().nullish(),
      /**
       * Language and accent, as a locale with a region such as `es-ES`. Any
       * voice can speak any supported language.
       */
      locale: z.string().nullish(),
      /**
       * One of the voice's `styleList` values, such as `cheerful`. Ignored when
       * the voice doesn't list it.
       */
      style: z.string().nullish(),
      /** Strength of `style`. 1 is the default. */
      styleIntensity: z.number().nullish(),
      /** 1 is the voice's normal pitch. */
      pitch: z.number().positive().nullish(),
      /** 1 is the voice's normal volume; 0 is silent. */
      volume: z.number().min(0).nullish(),
    }),
  ),
);

export type LazybirdSpeechModelOptions = InferSchema<
  typeof lazybirdSpeechModelOptionsSchema
>;
