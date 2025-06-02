
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

// Export the schema definition directly
export const TenantUserSchemaDefinition: Schema = new Schema(
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

TenantUserSchemaDefinition.index({ username: 1 });
TenantUserSchemaDefinition.index({ email: 1 });
TenantUserSchemaDefinition.index({ role: 1 });

// The model name 'User' here is scoped to the tenant's database connection.
// Default export for convenience, but prefer using the schema definition for explicit registration on tenant connections.
export default mongoose.models.User || mongoose.model<ITenantUser>('User', TenantUserSchemaDefinition);
