
import mongoose, { Schema, Document } from 'mongoose';

export interface IClass extends Document {
  name: string; // e.g., "Form 1A", "Senior 5 Arts"
  level: string; // e.g., "Form 1", "Senior 5", "Grade 1"
  stream?: string; // e.g., "A", "Blue", "Arts", "Sciences" (can be part of name too)
  classTeacherId?: mongoose.Schema.Types.ObjectId; // Ref to Teacher
  academicYearId: mongoose.Schema.Types.ObjectId; // Ref to AcademicYear this class instance belongs to
  subjectsOffered?: mongoose.Schema.Types.ObjectId[]; // Refs to Subject
  capacity?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ClassSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    level: { type: String, required: true, trim: true },
    stream: { type: String, trim: true },
    classTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    subjectsOffered: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
    capacity: { type: Number },
  },
  { timestamps: true }
);

ClassSchema.index({ name: 1, academicYearId: 1 }, { unique: true });
ClassSchema.index({ level: 1, academicYearId: 1 });

export default mongoose.models.Class || mongoose.model<IClass>('Class', ClassSchema);
