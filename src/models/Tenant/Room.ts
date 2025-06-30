
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRoom extends Document {
  roomNumber: string; // e.g., "A101", "G-05"
  dormitoryId: Types.ObjectId; // Ref to Dormitory
  capacity: number;
  occupants: Types.ObjectId[]; // Array of refs to User (Student)
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema: Schema = new Schema(
  {
    roomNumber: { type: String, required: true, trim: true },
    dormitoryId: { type: Schema.Types.ObjectId, ref: 'Dormitory', required: true },
    capacity: { type: Number, required: true, min: 1 },
    occupants: [{ type: Schema.Types.ObjectId, ref: 'User' }], // References students' user accounts
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// A room number should be unique within a dormitory
RoomSchema.index({ roomNumber: 1, dormitoryId: 1 }, { unique: true });

export default mongoose.models.Room || mongoose.model<IRoom>('Room', RoomSchema);
