
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDispensation extends Document {
  visitId: Types.ObjectId; // Link to the specific student visit
  medicationId: Types.ObjectId; // Ref to Medication
  quantityDispensed: number;
  dispensationDate: Date;
  dispensedById: Types.ObjectId; // User who dispensed it
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DispensationSchema: Schema = new Schema(
  {
    visitId: { type: Schema.Types.ObjectId, ref: 'Visit', required: true },
    medicationId: { type: Schema.Types.ObjectId, ref: 'Medication', required: true },
    quantityDispensed: { type: Number, required: true, min: 1 },
    dispensationDate: { type: Date, required: true, default: Date.now },
    dispensedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

DispensationSchema.index({ visitId: 1 });
DispensationSchema.index({ medicationId: 1 });

export default mongoose.models.Dispensation || mongoose.model<IDispensation>('Dispensation', DispensationSchema);
