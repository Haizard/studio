
import mongoose, { Schema, Document } from 'mongoose';

export interface IAlevelCombination extends Document {
  name: string; // e.g., "PCM", "HEG" (History, Economics, Geography)
  code: string; // e.g., "001", "A02"
  subjects: mongoose.Schema.Types.ObjectId[]; // Refs to Subject model
  description?: string;
  academicYearId: mongoose.Schema.Types.ObjectId; // Ref to AcademicYear this combination is active for
  createdAt: Date;
  updatedAt: Date;
}

const AlevelCombinationSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, unique: true }, // Unique within an academic year
    subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true }],
    description: { type: String, trim: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  },
  { timestamps: true }
);

// Ensure combination of code and academicYearId is unique
AlevelCombinationSchema.index({ code: 1, academicYearId: 1 }, { unique: true });
AlevelCombinationSchema.index({ name: 1, academicYearId: 1 });

export default mongoose.models.AlevelCombination || mongoose.model<IAlevelCombination>('AlevelCombination', AlevelCombinationSchema);
