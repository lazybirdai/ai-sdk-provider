import {
  createJsonErrorResponseHandler,
  lazySchema,
  zodSchema,
  type InferSchema,
} from '@ai-sdk/provider-utils';
import { z } from 'zod/v4';

export const lazybirdErrorDataSchema = lazySchema(() =>
  zodSchema(
    z.object({
      error: z.string(),
      name: z.string().nullish(),
      code: z.string().nullish(),
    }),
  ),
);

export type LazybirdErrorData = InferSchema<typeof lazybirdErrorDataSchema>;

export const lazybirdFailedResponseHandler = createJsonErrorResponseHandler({
  errorSchema: lazybirdErrorDataSchema,
  errorToMessage: data => data.error,
});
