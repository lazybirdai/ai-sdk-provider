import type {
  SharedV4Warning,
  SpeechModelV4,
  SpeechModelV4CallOptions,
} from '@ai-sdk/provider';
import {
  combineHeaders,
  createBinaryResponseHandler,
  parseProviderOptions,
  postJsonToApi,
  type FetchFunction,
} from '@ai-sdk/provider-utils';
import { lazybirdFailedResponseHandler } from './lazybird-error';
import {
  DEFAULT_VOICE_ID,
  lazybirdSpeechModelOptionsSchema,
  type LazybirdSpeechModelId,
} from './lazybird-speech-options';

export type LazybirdSpeechModelConfig = {
  provider: string;
  url: (options: { modelId: string; path: string }) => string;
  headers: () => Record<string, string | undefined>;
  fetch?: FetchFunction;
  _internal?: {
    currentDate?: () => Date;
  };
};

type LazybirdSpeechSettings = {
  locale?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  style?: string;
  styleIntensity?: number;
};

type LazybirdSpeechRequest = {
  voiceId: string;
  text?: string;
  ssml?: string;
  settings?: LazybirdSpeechSettings;
};

// The API wants a locale with a region ("es-ES"); a bare language returns 400.
const LOCALE_WITH_REGION = /^([a-z]{2,3})[-_]([a-z]{2}|\d{3})$/i;

function toLocale(language: string): string | undefined {
  const match = LOCALE_WITH_REGION.exec(language.trim());
  return match
    ? `${match[1].toLowerCase()}-${match[2].toUpperCase()}`
    : undefined;
}

export class LazybirdSpeechModel implements SpeechModelV4 {
  readonly specificationVersion = 'v4';

  get provider(): string {
    return this.config.provider;
  }

  constructor(
    readonly modelId: LazybirdSpeechModelId,
    private readonly config: LazybirdSpeechModelConfig,
  ) {}

  private async getArgs({
    text,
    voice = DEFAULT_VOICE_ID,
    outputFormat,
    instructions,
    speed,
    language,
    providerOptions,
  }: SpeechModelV4CallOptions) {
    const warnings: SharedV4Warning[] = [];

    const lazybirdOptions = await parseProviderOptions({
      provider: 'lazybird',
      providerOptions,
      schema: lazybirdSpeechModelOptionsSchema,
    });

    if (outputFormat != null && outputFormat.toLowerCase() !== 'mp3') {
      warnings.push({
        type: 'unsupported',
        feature: 'outputFormat',
        details: `Lazybird returns MP3 audio. The requested format "${outputFormat}" was ignored.`,
      });
    }

    if (instructions != null) {
      warnings.push({
        type: 'unsupported',
        feature: 'instructions',
        details:
          'Lazybird does not take free-form instructions. Use providerOptions.lazybird.style for a speaking style.',
      });
    }

    const settings: LazybirdSpeechSettings = {};

    if (language != null && language !== 'auto') {
      const locale = toLocale(language);
      if (locale != null) {
        settings.locale = locale;
      } else if (lazybirdOptions?.locale == null) {
        warnings.push({
          type: 'unsupported',
          feature: 'language',
          details: `Lazybird needs a locale with a region, such as "es-ES". "${language}" was ignored; the voice's own language is used.`,
        });
      }
    }
    if (settings.locale == null && lazybirdOptions?.locale != null) {
      settings.locale = lazybirdOptions.locale;
    }

    if (speed != null) settings.speed = speed;
    if (lazybirdOptions?.pitch != null) settings.pitch = lazybirdOptions.pitch;
    if (lazybirdOptions?.volume != null) settings.volume = lazybirdOptions.volume;
    if (lazybirdOptions?.style != null) settings.style = lazybirdOptions.style;
    if (lazybirdOptions?.styleIntensity != null) {
      settings.styleIntensity = lazybirdOptions.styleIntensity;
    }

    const body: LazybirdSpeechRequest = {
      voiceId: voice,
      ...(lazybirdOptions?.ssml ? { ssml: text } : { text }),
      ...(Object.keys(settings).length > 0 && { settings }),
    };

    return { body, warnings };
  }

  async doGenerate(
    options: SpeechModelV4CallOptions,
  ): Promise<Awaited<ReturnType<SpeechModelV4['doGenerate']>>> {
    const currentDate = this.config._internal?.currentDate?.() ?? new Date();
    const { body, warnings } = await this.getArgs(options);

    const {
      value: audio,
      responseHeaders,
      rawValue: rawResponse,
    } = await postJsonToApi({
      url: this.config.url({ path: '/generate-speech', modelId: this.modelId }),
      headers: combineHeaders(this.config.headers(), options.headers),
      body,
      failedResponseHandler: lazybirdFailedResponseHandler,
      successfulResponseHandler: createBinaryResponseHandler(),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    return {
      audio,
      warnings,
      request: {
        body: JSON.stringify(body),
      },
      response: {
        timestamp: currentDate,
        modelId: this.modelId,
        headers: responseHeaders,
        body: rawResponse,
      },
      providerMetadata: {
        lazybird: {
          voiceId: body.voiceId,
        },
      },
    };
  }
}
