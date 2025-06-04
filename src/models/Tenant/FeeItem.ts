
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFeeItem extends Document {
  name: string;
  description?: string;
  amount: number;
  currency: string;
  academicYearId: Types.ObjectId; // Ref to AcademicYear
  termId?: Types.ObjectId; // Ref to Term (optional)
  appliesToLevels?: string[]; // e.g., "Form 1", "O-Level", "All"
  appliesToClasses?: Types.ObjectId[]; // Ref to Class (optional, for specific classes)
  category?: string; // e.g., "Tuition", "Activity Fee", "Development Fund"
  isMandatory: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FeeItemSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'TZS', trim: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    termId: { type: Schema.Types.ObjectId, ref: 'Term' },
    appliesToLevels: [{ type: String, trim: true }], // Can store general level identifiers
    appliesToClasses: [{ type: Schema.Types.ObjectId, ref: 'Class' }], // For specific class streams
    category: { type: String, trim: true },
    isMandatory: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Index for common queries
FeeItemSchema.index({ academicYearId: 1, termId: 1, category: 1 });
FeeItemSchema.index({ name: 1, academicYearId: 1 }, { unique: true }); // Name should be unique within an academic year

export default mongoose.models.FeeItem || mongoose.model<IFeeItem>('FeeItem', FeeItemSchema);
