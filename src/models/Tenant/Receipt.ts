
import mongoose, { Schema, Document, Types } from 'mongoose';
import { PaymentMethod } from './FeePayment';

interface IReceiptPaymentDetails {
    amountPaid: number;
    paymentDate: Date;
    paymentMethod: PaymentMethod;
    transactionReference?: string;
}

export interface IReceipt extends Document {
  receiptNumber: string;
  paymentId: Types.ObjectId; // Ref to FeePayment
  invoiceId?: Types.ObjectId; // Optional ref to Invoice
  studentId: Types.ObjectId; // Ref to User (Student)
  receiptDate: Date;
  paymentDetails: IReceiptPaymentDetails;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReceiptSchema: Schema = new Schema(
  {
    receiptNumber: { type: String, required: true, unique: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'FeePayment', required: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiptDate: { type: Date, default: Date.now, required: true },
    paymentDetails: {
        amountPaid: { type: Number, required: true },
        paymentDate: { type: Date, required: true },
        paymentMethod: { type: String, required: true },
        transactionReference: { type: String }
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

ReceiptSchema.index({ studentId: 1, receiptDate: -1 });
ReceiptSchema.index({ paymentId: 1 });
ReceiptSchema.index({ invoiceId: 1 });

export default mongoose.models.Receipt || mongoose.model<IReceipt>('Receipt', ReceiptSchema);
