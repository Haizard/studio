
import mongoose, { Schema, Document, Types } from 'mongoose';

export type InvoiceStatus = 'Draft' | 'Unpaid' | 'Paid' | 'Partial' | 'Overdue' | 'Cancelled';

interface IInvoiceItem {
  feeItemId: Types.ObjectId; // Ref to FeeItem
  description: string;
  amount: number;
}

const InvoiceItemSchema: Schema = new Schema({
    feeItemId: { type: Schema.Types.ObjectId, ref: 'FeeItem', required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
}, { _id: false });


export interface IInvoice extends Document {
  invoiceNumber: string;
  studentId: Types.ObjectId; // Ref to User (Student)
  academicYearId: Types.ObjectId; // Ref to AcademicYear
  termId?: Types.ObjectId; // Ref to Term
  classId: Types.ObjectId; // Ref to Class at time of invoice creation
  items: IInvoiceItem[];
  totalAmount: number;
  amountPaid: number;
  outstandingBalance: number;
  issueDate: Date;
  dueDate: Date;
  status: InvoiceStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema: Schema = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    termId: { type: Schema.Types.ObjectId, ref: 'Term' },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    items: [InvoiceItemSchema],
    totalAmount: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, required: true, default: 0, min: 0 },
    outstandingBalance: { type: Number, required: true },
    issueDate: { type: Date, default: Date.now, required: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['Draft', 'Unpaid', 'Paid', 'Partial', 'Overdue', 'Cancelled'],
      default: 'Unpaid',
      required: true,
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

InvoiceSchema.pre<IInvoice>('save', function (next) {
    if (this.isModified('totalAmount') || this.isModified('amountPaid')) {
        this.outstandingBalance = this.totalAmount - this.amountPaid;
        if (this.outstandingBalance <= 0) {
            this.status = 'Paid';
        } else if (this.amountPaid > 0 && this.outstandingBalance > 0) {
            this.status = 'Partial';
        } else {
            this.status = 'Unpaid';
        }
    }
    next();
});

InvoiceSchema.index({ studentId: 1, academicYearId: 1, termId: 1 });
InvoiceSchema.index({ status: 1, dueDate: 1 });


export default mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);
