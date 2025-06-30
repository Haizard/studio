
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IExpense extends Document {
  category: string;
  description: string;
  amount: number;
  currency: string;
  expenseDate: Date;
  receiptUrl?: string;
  recordedById: Types.ObjectId; // User who recorded the expense
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema: Schema = new Schema(
  {
    category: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'TZS' },
    expenseDate: { type: Date, required: true, default: Date.now },
    receiptUrl: { type: String, trim: true },
    recordedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ExpenseSchema.index({ expenseDate: -1 });

export default mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);
