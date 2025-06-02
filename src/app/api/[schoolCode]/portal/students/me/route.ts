
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
  console.log(`[API Students ME GET / ${schoolCode}] Received request.`);

  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.role !== 'student' || token.schoolCode !== schoolCode) {
    console.warn(`[API Students ME GET / ${schoolCode}] Unauthorized access attempt. Token role: ${token?.role}, Token schoolCode: ${token?.schoolCode}`);
    return NextResponse.json({ error: 'Unauthorized or not a student of this school' }, { status: 403 });
  }

  if (!token.uid) {
    console.error(`[API Students ME GET / ${schoolCode}] User ID not found in token.`);
    return NextResponse.json({ error: 'User ID not found in token' }, { status: 400 });
  }
  console.log(`[API Students ME GET / ${schoolCode}] Authorized. User ID: ${token.uid}. Fetching profile.`);

  try {
    console.log(`[API Students ME GET / ${schoolCode}] Attempting to get tenant DB connection.`);
    const tenantDb = await getTenantConnection(schoolCode);
    console.log(`[API Students ME GET / ${schoolCode}] Tenant DB connection obtained. Ensuring models are registered.`);
    await ensureTenantModelsRegistered(tenantDb);
    console.log(`[API Students ME GET / ${schoolCode}] Models registered.`);
    
    const Student = tenantDb.models.Student as mongoose.Model<IStudent>;

    console.log(`[API Students ME GET / ${schoolCode}] Attempting to find student profile for userId: ${token.uid}`);
    const studentProfile = await Student.findOne({ userId: token.uid })
      .populate<{ userId: ITenantUser }>('userId', 'firstName lastName username email isActive role profilePictureUrl')
      .populate<{ currentClassId: IClass }>('currentClassId', 'name level stream')
      .populate<{ currentAcademicYearId: IAcademicYear }>('currentAcademicYearId', 'name startDate endDate')
      .populate<{ alevelCombinationId: IAlevelCombination }>({
        path: 'alevelCombinationId',
        model: 'AlevelCombination', // Explicit model name
        select: 'name code',
        populate: { path: 'subjects', model: 'Subject', select: 'name code' }
      })
      .populate<{ oLevelOptionalSubjects: ISubject[] }>('oLevelOptionalSubjects', 'name code')
      .lean();
    
    console.log(`[API Students ME GET / ${schoolCode}] Student profile query completed. Profile found: ${!!studentProfile}`);

    if (!studentProfile) {
      console.warn(`[API Students ME GET / ${schoolCode}] Student profile not found for userId: ${token.uid}`);
      return NextResponse.json({ error: 'Student profile not found for the logged-in user.' }, { status: 404 });
    }
    
    console.log(`[API Students ME GET / ${schoolCode}] Student profile found. Preparing response.`);
    if (studentProfile.userId && typeof studentProfile.userId === 'object' && (studentProfile.userId as any).passwordHash) {
        // @ts-ignore
        delete (studentProfile.userId as any).passwordHash;
    }

    return NextResponse.json(studentProfile);
  } catch (error: any) {
    console.error(`[API Students ME GET / ${schoolCode}] Critical error fetching student profile for user ${token.uid}:`, error.message);
    console.error(`[API Students ME GET / ${schoolCode}] Error stack:`, error.stack); 
    return NextResponse.json({ error: 'Failed to fetch student profile due to a server issue.', details: error.message }, { status: 500 });
  }
}
