
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import StudentModel, { IStudent } from '@/models/Tenant/Student';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import AlevelCombinationModel, { IAlevelCombination } from '@/models/Tenant/AlevelCombination';
import SubjectModel, { ISubject } from '@/models/Tenant/Subject';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Student) tenantDb.model<IStudent>('Student', StudentModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
  if (!tenantDb.models.AcademicYear) tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
  if (!tenantDb.models.AlevelCombination) tenantDb.model<IAlevelCombination>('AlevelCombination', AlevelCombinationModel.schema);
  if (!tenantDb.models.Subject) tenantDb.model<ISubject>('Subject', SubjectModel.schema);
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const { searchParams } = new URL(request.url);
  const userIdFromQuery = searchParams.get('userId'); // Allow admin/teacher to fetch specific student profile

  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
  
  if (!token || token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let targetUserId;

  if (userIdFromQuery && mongoose.Types.ObjectId.isValid(userIdFromQuery)) {
    // Admin or teacher is requesting a specific student's profile
    if (token.role !== 'admin' && token.role !== 'teacher' && token.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to view other user profiles.' }, { status: 403 });
    }
    targetUserId = new mongoose.Types.ObjectId(userIdFromQuery);
  } else if (token.role === 'student' && token.uid) {
    // Student is requesting their own profile
    targetUserId = new mongoose.Types.ObjectId(token.uid as string);
  } else {
    return NextResponse.json({ error: 'User ID not found in token or query' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    
    const Student = tenantDb.models.Student as mongoose.Model<IStudent>;

    const studentProfile = await Student.findOne({ userId: targetUserId })
      .populate<{ userId: ITenantUser }>('userId', 'firstName lastName username email isActive role profilePictureUrl')
      .populate<{ currentClassId: IClass }>('currentClassId', 'name level stream')
      .populate<{ currentAcademicYearId: IAcademicYear }>('currentAcademicYearId', 'name startDate endDate')
      .populate<{ alevelCombinationId: IAlevelCombination }>({
        path: 'alevelCombinationId',
        model: 'AlevelCombination',
        select: 'name code',
        populate: { path: 'subjects', model: 'Subject', select: 'name code' }
      })
      .populate<{ oLevelOptionalSubjects: ISubject[] }>('oLevelOptionalSubjects', 'name code')
      .lean();
    
    if (!studentProfile) {
      return NextResponse.json({ error: 'Student profile not found.' }, { status: 404 });
    }
    
    if (studentProfile.userId && typeof studentProfile.userId === 'object' && (studentProfile.userId as any).passwordHash) {
        // @ts-ignore
        delete (studentProfile.userId as any).passwordHash;
    }

    return NextResponse.json(studentProfile);
  } catch (error: any) {
    console.error(`Error fetching student profile for user ${targetUserId} in ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch student profile', details: error.message }, { status: 500 });
  }
}
