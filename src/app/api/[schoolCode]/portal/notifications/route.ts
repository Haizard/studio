
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

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status'); // e.g., 'unread'

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Notification = tenantDb.models.Notification as mongoose.Model<INotification>;

    const query: any = { userId: token.uid };
    if (status === 'unread') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50) // Limit to avoid overwhelming the user
      .lean();

    return NextResponse.json(notifications);
  } catch (error: any) {
    console.error(`Error fetching notifications for user ${token.uid}, school ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch notifications', details: error.message }, { status: 500 });
  }
}
