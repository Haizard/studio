
import mongoose, { Schema, Document } from 'mongoose';

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export interface IAttendance extends Document {
  studentId: mongoose.Schema.Types.ObjectId; // Ref to User (Student)
  classId: mongoose.Schema.Types.ObjectId; // Ref to Class
  subjectId?: mongoose.Schema.Types.ObjectId; // Optional: Ref to Subject (if attendance is per subject)
  academicYearId: mongoose.Schema.Types.ObjectId; // Ref to AcademicYear
  date: Date; // Date of attendance (store as YYYY-MM-DD in UTC or handle timezone carefully)
  status: AttendanceStatus;
  remarks?: string;
  recordedById: mongoose.Schema.Types.ObjectId; // Ref to User (Teacher/Admin who recorded)
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema: Schema = new Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    date: { type: Date, required: true }, // Store date part only, e.g., by setting time to 00:00:00 UTC
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Late', 'Excused'],
      required: true,
    },
    remarks: { type: String, trim: true },
    recordedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Unique record for a student, for a class, on a specific date (and subject if applicable)
AttendanceSchema.index({ studentId: 1, classId: 1, date: 1, subjectId: 1, academicYearId: 1 }, { unique: true });
AttendanceSchema.index({ classId: 1, date: 1, academicYearId: 1 });
AttendanceSchema.index({ studentId: 1, academicYearId: 1, status: 1 });


export default mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema);
