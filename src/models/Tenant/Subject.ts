
import mongoose, { Schema, Document } from 'mongoose';

export interface ISubject extends Document {
  name: string; // e.g., "Mathematics", "History"
  code?: string; // e.g., "MATH101", "HIST"
  department?: string; // e.g., "Sciences", "Humanities"
  isElective: boolean;
  forLevel?: string[]; // e.g., ["Form 1", "Form 2"] or ["O-Level", "A-Level"]
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true }, // Assuming subject names are unique per school
    code: { type: String, trim: true, unique: true, sparse:true },
    department: { type: String, trim: true },
    isElective: { type: Boolean, default: false },
    forLevel: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

SubjectSchema.index({ name: 1 });
SubjectSchema.index({ code: 1 });

export default mongoose.models.Subject || mongoose.model<ISubject>('Subject', SubjectSchema);
