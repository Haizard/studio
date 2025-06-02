
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import EventModel, { IEvent } from '@/models/Tenant/Event';
import TenantUserModel, { ITenantUser } from '@/models/Tenant/User';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Event) {
    tenantDb.model<IEvent>('Event', EventModel.schema);
  }
  if (!tenantDb.models.User) {
    tenantDb.model<ITenantUser>('User', TenantUserModel.schema);
  }
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string; eventId: string } }
) {
  const { schoolCode, eventId } = params;
  const { searchParams } = new URL(request.url);
  const adminView = searchParams.get('adminView') === 'true';

  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return NextResponse.json({ error: 'Invalid Event ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Event = tenantDb.models.Event as mongoose.Model<IEvent>;

    const query: any = { _id: eventId };
    if (!adminView) {
      query.isActive = true;
    }

    const event = await Event.findOne(query)
      .populate<{ authorId: ITenantUser }>('authorId', 'firstName lastName username')
      .lean();
      
    if (!event) {
      return NextResponse.json({ error: 'Event not found or not active' }, { status: 404 });
    }
    return NextResponse.json(event);
  } catch (error: any) {
    console.error(`Error fetching event ${eventId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch event', details: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string; eventId: string } }
) {
  const { schoolCode, eventId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
     if (!(token?.role === 'superadmin' && schoolCode)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return NextResponse.json({ error: 'Invalid Event ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { title, description, startDate, endDate, location, category, audience, featuredImageUrl, isActive } = body;

    if (!title || !startDate) {
      return NextResponse.json({ error: 'Missing required fields: title, startDate' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Event = tenantDb.models.Event as mongoose.Model<IEvent>;

    const eventToUpdate = await Event.findById(eventId);
    if (!eventToUpdate) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    eventToUpdate.title = title;
    eventToUpdate.description = description;
    eventToUpdate.startDate = new Date(startDate);
    eventToUpdate.endDate = endDate ? new Date(endDate) : undefined;
    eventToUpdate.location = location;
    eventToUpdate.category = category;
    eventToUpdate.audience = Array.isArray(audience) ? audience : (audience ? [audience] : []);
    eventToUpdate.featuredImageUrl = featuredImageUrl;
    eventToUpdate.isActive = isActive !== undefined ? isActive : eventToUpdate.isActive;
    eventToUpdate.authorId = token.uid; // Update author to current editor

    await eventToUpdate.save();
    const populatedEvent = await Event.findById(eventToUpdate._id)
        .populate<{ authorId: ITenantUser }>('authorId', 'firstName lastName username')
        .lean();
    return NextResponse.json(populatedEvent);
  } catch (error: any) {
    console.error(`Error updating event ${eventId} for ${schoolCode}:`, error);
     if (error instanceof mongoose.Error.ValidationError) {
        return NextResponse.json({ error: 'Validation Error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update event', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { schoolCode: string; eventId: string } }
) {
  const { schoolCode, eventId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }
  
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return NextResponse.json({ error: 'Invalid Event ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Event = tenantDb.models.Event as mongoose.Model<IEvent>;

    const result = await Event.deleteOne({ _id: eventId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error: any)
{
    console.error(`Error deleting event ${eventId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to delete event', details: error.message }, { status: 500 });
  }
}
