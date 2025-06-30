
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import StudentModel, { IStudent } from '@/models/Tenant/Student';
import RoomModel, { IRoom } from '@/models/Tenant/Room';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';
import ClassModel, { IClass } from '@/models/Tenant/Class';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Student) tenantDb.model<IStudent>('Student', StudentModel.schema);
  if (!tenantDb.models.Room) tenantDb.model<IRoom>('Room', RoomModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
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
    const Student = tenantDb.models.Student as mongoose.Model<IStudent>;
    const Room = tenantDb.models.Room as mongoose.Model<IRoom>;

    // 1. Get all room occupants (which are student User IDs)
    const rooms = await Room.find({}).select('occupants').lean();
    const allocatedStudentUserIds = rooms.flatMap(room => room.occupants.map(id => id.toString()));
    const uniqueAllocatedStudentUserIds = [...new Set(allocatedStudentUserIds)];
    const allocatedStudentObjectIds = uniqueAllocatedStudentUserIds.map(id => new mongoose.Types.ObjectId(id));

    // 2. Find all active students whose userId is NOT in the allocated list
    const unallocatedStudents = await Student.find({
      userId: { $nin: allocatedStudentObjectIds },
      isActive: true,
    })
    .populate<{ userId: ITenantUser }>('userId', 'firstName lastName username')
    .populate<{ currentClassId?: IClass }>('currentClassId', 'name level')
    .select('userId studentIdNumber currentClassId') // Select only necessary fields
    .lean();

    return NextResponse.json(unallocatedStudents);
  } catch (error: any) {
    console.error(`Error fetching unallocated students for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch unallocated students', details: error.message }, { status: 500 });
  }
}
