
import mongoose, { Schema, Document, Types } from 'mongoose';

export type FineStatus = 'Pending' | 'Paid' | 'Waived';

export interface IBookTransaction extends Document {
  bookId: Types.ObjectId; // Ref to Book
  memberId: Types.ObjectId; // Ref to User (Student or Teacher)
  borrowDate: Date;
  dueDate: Date;
  returnDate?: Date; // Set when the book is returned
  isReturned: boolean; // True if the book has been returned
  notes?: string; // Optional notes by the librarian
  fineAmount?: number;
  fineStatus?: FineStatus;
  finePaidDate?: Date;
  fineNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookTransactionSchema: Schema = new Schema(
  {
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    borrowDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, required: true },
    returnDate: { type: Date },
    isReturned: { type: Boolean, default: false },
    notes: { type: String, trim: true },
    fineAmount: { type: Number, min: 0 },
    fineStatus: { type: String, enum: ['Pending', 'Paid', 'Waived'] },
    finePaidDate: { type: Date },
    fineNotes: { type: String, trim: true },
  },
  { timestamps: true }
);

BookTransactionSchema.index({ bookId: 1, memberId: 1, isReturned: 1 }); // To find active borrowings for a user/book
BookTransactionSchema.index({ memberId: 1, isReturned: 1 });
BookTransactionSchema.index({ dueDate: 1, isReturned: 1 }); // For finding overdue books
BookTransactionSchema.index({ fineStatus: 1 }); // For finding transactions with fines

export default mongoose.models.BookTransaction || mongoose.model<IBookTransaction>('BookTransaction', BookTransactionSchema);
