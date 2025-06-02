
import mongoose, { Schema, Document } from 'mongoose';

export interface IStudent extends Document {
  userId: mongoose.Schema.Types.ObjectId; // Ref to TenantUser
  studentIdNumber: string; // School-specific unique ID
  admissionDate: Date;
  currentClassId?: mongoose.Schema.Types.ObjectId; // Ref to Class
  currentAcademicYearId?: mongoose.Schema.Types.ObjectId; // Ref to AcademicYear
  stream?: string; // e.g., 'Science', 'Arts', specific to class or level
  alevelCombinationId?: mongoose.Schema.Types.ObjectId; // Ref to AlevelCombination
  oLevelOptionalSubjects?: mongoose.Schema.Types.ObjectId[]; // Refs to Subject
  dateOfBirth: Date;
  gender: 'Male' | 'Female' | 'Other';
  // Add other student-specific fields like parent info, address, medical history etc.
  isActive: boolean; // For active enrollment
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema: Schema = new Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    studentIdNumber: { type: String, required: true, unique: true, trim: true },
    admissionDate: { type: Date, required: true },
    currentClassId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    currentAcademicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
    stream: { type: String, trim: true },
    alevelCombinationId: { type: mongoose.Schema.Types.ObjectId, ref: 'AlevelCombination' },
    oLevelOptionalSubjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

StudentSchema.index({ studentIdNumber: 1 });
StudentSchema.index({ userId: 1 });
StudentSchema.index({ currentClassId: 1, currentAcademicYearId: 1 });

export default mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);
