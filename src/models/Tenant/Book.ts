
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBook extends Document {
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  publicationYear?: number;
  genre?: string[]; // Array of strings for multiple genres/tags
  description?: string;
  language: string;
  numberOfPages?: number;
  coverImageUrl?: string; // URL to the book cover
  totalCopies: number;
  availableCopies: number; // This will be updated by borrowing/returns logic later
  locationInLibrary?: string; // e.g., "Shelf A1", "Fiction Section"
  addedById: Types.ObjectId; // User who added the book
  createdAt: Date;
  updatedAt: Date;
}

const BookSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    isbn: { type: String, trim: true, unique: true, sparse: true }, // Unique if provided, allows multiple nulls/undefined
    publisher: { type: String, trim: true },
    publicationYear: { type: Number },
    genre: [{ type: String, trim: true, lowercase: true }],
    description: { type: String, trim: true },
    language: { type: String, trim: true, default: 'English' },
    numberOfPages: { type: Number, min: 0 },
    coverImageUrl: { type: String, trim: true },
    totalCopies: { type: Number, required: true, min: 0, default: 1 },
    availableCopies: { type: Number, required: true, min: 0, default: 1 },
    locationInLibrary: { type: String, trim: true },
    addedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

BookSchema.index({ title: 'text', author: 'text', isbn: 'text', genre: 'text' }); // For text search
BookSchema.index({ author: 1 });
BookSchema.index({ genre: 1 });

// Validate availableCopies <= totalCopies before saving
BookSchema.pre<IBook>('save', function (next) {
  if (this.availableCopies > this.totalCopies) {
    this.availableCopies = this.totalCopies;
  }
  next();
});

export default mongoose.models.Book || mongoose.model<IBook>('Book', BookSchema);
