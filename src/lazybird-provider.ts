import {
  NoSuchModelError,
  type ProviderV4,
  type SpeechModelV4,
} from '@ai-sdk/provider';
import {
  loadApiKey,
  withoutTrailingSlash,
  withUserAgentSuffix,
  type FetchFunction,
} from '@ai-sdk/provider-utils';
import { LazybirdSpeechModel } from './lazybird-speech-model';
import type { LazybirdSpeechModelId } from './lazybird-speech-options';
import { VERSION } from './version';

export interface LazybirdProvider extends ProviderV4 {
  /**
   * Creates a model for speech generation.
   */
  (modelId?: LazybirdSpeechModelId): SpeechModelV4;

  /**
   * Creates a model for speech generation.
   */
  speech(modelId?: LazybirdSpeechModelId): SpeechModelV4;

  /**
   * Creates a model for speech generation.
   */
  speechModel(modelId?: LazybirdSpeechModelId): SpeechModelV4;
}

export interface LazybirdProviderSettings {
  /**
   * Lazybird API key, sent in the `X-API-Key` header. Defaults to the
   * `LAZYBIRD_API_KEY` environment variable. Create one in Lazybird Studio
   * settings.
   */
  apiKey?: string;

  /**
   * Base URL for the API calls. Defaults to `https://api.lazybird.app/v2`.
   */
  baseURL?: string;

  /**
   * Custom headers to include in the requests.
   */
  headers?: Record<string, string>;

  /**
   * Custom fetch implementation. You can use it as a middleware to intercept
   * requests, or to provide a custom fetch implementation for e.g. testing.
   */
  fetch?: FetchFunction;
}

/**
 * Create a Lazybird provider instance.
 */
export function createLazybird(
  options: LazybirdProviderSettings = {},
): LazybirdProvider {
  const baseURL =
    withoutTrailingSlash(options.baseURL) ?? 'https://api.lazybird.app/v2';

  const getHeaders = () =>
    withUserAgentSuffix(
      {
        'X-API-Key': loadApiKey({
          apiKey: options.apiKey,
          environmentVariableName: 'LAZYBIRD_API_KEY',
          description: 'Lazybird',
        }),
        ...options.headers,
      },
      `ai-sdk-lazybird/${VERSION}`,
    );

  const createSpeechModel = (modelId: LazybirdSpeechModelId = 'default') =>
    new LazybirdSpeechModel(modelId, {
      provider: 'lazybird.speech',
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      fetch: options.fetch,
    });

  const provider = function (modelId?: LazybirdSpeechModelId) {
    if (new.target) {
      throw new Error(
        'The Lazybird model function cannot be called with the new keyword.',
      );
    }
    return createSpeechModel(modelId);
  };

  provider.specificationVersion = 'v4' as const;
  provider.speech = createSpeechModel;
  provider.speechModel = createSpeechModel;

  provider.languageModel = (modelId: string) => {
    throw new NoSuchModelError({
      modelId,
      modelType: 'languageModel',
      message: 'Lazybird does not provide language models',
    });
  };

  provider.embeddingModel = (modelId: string) => {
    throw new NoSuchModelError({
      modelId,
      modelType: 'embeddingModel',
      message: 'Lazybird does not provide embedding models',
    });
  };

  provider.imageModel = (modelId: string) => {
    throw new NoSuchModelError({
      modelId,
      modelType: 'imageModel',
      message: 'Lazybird does not provide image models',
    });
  };

  return provider as LazybirdProvider;
}

/**
 * Default Lazybird provider instance. Reads the API key from the
 * `LAZYBIRD_API_KEY` environment variable.
 */
export const lazybird = createLazybird();
