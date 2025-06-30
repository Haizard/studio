
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IVisit extends Document {
  studentId: Types.ObjectId; // Ref to Student's User ID
  checkInTime: Date;
  checkOutTime?: Date;
  symptoms: string;
  diagnosis?: string;
  treatment?: string; // Summary of treatment given
  notes?: string;
  recordedById: Types.ObjectId; // User who recorded the visit
  createdAt: Date;
  updatedAt: Date;
}

const VisitSchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    checkInTime: { type: Date, required: true, default: Date.now },
    checkOutTime: { type: Date },
    symptoms: { type: String, required: true, trim: true },
    diagnosis: { type: String, trim: true },
    treatment: { type: String, trim: true },
    notes: { type: String, trim: true },
    recordedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

VisitSchema.index({ studentId: 1, checkInTime: -1 });

export default mongoose.models.Visit || mongoose.model<IVisit>('Visit', VisitSchema);
