
import mongoose, { Schema, Document } from 'mongoose';
import { TimetablePeriodSchema, ITimetabledPeriod } from './TimetablePeriod'; // Import the sub-schema

export interface ITimetable extends Document {
  name: string; // e.g., "Form 1A - Term 1 2024 Timetable"
  academicYearId: mongoose.Schema.Types.ObjectId; // Ref to AcademicYear
  classId: mongoose.Schema.Types.ObjectId; // Ref to Class
  termId?: mongoose.Schema.Types.ObjectId; // Optional: Ref to Term if timetables are term-specific
  periods: ITimetabledPeriod[];
  isActive: boolean; // To mark if this is the currently active timetable for the class/year/term
  version: number; // For tracking revisions
  description?: string; // Optional notes about the timetable
  createdAt: Date;
  updatedAt: Date;
}

const TimetableSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    termId: { type: mongoose.Schema.Types.ObjectId, ref: 'Term' }, // Optional
    periods: [TimetablePeriodSchema],
    isActive: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

// Index to quickly find active timetable for a class, year, and optionally term
TimetableSchema.index({ classId: 1, academicYearId: 1, termId: 1, isActive: 1 });
// Index for ensuring unique timetable names per class, year, and term combination
TimetableSchema.index({ name: 1, classId: 1, academicYearId: 1, termId: 1 }, { 
  unique: true, 
  partialFilterExpression: { termId: { $exists: true } } 
});
TimetableSchema.index({ name: 1, classId: 1, academicYearId: 1, termId: null }, { 
  unique: true, 
  partialFilterExpression: { termId: { $exists: false } } 
});


export default mongoose.models.Timetable || mongoose.model<ITimetable>('Timetable', TimetableSchema);
