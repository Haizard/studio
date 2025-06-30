
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import TeacherModel, { ITeacher } from '@/models/Tenant/Teacher';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Teacher) tenantDb.model<ITeacher>('Teacher', TeacherModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;

  if (!schoolCode) {
    return NextResponse.json({ error: 'School code is required' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Teacher = tenantDb.models.Teacher as mongoose.Model<ITeacher>;

    // Fetch only active teachers and populate the necessary public user info
    const staff = await Teacher.find({ isActive: true })
      .populate<{ userId: ITenantUser }>({
        path: 'userId',
        model: 'User',
        select: 'firstName lastName profilePictureUrl' // Only select public fields
      })
      .select('specialization userId') // Select specialization from Teacher model and the populated userId
      .sort({ 'userId.lastName': 1, 'userId.firstName': 1 })
      .lean();

    // Filter out teachers who might not have a userId populated for some reason
    const publicStaffData = staff.filter(s => s.userId);

    return NextResponse.json(publicStaffData);
  } catch (error: any) {
    console.error(`Error fetching staff for public website ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch staff data', details: error.message }, { status: 500 });
  }
}
