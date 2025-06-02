
import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  category?: string; // e.g., "Academic", "Sports", "Cultural", "Holiday"
  audience?: string[]; // e.g., "Students", "Teachers", "Parents", "Form 1"
  featuredImageUrl?: string;
  isActive: boolean; // To control visibility on the website/calendar
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    location: { type: String, trim: true },
    category: { type: String, trim: true },
    audience: [{ type: String, trim: true }],
    featuredImageUrl: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

EventSchema.index({ startDate: 1, isActive: 1 });
EventSchema.index({ category: 1, isActive: 1 });

export default mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);
