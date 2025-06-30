
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import RoomModel, { IRoom } from '@/models/Tenant/Room';
import DormitoryModel, { IDormitory } from '@/models/Tenant/Dormitory';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Room) tenantDb.model<IRoom>('Room', RoomModel.schema);
  if (!tenantDb.models.Dormitory) tenantDb.model<IDormitory>('Dormitory', DormitoryModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin', 'dormitory_master'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }
  
  const { searchParams } = new URL(request.url);
  const dormitoryId = searchParams.get('dormitoryId');

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Room = tenantDb.models.Room as mongoose.Model<IRoom>;

    const query: any = {};
    if (dormitoryId && mongoose.Types.ObjectId.isValid(dormitoryId)) {
        query.dormitoryId = dormitoryId;
    }
    
    const rooms = await Room.find(query)
      .populate<{ dormitoryId: IDormitory }>('dormitoryId', 'name type')
      .populate<{ occupants: ITenantUser[] }>('occupants', 'firstName lastName username')
      .sort({ roomNumber: 1 })
      .lean();

    return NextResponse.json(rooms);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch rooms', details: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { roomNumber, dormitoryId, capacity, notes } = body;

    if (!roomNumber || !dormitoryId || !capacity) {
      return NextResponse.json({ error: 'Missing required fields: roomNumber, dormitoryId, capacity' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(dormitoryId)) {
      return NextResponse.json({ error: 'Invalid Dormitory ID format' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Room = tenantDb.models.Room as mongoose.Model<IRoom>;

    const existingRoom = await Room.findOne({ roomNumber, dormitoryId });
    if (existingRoom) {
        return NextResponse.json({ error: 'A room with this number already exists in this dormitory.'}, { status: 409 });
    }

    const newRoom = new Room({
      roomNumber,
      dormitoryId,
      capacity,
      notes,
      occupants: [], // Starts empty
    });

    await newRoom.save();
    const populatedRoom = await Room.findById(newRoom._id)
      .populate<{ dormitoryId: IDormitory }>('dormitoryId', 'name type')
      .lean();
    return NextResponse.json(populatedRoom, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
        return NextResponse.json({ error: 'A room with this number already exists in this dormitory.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create room', details: error.message }, { status: 500 });
  }
}
