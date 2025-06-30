
import mongoose, { Schema, Document, Types } from 'mongoose';

export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'Mobile Money' | 'Cheque' | 'Online Payment' | 'Other';

export interface IFeePayment extends Document {
  studentId: Types.ObjectId; // Ref to User (Student)
  feeItemId: Types.ObjectId; // Ref to FeeItem. Can be a general payment not tied to one item but linked for reporting.
  invoiceId?: Types.ObjectId; // Optional: Ref to the invoice this payment is for.
  academicYearId: Types.ObjectId; // Ref to AcademicYear (context of the fee item)
  termId?: Types.ObjectId; // Ref to Term (optional, context of the fee item)
  
  amountPaid: number;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  transactionReference?: string; // For bank slip no, mobile money txn id, etc.
  notes?: string;
  
  recordedById: Types.ObjectId; // User who recorded the payment (admin/finance staff)
  createdAt: Date;
  updatedAt: Date;
}

const FeePaymentSchema: Schema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    feeItemId: { type: Schema.Types.ObjectId, ref: 'FeeItem', required: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' }, // Added invoice reference
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    termId: { type: Schema.Types.ObjectId, ref: 'Term' },
    
    amountPaid: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, required: true, default: Date.now },
    paymentMethod: { 
      type: String, 
      enum: ['Cash', 'Bank Transfer', 'Mobile Money', 'Cheque', 'Online Payment', 'Other'], 
      required: true 
    },
    transactionReference: { type: String, trim: true },
    notes: { type: String, trim: true },
    
    recordedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

FeePaymentSchema.index({ studentId: 1, academicYearId: 1, termId: 1 });
FeePaymentSchema.index({ feeItemId: 1, paymentDate: -1 });
FeePaymentSchema.index({ paymentDate: -1 });
FeePaymentSchema.index({ invoiceId: 1 }); // Added index for invoiceId

export default mongoose.models.FeePayment || mongoose.model<IFeePayment>('FeePayment', FeePaymentSchema);
