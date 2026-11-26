/** Abstract class (not an interface) so it can be a Nest injection token. */
export abstract class HashingService {
  abstract hash(plain: string): Promise<string>;
  abstract verify(hash: string, plain: string): Promise<boolean>;
}
