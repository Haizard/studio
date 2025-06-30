
import mongoose, { Schema, Document } from 'mongoose';

export interface IMedication extends Document {
  name: string; // e.g., "Paracetamol 500mg"
  brand?: string;
  stock: number;
  unit: 'tablets' | 'ml' | 'bottles' | 'tubes' | 'strips';
  lowStockThreshold?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MedicationSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    brand: { type: String, trim: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    unit: {
      type: String,
      enum: ['tablets', 'ml', 'bottles', 'tubes', 'strips'],
      required: true,
    },
    lowStockThreshold: { type: Number, min: 0, default: 10 },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

MedicationSchema.index({ name: 1 });

export default mongoose.models.Medication || mongoose.model<IMedication>('Medication', MedicationSchema);
