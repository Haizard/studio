
import mongoose, { Schema, Document } from 'mongoose';

// Using ITimetabledPeriod to avoid confusion with a potential top-level Period Model if one existed in future
export interface ITimetabledPeriod extends Document {
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  subjectId: mongoose.Schema.Types.ObjectId; // Ref to Subject
  teacherId: mongoose.Schema.Types.ObjectId; // Ref to User (Teacher)
  location?: string;
  // _id is not strictly necessary for subdocuments but Mongoose adds it by default.
  // We can explicitly set _id: false if we don't want it.
}

export const TimetablePeriodSchema: Schema = new Schema(
  {
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true,
    },
    startTime: { 
      type: String, 
      required: true, 
      // Basic regex for HH:mm format. Consider more robust validation or a time library if needed.
      match: /^([01]\d|2[0-3]):([0-5]\d)$/, 
      trim: true,
    },
    endTime: { 
      type: String, 
      required: true, 
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
      trim: true,
    },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    // Assuming teachers are Users with role 'teacher'
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
    location: { type: String, trim: true },
  },
  { _id: true } // Explicitly include _id for periods for potential individual manipulation if needed later. Can be set to false.
);

// Note: This schema is intended to be embedded and does not need to be registered as a standalone model.
// No `mongoose.model('TimetablePeriod', TimetablePeriodSchema)` here.
