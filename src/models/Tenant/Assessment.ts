
import mongoose, { Schema, Document } from 'mongoose';

export interface IAssessment extends Document {
  examId: mongoose.Schema.Types.ObjectId; // Ref to Exam
  subjectId: mongoose.Schema.Types.ObjectId; // Ref to Subject
  classId: mongoose.Schema.Types.ObjectId; // Ref to Class (Assessment is for a specific class taking a subject in an exam)
  assessmentType: string; // e.g., "Theory Paper", "Practical", "Project", "Quiz"
  assessmentName: string; // e.g., "Paper 1", "Biology Practical Exam", "Term Project"
  maxMarks: number;
  assessmentDate: Date;
  assessmentTime?: string; // e.g., "09:00 AM - 12:00 PM"
  invigilatorId?: mongoose.Schema.Types.ObjectId; // Ref to User (Teacher)
  isGraded: boolean; // Indicates if marks entry is complete for this assessment
  createdAt: Date;
  updatedAt: Date;
}

const AssessmentSchema: Schema = new Schema(
  {
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    assessmentType: { type: String, required: true, trim: true },
    assessmentName: { type: String, required: true, trim: true },
    maxMarks: { type: Number, required: true, min: 0 },
    assessmentDate: { type: Date, required: true },
    assessmentTime: { type: String, trim: true },
    invigilatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isGraded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Unique combination for an assessment within an exam for a class and subject
AssessmentSchema.index({ examId: 1, classId: 1, subjectId: 1, assessmentName: 1 }, { unique: true });
AssessmentSchema.index({ examId: 1, subjectId: 1 });

export default mongoose.models.Assessment || mongoose.model<IAssessment>('Assessment', AssessmentSchema);
