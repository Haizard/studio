
import mongoose, { Schema, Document } from 'mongoose';

export interface ISchool extends Document {
  name: string;
  schoolCode: string; // Unique code for URL and identification
  mongodbUri: string; // Connection string for the school's dedicated database
  logoUrl?: string;
  contactInfo: {
    email?: string;
    phone?: string;
    address?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SchoolSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    schoolCode: { type: String, required: true, unique: true, trim: true, lowercase: true },
    mongodbUri: { type: String, required: true },
    logoUrl: { type: String, trim: true },
    contactInfo: {
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
      address: { type: String, trim: true },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SchoolSchema.index({ schoolCode: 1 });
SchoolSchema.index({ name: 1 });

export default mongoose.models.School || mongoose.model<ISchool>('School', SchoolSchema);
