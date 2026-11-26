/** Domain error: the repository stays HTTP-free, the auth layer maps it to 409. */
export class EmailAlreadyExistsError extends Error {
  constructor() {
    super('Email is already registered');
    this.name = 'EmailAlreadyExistsError';
  }
}
