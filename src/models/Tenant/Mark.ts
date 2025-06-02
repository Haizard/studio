
import mongoose, { Schema, Document } from 'mongoose';

export interface IMark extends Document {
  assessmentId: mongoose.Schema.Types.ObjectId; // Ref to Assessment
  studentId: mongoose.Schema.Types.ObjectId; // Ref to User (student)
  academicYearId: mongoose.Schema.Types.ObjectId; // Denormalized from Exam > Assessment
  termId?: mongoose.Schema.Types.ObjectId; // Denormalized from Exam > Assessment (optional)
  marksObtained?: number; // Optional because initially marks might not be entered
  comments?: string;
  recordedById: mongoose.Schema.Types.ObjectId; // Ref to User (teacher/admin who entered/updated marks)
  createdAt: Date;
  updatedAt: Date;
}

const MarkSchema: Schema = new Schema(
  {
    assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    termId: { type: mongoose.Schema.Types.ObjectId, ref: 'Term' },
    marksObtained: { type: Number, min: 0 }, // Max validation will be against Assessment.maxMarks in application logic
    comments: { type: String, trim: true },
    recordedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Unique combination of assessment and student
MarkSchema.index({ assessmentId: 1, studentId: 1 }, { unique: true });
MarkSchema.index({ studentId: 1, academicYearId: 1, termId: 1 }); // For fetching student's marks in a term/year

export default mongoose.models.Mark || mongoose.model<IMark>('Mark', MarkSchema);
