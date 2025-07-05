
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import NotificationModel, { INotification } from '@/models/Tenant/Notification';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Notification) {
    tenantDb.model<INotification>('Notification', NotificationModel.schema);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string; notificationId: string } }
) {
  const { schoolCode, notificationId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    return NextResponse.json({ error: 'Invalid Notification ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Notification = tenantDb.models.Notification as mongoose.Model<INotification>;
    
    // Ensure the user can only mark their own notification as read
    const result = await Notification.updateOne(
        { _id: notificationId, userId: token.uid },
        { $set: { isRead: true } }
    );

    if (result.matchedCount === 0) {
        return NextResponse.json({ error: 'Notification not found or user not authorized' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Notification marked as read' });

  } catch (error: any) {
    console.error(`Error marking notification as read for user ${token.uid}, school ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to mark notification as read', details: error.message }, { status: 500 });
  }
}
