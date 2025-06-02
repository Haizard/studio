
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
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const { searchParams } = new URL(request.url);
  const adminView = searchParams.get('adminView') === 'true';

  if (!schoolCode) {
    return NextResponse.json({ error: 'School code is required' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Event = tenantDb.models.Event as mongoose.Model<IEvent>;
    
    const query: any = {};
    if (!adminView) {
      query.isActive = true;
    }

    const events = await Event.find(query)
      .populate<{ authorId: ITenantUser }>('authorId', 'firstName lastName username')
      .sort({ startDate: adminView ? -1 : 1 }) // Admin newest first, public upcoming first
      .lean(); 

    return NextResponse.json(events);
  } catch (error: any) {
    console.error(`Error fetching events for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch events', details: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
     if (!(token?.role === 'superadmin' && schoolCode)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }
  
  if (!schoolCode) {
    return NextResponse.json({ error: 'School code is required' }, { status: 400 });
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

    const newEvent = new Event({
      title,
      description,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      location,
      category,
      audience: Array.isArray(audience) ? audience : (audience ? [audience] : []),
      featuredImageUrl,
      isActive: isActive !== undefined ? isActive : true,
      authorId: token.uid,
    });

    await newEvent.save();
    const populatedEvent = await Event.findById(newEvent._id)
      .populate<{ authorId: ITenantUser }>('authorId', 'firstName lastName username')
      .lean();
    return NextResponse.json(populatedEvent, { status: 201 });

  } catch (error: any) {
    console.error(`Error creating event for ${schoolCode}:`, error);
    if (error instanceof mongoose.Error.ValidationError) {
        return NextResponse.json({ error: 'Validation Error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create event', details: error.message }, { status: 500 });
  }
}
