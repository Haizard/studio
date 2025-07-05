
import mongoose, { Schema, Document, Types } from 'mongoose';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'announcement';

export interface INotification extends Document {
  userId: Types.ObjectId; // The user who receives the notification
  title: string;
  message: string;
  isRead: boolean;
  link?: string; // Optional link to navigate to on click
  type: NotificationType;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    isRead: { type: Boolean, default: false, index: true },
    link: { type: String, trim: true },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'error', 'announcement'],
      default: 'info',
    },
  },
  { timestamps: true }
);

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
