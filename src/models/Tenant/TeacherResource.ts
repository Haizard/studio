
import mongoose, { Schema, Document } from 'mongoose';

export interface ITeacherResource extends Document {
  title: string;
  description?: string;
  fileUrl: string; // URL to the resource file
  fileType?: string; // e.g., "pdf", "docx", "video_link"
  subjectId?: mongoose.Schema.Types.ObjectId; // Ref to Subject
  classLevel?: string; // e.g., "Form 1", "A-Level"
  teacherId: mongoose.Schema.Types.ObjectId; // Ref to Teacher/User who uploaded
  academicYearId: mongoose.Schema.Types.ObjectId; // Ref to AcademicYear
  isPublic: boolean; // If shared with students or just for teachers
  createdAt: Date;
  updatedAt: Date;
}

const TeacherResourceSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    fileUrl: { type: String, required: true, trim: true },
    fileType: { type: String, trim: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    classLevel: { type: String, trim: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

TeacherResourceSchema.index({ teacherId: 1, academicYearId: 1 });
TeacherResourceSchema.index({ subjectId: 1, classLevel: 1 });

export default mongoose.models.TeacherResource || mongoose.model<ITeacherResource>('TeacherResource', TeacherResourceSchema);
