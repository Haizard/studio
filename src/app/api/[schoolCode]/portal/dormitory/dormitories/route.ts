
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import DormitoryModel, { IDormitory } from '@/models/Tenant/Dormitory';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
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

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Dormitory = tenantDb.models.Dormitory as mongoose.Model<IDormitory>;
    
    const dormitories = await Dormitory.find({})
      .populate<{ wardenId?: ITenantUser }>('wardenId', 'firstName lastName username')
      .sort({ name: 1 })
      .lean();

    return NextResponse.json(dormitories);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch dormitories', details: error.message }, { status: 500 });
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

    const newDormitory = new Dormitory({
      name,
      type,
      capacity,
      wardenId: wardenId || undefined,
      notes,
    });

    await newDormitory.save();
    const populatedDormitory = await Dormitory.findById(newDormitory._id)
      .populate<{ wardenId?: ITenantUser }>('wardenId', 'firstName lastName username')
      .lean();
    return NextResponse.json(populatedDormitory, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
        return NextResponse.json({ error: 'A dormitory with this name already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create dormitory', details: error.message }, { status: 500 });
  }
}
