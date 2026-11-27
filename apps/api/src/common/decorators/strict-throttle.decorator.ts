import { SetMetadata } from '@nestjs/common';

export const STRICT_THROTTLE_KEY = 'strictThrottle';

export const StrictThrottle = () => SetMetadata(STRICT_THROTTLE_KEY, true);
