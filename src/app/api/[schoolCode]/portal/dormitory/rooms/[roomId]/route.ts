
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
  { params }: { params: { schoolCode: string; roomId: string } }
) {
  const { schoolCode, roomId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin', 'dormitory_master'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(roomId)) {
    return NextResponse.json({ error: 'Invalid Room ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Room = tenantDb.models.Room as mongoose.Model<IRoom>;

    const room = await Room.findById(roomId)
      .populate<{ dormitoryId: IDormitory }>('dormitoryId', 'name type')
      .populate<{ occupants: ITenantUser[] }>('occupants', 'firstName lastName username')
      .lean();

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    return NextResponse.json(room);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch room', details: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string; roomId: string } }
) {
  const { schoolCode, roomId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin', 'dormitory_master'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(roomId)) {
    return NextResponse.json({ error: 'Invalid Room ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { roomNumber, capacity, notes, occupants } = body;

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Room = tenantDb.models.Room as mongoose.Model<IRoom>;

    const roomToUpdate = await Room.findById(roomId);
    if (!roomToUpdate) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (roomNumber && roomNumber !== roomToUpdate.roomNumber) {
      const existing = await Room.findOne({ roomNumber, dormitoryId: roomToUpdate.dormitoryId, _id: { $ne: roomId } });
      if (existing) {
        return NextResponse.json({ error: 'A room with this number already exists in this dormitory.' }, { status: 409 });
      }
      roomToUpdate.roomNumber = roomNumber;
    }

    if (capacity !== undefined) roomToUpdate.capacity = capacity;
    if (notes !== undefined) roomToUpdate.notes = notes;
    if (occupants !== undefined && Array.isArray(occupants)) {
        // Here you would add more validation, e.g., check if student is already in another room
        roomToUpdate.occupants = occupants.map(id => new mongoose.Types.ObjectId(id));
    }
    
    await roomToUpdate.save(); // pre-save hook will validate occupants vs capacity
    const populatedRoom = await Room.findById(roomToUpdate._id)
      .populate<{ dormitoryId: IDormitory }>('dormitoryId', 'name type')
      .populate<{ occupants: ITenantUser[] }>('occupants', 'firstName lastName username')
      .lean();
    return NextResponse.json(populatedRoom);
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'A room with this number already exists in this dormitory.' }, { status: 409 });
    }
    if (error.message === 'Number of occupants cannot exceed room capacity.') {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update room', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { schoolCode: string; roomId: string } }
) {
  const { schoolCode, roomId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(roomId)) {
    return NextResponse.json({ error: 'Invalid Room ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Room = tenantDb.models.Room as mongoose.Model<IRoom>;

    const roomToDelete = await Room.findById(roomId);
    if (!roomToDelete) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    if (roomToDelete.occupants && roomToDelete.occupants.length > 0) {
      return NextResponse.json({ error: 'Cannot delete room with occupants. Please reassign students first.' }, { status: 400 });
    }

    const result = await Room.deleteOne({ _id: roomId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Room not found during deletion attempt' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Room deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete room', details: error.message }, { status: 500 });
  }
}
