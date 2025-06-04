
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBookTransaction extends Document {
  bookId: Types.ObjectId; // Ref to Book
  memberId: Types.ObjectId; // Ref to User (Student or Teacher)
  borrowDate: Date;
  dueDate: Date;
  returnDate?: Date; // Set when the book is returned
  isReturned: boolean; // True if the book has been returned
  notes?: string; // Optional notes by the librarian
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
  },
  { timestamps: true }
);

BookTransactionSchema.index({ bookId: 1, memberId: 1, isReturned: 1 }); // To find active borrowings for a user/book
BookTransactionSchema.index({ memberId: 1, isReturned: 1 });
BookTransactionSchema.index({ dueDate: 1, isReturned: 1 }); // For finding overdue books

export default mongoose.models.BookTransaction || mongoose.model<IBookTransaction>('BookTransaction', BookTransactionSchema);
