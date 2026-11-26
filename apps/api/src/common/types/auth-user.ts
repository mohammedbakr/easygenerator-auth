/** The authenticated caller, attached to the request by `JwtAuthGuard`. */
export interface AuthUser {
  id: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}
