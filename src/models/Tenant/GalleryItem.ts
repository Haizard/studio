
import mongoose, { Schema, Document } from 'mongoose';

export interface IGalleryItem extends Document {
  title?: string;
  description?: string;
  imageUrl: string;
  album?: string; // e.g., "Sports Day 2023", "Graduation Ceremony"
  tags?: string[];
  uploadDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GalleryItemSchema: Schema = new Schema(
  {
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    imageUrl: { type: String, required: true, trim: true },
    album: { type: String, trim: true },
    tags: [{ type: String, trim: true, lowercase: true }],
    uploadDate: { type: Date, default: Date.now, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

GalleryItemSchema.index({ album: 1, uploadDate: -1 });
GalleryItemSchema.index({ tags: 1 });

export default mongoose.models.GalleryItem || mongoose.model<IGalleryItem>('GalleryItem', GalleryItemSchema);
