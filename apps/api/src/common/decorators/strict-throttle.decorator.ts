import { SetMetadata } from '@nestjs/common';

export const STRICT_THROTTLE_KEY = 'strictThrottle';

/** Marks a route for the tight `auth` rate limit (sign-up / sign-in) on top of the global one. */
export const StrictThrottle = () => SetMetadata(STRICT_THROTTLE_KEY, true);
