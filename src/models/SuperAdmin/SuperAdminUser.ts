
import mongoose, { Schema, Document } from 'mongoose';

export interface ISuperAdminUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: 'superadmin';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SuperAdminUserSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['superadmin'], default: 'superadmin', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SuperAdminUserSchema.index({ email: 1 });

export default mongoose.models.SuperAdminUser || mongoose.model<ISuperAdminUser>('SuperAdminUser', SuperAdminUserSchema);
