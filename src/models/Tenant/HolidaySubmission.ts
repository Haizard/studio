
import mongoose, { Schema, Document } from 'mongoose';

export interface IHolidaySubmission extends Document {
  holidayPackageId: mongoose.Schema.Types.ObjectId; // Ref to HolidayPackage
  studentId: mongoose.Schema.Types.ObjectId; // Ref to Student/User
  submissionDate: Date;
  fileUrls: string[]; // URLs to student's submitted files
  teacherComments?: string;
  marksAwarded?: number;
  status: 'Submitted' | 'Late' | 'Graded' | 'Resubmitted';
  createdAt: Date;
  updatedAt: Date;
}

const HolidaySubmissionSchema: Schema = new Schema(
  {
    holidayPackageId: { type: mongoose.Schema.Types.ObjectId, ref: 'HolidayPackage', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Assuming student actions are by a User
    submissionDate: { type: Date, default: Date.now, required: true },
    fileUrls: [{ type: String, trim: true, required: true }],
    teacherComments: { type: String, trim: true },
    marksAwarded: { type: Number },
    status: {
      type: String,
      enum: ['Submitted', 'Late', 'Graded', 'Resubmitted'],
      default: 'Submitted',
      required: true,
    },
  },
  { timestamps: true }
);

HolidaySubmissionSchema.index({ holidayPackageId: 1, studentId: 1 }, { unique: true });
HolidaySubmissionSchema.index({ studentId: 1, status: 1 });

export default mongoose.models.HolidaySubmission || mongoose.model<IHolidaySubmission>('HolidaySubmission', HolidaySubmissionSchema);
