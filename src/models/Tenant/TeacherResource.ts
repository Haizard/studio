
import mongoose, { Schema, Document } from 'mongoose';

export type ResourceFileType = 'PDF' | 'Document' | 'Spreadsheet' | 'Presentation' | 'Image' | 'Video' | 'Audio' | 'Link' | 'Other';

export interface ITeacherResource extends Document {
  title: string;
  description?: string;
  fileUrl: string; 
  fileType?: ResourceFileType; 
  subjectId?: mongoose.Schema.Types.ObjectId; 
  classLevel?: string; 
  teacherId: mongoose.Schema.Types.ObjectId; 
  academicYearId: mongoose.Schema.Types.ObjectId; 
  isPublic: boolean; 
  createdAt: Date;
  updatedAt: Date;
}

const TeacherResourceSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    fileUrl: { type: String, required: true, trim: true },
    fileType: { 
      type: String, 
      trim: true,
      enum: ['PDF', 'Document', 'Spreadsheet', 'Presentation', 'Image', 'Video', 'Audio', 'Link', 'Other']
    },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    classLevel: { type: String, trim: true }, // E.g., "Form 1", "S.5", "All O-Level"
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

TeacherResourceSchema.index({ teacherId: 1, academicYearId: 1 });
TeacherResourceSchema.index({ subjectId: 1, classLevel: 1, isPublic: 1 });
TeacherResourceSchema.index({ title: 'text', description: 'text' }); // For searching later

export default mongoose.models.TeacherResource || mongoose.model<ITeacherResource>('TeacherResource', TeacherResourceSchema);
