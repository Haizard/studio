
import mongoose, { Schema, Document } from 'mongoose';

// This model is very similar to NewsArticle but represents a separate content type.
export interface IBlogArticle extends Document {
  title: string;
  slug: string; 
  content: string; 
  summary?: string; 
  authorId?: mongoose.Schema.Types.ObjectId; 
  publishedDate: Date;
  featuredImageUrl?: string;
  tags?: string[];
  category?: string;
  isActive: boolean; 
  viewCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const BlogArticleSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    content: { type: String, required: true },
    summary: { type: String, trim: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    publishedDate: { type: Date, default: Date.now, required: true },
    featuredImageUrl: { type: String, trim: true },
    tags: [{ type: String, trim: true, lowercase: true }],
    category: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

BlogArticleSchema.index({ slug: 1 });
BlogArticleSchema.index({ publishedDate: -1, isActive: 1 });
BlogArticleSchema.index({ tags: 1 });
BlogArticleSchema.index({ category: 1 });

export default mongoose.models.BlogArticle || mongoose.model<IBlogArticle>('BlogArticle', BlogArticleSchema);
