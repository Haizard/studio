
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGradeDefinition {
  _id?: Types.ObjectId; // Optional: Mongoose adds it by default
  grade: string; // e.g., "A+", "A", "B"
  minScore: number;
  maxScore: number;
  remarks?: string; // e.g., "Excellent", "Very Good"
  gpa?: number; // Optional: Grade Point Average
}

const GradeDefinitionSchema: Schema = new Schema({
  grade: { type: String, required: true, trim: true },
  minScore: { type: Number, required: true, min: 0, max: 1000 }, // Max can be adjusted
  maxScore: { type: Number, required: true, min: 0, max: 1000 }, // Max can be adjusted
  remarks: { type: String, trim: true },
  gpa: { type: Number },
}, { _id: true }); // Explicitly include _id for subdocuments if needed for direct manipulation

export interface IGradingScale extends Document {
  name: string; // e.g., "Standard O-Level Scale", "A-Level Points System"
  academicYearId?: mongoose.Schema.Types.ObjectId; // Optional: Link to a specific academic year
  level?: string; // Optional: e.g., "O-Level", "A-Level", "Primary"
  description?: string;
  grades: IGradeDefinition[];
  isDefault: boolean; // Is this the default scale for the school?
  createdAt: Date;
  updatedAt: Date;
}

const GradingScaleSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
    level: { type: String, trim: true },
    description: { type: String, trim: true },
    grades: [GradeDefinitionSchema],
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

GradingScaleSchema.index({ name: 1 });
GradingScaleSchema.index({ isDefault: 1 });
GradingScaleSchema.index({ academicYearId: 1, level: 1 });


// Validate that minScore <= maxScore for each grade definition
GradingScaleSchema.path('grades').validate(function (grades: IGradeDefinition[]) {
  if (!grades) return true;
  for (const grade of grades) {
    if (grade.minScore > grade.maxScore) {
      return false;
    }
  }
  return true;
}, 'Minimum score cannot be greater than maximum score for a grade.');

// Validate that score ranges do not overlap within the same scale (more complex, consider application-level logic or pre-save hook)
// This basic validation won't catch all overlaps perfectly without more complex logic.

export default mongoose.models.GradingScale || mongoose.model<IGradingScale>('GradingScale', GradingScaleSchema);
