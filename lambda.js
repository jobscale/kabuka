delete process.env.AWS_PROFILE;

import { logger } from '@jobscale/create-logger';
import { pending } from './index.js';

export const handler = async event => {
  logger.info('EVENT', JSON.stringify(event, null, 2));
  await pending;
  logger.info('RESPONSE', JSON.stringify({ statusCode: 200 }, null, 2));
  return { statusCode: 200 };
};
