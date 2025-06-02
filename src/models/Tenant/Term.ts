
import mongoose, { Schema, Document } from 'mongoose';

export interface ITerm extends Document {
  name: string; // e.g., "Term 1", "First Semester"
  academicYearId: mongoose.Schema.Types.ObjectId; // Ref to AcademicYear
  startDate: Date;
  endDate: Date;
  isActive: boolean; // Indicates the current term for operations
  createdAt: Date;
  updatedAt: Date;
}

const TermSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

TermSchema.index({ name: 1, academicYearId: 1 }, { unique: true });
TermSchema.index({ academicYearId: 1, isActive: 1 }); // To quickly find active term for a year

export default mongoose.models.Term || mongoose.model<ITerm>('Term', TermSchema);
