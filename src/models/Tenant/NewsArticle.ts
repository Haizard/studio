
import mongoose, { Schema, Document } from 'mongoose';

export interface INewsArticle extends Document {
  title: string;
  slug: string; // URL-friendly version of the title
  content: string; // HTML or Markdown content
  summary?: string; // Short summary for listings
  authorId?: mongoose.Schema.Types.ObjectId; // Ref to TenantUser (admin/staff who posted)
  publishedDate: Date;
  featuredImageUrl?: string;
  tags?: string[];
  category?: string;
  isActive: boolean; // To control visibility on the website
  viewCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const NewsArticleSchema: Schema = new Schema(
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

NewsArticleSchema.index({ slug: 1 });
NewsArticleSchema.index({ publishedDate: -1, isActive: 1 }); // For fetching latest active news
NewsArticleSchema.index({ tags: 1 });
NewsArticleSchema.index({ category: 1 });

export default mongoose.models.NewsArticle || mongoose.model<INewsArticle>('NewsArticle', NewsArticleSchema);
