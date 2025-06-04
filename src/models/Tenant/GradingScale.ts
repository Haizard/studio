
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGradeDefinition {
  _id?: Types.ObjectId;
  grade: string; 
  minScore: number;
  maxScore: number;
  remarks?: string; 
  gpa?: number; 
  points?: number; // Points for this grade (e.g., O-Level division points, A-Level subject points)
  passStatus?: 'Pass' | 'Fail' | 'SubsidiaryPass'; // For explicit pass/fail status
}

const GradeDefinitionSchema: Schema = new Schema({
  grade: { type: String, required: true, trim: true },
  minScore: { type: Number, required: true, min: 0, max: 1000 },
  maxScore: { type: Number, required: true, min: 0, max: 1000 },
  remarks: { type: String, trim: true },
  gpa: { type: Number },
  points: { type: Number },
  passStatus: { type: String, enum: ['Pass', 'Fail', 'SubsidiaryPass'] },
}, { _id: true });

export interface IDivisionConfig {
  _id?: Types.ObjectId;
  division: string; // e.g., "I", "II", "0"
  minPoints: number;
  maxPoints: number;
  description?: string; // e.g., "Excellent", "Fail"
}

const DivisionConfigSchema: Schema = new Schema({
    division: { type: String, required: true, trim: true },
    minPoints: { type: Number, required: true },
    maxPoints: { type: Number, required: true },
    description: { type: String, trim: true },
}, { _id: true });


export type ScaleType = 'General GPA' | 'O-Level Division Points' | 'A-Level Subject Points' | 'Primary School Aggregate' | 'Standard Percentage';

export interface IGradingScale extends Document {
  name: string; 
  academicYearId?: mongoose.Schema.Types.ObjectId; 
  level?: string; 
  scaleType?: ScaleType;
  description?: string;
  grades: IGradeDefinition[];
  divisionConfigs?: IDivisionConfig[]; // Specific to O-Level type scales
  isDefault: boolean; 
  createdAt: Date;
  updatedAt: Date;
}

const GradingScaleSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
    level: { type: String, trim: true },
    scaleType: { 
      type: String, 
      enum: ['General GPA', 'O-Level Division Points', 'A-Level Subject Points', 'Primary School Aggregate', 'Standard Percentage'],
      default: 'Standard Percentage',
    },
    description: { type: String, trim: true },
    grades: [GradeDefinitionSchema],
    divisionConfigs: [DivisionConfigSchema],
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

GradingScaleSchema.index({ name: 1 });
GradingScaleSchema.index({ isDefault: 1 });
GradingScaleSchema.index({ academicYearId: 1, level: 1, scaleType: 1 });

GradingScaleSchema.path('grades').validate(function (grades: IGradeDefinition[]) {
  if (!grades) return true;
  for (const grade of grades) {
    if (grade.minScore > grade.maxScore) {
      return false;
    }
  }
  return true;
}, 'Minimum score cannot be greater than maximum score for a grade.');

GradingScaleSchema.path('divisionConfigs').validate(function (configs: IDivisionConfig[]) {
  if (!configs || this.scaleType !== 'O-Level Division Points') return true; // Only validate if relevant scale type
  for (const config of configs) {
    if (config.minPoints > config.maxPoints) {
      return false;
    }
  }
  return true;
}, 'Minimum points cannot be greater than maximum points for a division configuration.');


export default mongoose.models.GradingScale || mongoose.model<IGradingScale>('GradingScale', GradingScaleSchema);

