
import mongoose, { Schema, Document, Types } from 'mongoose';
import type { IRoom as IRoomInterface } from './Room'; // For pre-save hook typing

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

// Add a pre-save hook to validate occupant count against capacity
RoomSchema.pre<IRoom>('save', function (next) {
  if (this.occupants && this.isModified('occupants')) {
    if (this.occupants.length > this.capacity) {
      const err = new Error('Number of occupants cannot exceed room capacity.');
      return next(err);
    }
  }
  next();
});

export default mongoose.models.Room || mongoose.model<IRoom>('Room', RoomSchema);
