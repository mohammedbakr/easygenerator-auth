import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
} from '../../../common/constants/validation.constants.js';

@Schema({ timestamps: true })
export class User {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: EMAIL_MAX_LENGTH,
  })
  email: string;

  @Prop({
    required: true,
    trim: true,
    minlength: NAME_MIN_LENGTH,
    maxlength: NAME_MAX_LENGTH,
  })
  name: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ type: String, default: null, select: false })
  refreshTokenHash: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;

export const UserSchema = SchemaFactory.createForClass(User);

/** Never serialise secrets, even if a document is returned by mistake. */
UserSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    const { _id, passwordHash: _ph, refreshTokenHash: _rth, ...safe } = ret;
    return { id: String(_id), ...safe };
  },
});
