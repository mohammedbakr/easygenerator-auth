import { Injectable } from '@nestjs/common';
import { argon2id, hash, verify } from 'argon2';
import { HashingService } from './hashing.service.js';

/** argon2id with the library's default cost parameters (OWASP's first choice for passwords). */
@Injectable()
export class Argon2HashingService extends HashingService {
  hash(plain: string): Promise<string> {
    return hash(plain, { type: argon2id });
  }

  async verify(hashed: string, plain: string): Promise<boolean> {
    try {
      return await verify(hashed, plain);
    } catch {
      // A malformed stored hash must behave like a wrong password, not a 500.
      return false;
    }
  }
}
