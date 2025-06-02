
// This model would be registered against a tenant-specific database connection
import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'admin' | 'teacher' | 'student' | 'librarian' | 'finance' | 'pharmacy' | 'dormitory_master';

export interface ITenantUser extends Document {
  username: string;
  passwordHash: string;
  role: UserRole;
  email: string;
  firstName: string;
  lastName: string;
  profilePictureUrl?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TenantUserSchema: Schema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'teacher', 'student', 'librarian', 'finance', 'pharmacy', 'dormitory_master'],
    },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    profilePictureUrl: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

TenantUserSchema.index({ username: 1 });
TenantUserSchema.index({ email: 1 });
TenantUserSchema.index({ role: 1 });

// The model name 'User' here is scoped to the tenant's database connection.
export default mongoose.models.User || mongoose.model<ITenantUser>('User', TenantUserSchema);
