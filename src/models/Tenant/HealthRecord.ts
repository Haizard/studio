
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IHealthRecord extends Document {
  studentId: Types.ObjectId; // Ref to Student's User ID
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  allergies?: string[];
  medicalConditions?: string[]; // Chronic conditions
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HealthRecordSchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    bloodType: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    allergies: [{ type: String, trim: true }],
    medicalConditions: [{ type: String, trim: true }],
    emergencyContact: {
      name: { type: String, required: true, trim: true },
      relationship: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.HealthRecord || mongoose.model<IHealthRecord>('HealthRecord', HealthRecordSchema);
