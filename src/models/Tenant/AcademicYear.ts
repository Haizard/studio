
import mongoose, { Schema, Document } from 'mongoose';

export interface IAcademicYear extends Document {
  name: string; // e.g., "2023-2024"
  startDate: Date;
  endDate: Date;
  isActive: boolean; // Indicates the current academic year for operations
  createdAt: Date;
  updatedAt: Date;
}

const AcademicYearSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AcademicYearSchema.index({ name: 1 });
AcademicYearSchema.index({ isActive: 1 }); // To quickly find the active year

export default mongoose.models.AcademicYear || mongoose.model<IAcademicYear>('AcademicYear', AcademicYearSchema);
