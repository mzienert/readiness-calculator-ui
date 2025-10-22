import { generateDummyPassword } from './db/utils';

// Re-export environment constants from lib/env.ts for backward compatibility
export { 
  isProductionEnvironment, 
  isDevelopmentEnvironment, 
  isTestEnvironment 
} from './env';

export const DUMMY_PASSWORD = generateDummyPassword();
