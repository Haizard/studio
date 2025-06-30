
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import DormitoryModel, { IDormitory } from '@/models/Tenant/Dormitory';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import RoomModel, { IRoom } from '@/models/Tenant/Room'; // For delete check
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Dormitory) tenantDb.model<IDormitory>('Dormitory', DormitoryModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
  if (!tenantDb.models.Room) tenantDb.model<IRoom>('Room', RoomModel.schema);
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string; dormitoryId: string } }
) {
  const { schoolCode, dormitoryId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin', 'dormitory_master'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(dormitoryId)) {
    return NextResponse.json({ error: 'Invalid Dormitory ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Dormitory = tenantDb.models.Dormitory as mongoose.Model<IDormitory>;

    const dormitory = await Dormitory.findById(dormitoryId)
      .populate<{ wardenId?: ITenantUser }>('wardenId', 'firstName lastName username')
      .lean();

    if (!dormitory) {
      return NextResponse.json({ error: 'Dormitory not found' }, { status: 404 });
    }
    return NextResponse.json(dormitory);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch dormitory', details: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string; dormitoryId: string } }
) {
  const { schoolCode, dormitoryId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(dormitoryId)) {
    return NextResponse.json({ error: 'Invalid Dormitory ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, type, capacity, wardenId, notes } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'Missing required fields: name, type' }, { status: 400 });
    }
    if (wardenId && !mongoose.Types.ObjectId.isValid(wardenId)) {
      return NextResponse.json({ error: 'Invalid Warden ID format' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Dormitory = tenantDb.models.Dormitory as mongoose.Model<IDormitory>;

    const dormitoryToUpdate = await Dormitory.findById(dormitoryId);
    if (!dormitoryToUpdate) {
      return NextResponse.json({ error: 'Dormitory not found' }, { status: 404 });
    }

    if (name !== dormitoryToUpdate.name) {
      const existing = await Dormitory.findOne({ name, _id: { $ne: dormitoryId } });
      if (existing) {
        return NextResponse.json({ error: 'A dormitory with this name already exists.' }, { status: 409 });
      }
    }

    dormitoryToUpdate.name = name;
    dormitoryToUpdate.type = type;
    dormitoryToUpdate.capacity = capacity || undefined;
    dormitoryToUpdate.wardenId = wardenId || undefined;
    dormitoryToUpdate.notes = notes || undefined;

    await dormitoryToUpdate.save();
    const populatedDormitory = await Dormitory.findById(dormitoryToUpdate._id)
      .populate<{ wardenId?: ITenantUser }>('wardenId', 'firstName lastName username')
      .lean();
    return NextResponse.json(populatedDormitory);
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'A dormitory with this name already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update dormitory', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { schoolCode: string; dormitoryId: string } }
) {
  const { schoolCode, dormitoryId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(dormitoryId)) {
    return NextResponse.json({ error: 'Invalid Dormitory ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Dormitory = tenantDb.models.Dormitory as mongoose.Model<IDormitory>;
    const Room = tenantDb.models.Room as mongoose.Model<IRoom>;

    const roomCount = await Room.countDocuments({ dormitoryId });
    if (roomCount > 0) {
      return NextResponse.json({ error: 'Cannot delete dormitory. It has associated rooms. Please delete the rooms first.' }, { status: 400 });
    }

    const result = await Dormitory.deleteOne({ _id: dormitoryId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Dormitory not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Dormitory deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete dormitory', details: error.message }, { status: 500 });
  }
}
