
import mongoose, { Schema, Document, Types } from 'mongoose';

export type DormitoryType = 'Boys' | 'Girls' | 'Mixed';

export interface IDormitory extends Document {
  name: string; // e.g., "Kilimanjaro Hostel", "Mandela Block"
  type: DormitoryType;
  capacity?: number; // Total capacity of the dormitory
  wardenId?: Types.ObjectId; // Ref to User (Teacher/Staff)
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DormitorySchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: ['Boys', 'Girls', 'Mixed'], required: true },
    capacity: { type: Number, min: 0 },
    wardenId: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

DormitorySchema.index({ name: 1 });

export default mongoose.models.Dormitory || mongoose.model<IDormitory>('Dormitory', DormitorySchema);
