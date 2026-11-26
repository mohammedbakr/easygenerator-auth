/** Plain user object handed out by the repository; never a Mongoose document. */
export interface UserEntity {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

/** Only returned by the sign-in lookup, which needs the hash to verify the password. */
export interface UserWithPassword extends UserEntity {
  passwordHash: string;
}
