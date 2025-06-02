
import mongoose, { Schema, Document } from 'mongoose';

export interface IHolidayPackage extends Document {
  title: string;
  description?: string;
  classIds: mongoose.Schema.Types.ObjectId[]; // Target classes, ref to Class
  subjectId?: mongoose.Schema.Types.ObjectId; // Target subject, ref to Subject (optional, could be general)
  teacherId: mongoose.Schema.Types.ObjectId; // Teacher who assigned it, ref to Teacher/User
  academicYearId: mongoose.Schema.Types.ObjectId; // Ref to AcademicYear
  termId?: mongoose.Schema.Types.ObjectId; // Ref to Term (optional)
  fileUrls?: string[]; // URLs to package documents/resources
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HolidayPackageSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    classIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true }],
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Assuming teacher actions are by a User
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    termId: { type: mongoose.Schema.Types.ObjectId, ref: 'Term' },
    fileUrls: [{ type: String, trim: true }],
    dueDate: { type: Date },
  },
  { timestamps: true }
);

HolidayPackageSchema.index({ academicYearId: 1, termId: 1 });
HolidayPackageSchema.index({ teacherId: 1 });

export default mongoose.models.HolidayPackage || mongoose.model<IHolidayPackage>('HolidayPackage', HolidayPackageSchema);
