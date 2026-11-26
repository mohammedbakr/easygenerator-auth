import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, mongo, Model, Types } from 'mongoose';
import type { UserEntity, UserWithPassword } from './entities/user.entity.js';
import { EmailAlreadyExistsError } from './errors/email-already-exists.error.js';
import { User } from './schemas/user.schema.js';

const DUPLICATE_KEY_ERROR_CODE = 11000;

type UserRecord = User & { _id: Types.ObjectId };

/** The only class that touches the Mongoose model. Returns plain objects, never documents. */
@Injectable()
export class UsersRepository {
  constructor(@InjectModel(User.name) private readonly model: Model<User>) {}

  async create(data: { email: string; name: string; passwordHash: string }): Promise<UserEntity> {
    try {
      const created = await this.model.create(data);
      return this.toEntity(created.toObject());
    } catch (error) {
      // Relying on the unique index (not find-then-insert) avoids a race between two signups.
      if (this.isDuplicateEmailError(error)) throw new EmailAlreadyExistsError();
      throw error;
    }
  }

  async findById(id: string): Promise<UserEntity | null> {
    if (!isValidObjectId(id)) return null;
    const record = await this.model.findById(id).lean<UserRecord>();
    return record ? this.toEntity(record) : null;
  }

  async findByEmailWithPassword(email: string): Promise<UserWithPassword | null> {
    const record = await this.model.findOne({ email }).select('+passwordHash').lean<UserRecord>();
    return record ? { ...this.toEntity(record), passwordHash: record.passwordHash } : null;
  }

  async findRefreshTokenHash(id: string): Promise<string | null> {
    if (!isValidObjectId(id)) return null;
    const record = await this.model.findById(id).select('+refreshTokenHash').lean<UserRecord>();
    return record?.refreshTokenHash ?? null;
  }

  async setRefreshTokenHash(id: string, hash: string | null): Promise<void> {
    if (!isValidObjectId(id)) return;
    await this.model.updateOne({ _id: id }, { $set: { refreshTokenHash: hash } });
  }

  /**
   * Atomic compare-and-set: only swaps the hash if it still equals `expectedHash`.
   * Returns false when another request already rotated it.
   */
  async replaceRefreshTokenHash(
    id: string,
    expectedHash: string,
    newHash: string,
  ): Promise<boolean> {
    if (!isValidObjectId(id)) return false;
    const result = await this.model.updateOne(
      { _id: id, refreshTokenHash: expectedHash },
      { $set: { refreshTokenHash: newHash } },
    );
    return result.modifiedCount === 1;
  }

  /** Only a clash on the email index counts; any other 11000 is a real error and is rethrown. */
  private isDuplicateEmailError(error: unknown): boolean {
    if (!(error instanceof mongo.MongoServerError) || error.code !== DUPLICATE_KEY_ERROR_CODE) {
      return false;
    }
    const { keyPattern } = error as { keyPattern?: Record<string, unknown> };
    return Boolean(keyPattern?.email);
  }

  private toEntity(record: UserRecord): UserEntity {
    return {
      id: record._id.toString(),
      email: record.email,
      name: record.name,
      createdAt: record.createdAt,
    };
  }
}
