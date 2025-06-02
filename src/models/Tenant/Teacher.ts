
import mongoose, { Schema, Document } from 'mongoose';

export interface IAssignedClassSubject {
  classId: mongoose.Schema.Types.ObjectId; // Ref to Class
  subjectId: mongoose.Schema.Types.ObjectId; // Ref to Subject
  academicYearId: mongoose.Schema.Types.ObjectId; // Ref to AcademicYear
  _id?: mongoose.Types.ObjectId; // Optional: Mongoose might add this if not _id: false
}

const AssignedClassSubjectSchema: Schema = new Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
}, { _id: false });


export interface ITeacher extends Document {
  userId: mongoose.Schema.Types.ObjectId; // Ref to TenantUser
  teacherIdNumber?: string; // Optional school-specific ID
  qualifications?: string[];
  dateOfJoining: Date;
  specialization?: string;
  assignedClassesAndSubjects: IAssignedClassSubject[]; 
  isClassTeacherOf?: mongoose.Schema.Types.ObjectId; // Ref to Class if they are a class teacher
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TeacherSchema: Schema = new Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    teacherIdNumber: { type: String, unique: true, sparse: true, trim: true },
    qualifications: [{ type: String, trim: true }],
    dateOfJoining: { type: Date, required: true },
    specialization: { type: String, trim: true },
    assignedClassesAndSubjects: [AssignedClassSubjectSchema],
    isClassTeacherOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

TeacherSchema.index({ userId: 1 });
TeacherSchema.index({ teacherIdNumber: 1 }, { unique: true, partialFilterExpression: { teacherIdNumber: { $type: "string" } } }); // Ensure uniqueness only if field exists
TeacherSchema.index({ "assignedClassesAndSubjects.academicYearId": 1 });


export default mongoose.models.Teacher || mongoose.model<ITeacher>('Teacher', TeacherSchema);

