
import mongoose, { Schema, Document } from 'mongoose';

export type ExamStatus = 'Scheduled' | 'Ongoing' | 'Completed' | 'Grading' | 'Published' | 'Cancelled';

export interface IExam extends Document {
  name: string; // e.g., "Mid Term Exams 2024", "End of Year Promotion Exams"
  academicYearId: mongoose.Schema.Types.ObjectId; // Ref to AcademicYear
  termId?: mongoose.Schema.Types.ObjectId; // Ref to Term (optional, but usually exams are term-based)
  startDate: Date;
  endDate: Date;
  description?: string;
  status: ExamStatus;
  weight?: number; // e.g., 30 for 30% contribution to term/year total
  createdAt: Date;
  updatedAt: Date;
}

const ExamSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    termId: { type: mongoose.Schema.Types.ObjectId, ref: 'Term' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ['Scheduled', 'Ongoing', 'Completed', 'Grading', 'Published', 'Cancelled'],
      default: 'Scheduled',
      required: true,
    },
    weight: { type: Number, min: 0, max: 100 }, // Assuming percentage
  },
  { timestamps: true }
);

ExamSchema.index({ name: 1, academicYearId: 1, termId: 1 }, { unique: true });
ExamSchema.index({ academicYearId: 1, status: 1 });

export default mongoose.models.Exam || mongoose.model<IExam>('Exam', ExamSchema);
