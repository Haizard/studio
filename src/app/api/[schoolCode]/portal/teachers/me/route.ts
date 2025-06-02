
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import TeacherModel, { ITeacher } from '@/models/Tenant/Teacher';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import SubjectModel, { ISubject } from '@/models/Tenant/Subject';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Teacher) tenantDb.model<ITeacher>('Teacher', TeacherModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
  if (!tenantDb.models.Subject) tenantDb.model<ISubject>('Subject', SubjectModel.schema);
  if (!tenantDb.models.AcademicYear) tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.role !== 'teacher' || token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized or not a teacher of this school' }, { status: 403 });
  }

  if (!token.uid) {
    return NextResponse.json({ error: 'User ID not found in token' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    
    const Teacher = tenantDb.models.Teacher as mongoose.Model<ITeacher>;

    const teacherProfile = await Teacher.findOne({ userId: token.uid })
      .populate<{ userId: ITenantUser }>('userId', 'firstName lastName username email isActive role profilePictureUrl')
      .populate<{ isClassTeacherOf?: IClass }>('isClassTeacherOf', 'name level stream')
      .populate({
        path: 'assignedClassesAndSubjects.academicYearId',
        model: 'AcademicYear',
        select: 'name isActive'
      })
      .populate({
        path: 'assignedClassesAndSubjects.classId',
        model: 'Class',
        select: 'name level stream'
      })
      .populate({
        path: 'assignedClassesAndSubjects.subjectId',
        model: 'Subject',
        select: 'name code'
      })
      .lean();
    
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found for the logged-in user.' }, { status: 404 });
    }
    
    if (teacherProfile.userId && typeof teacherProfile.userId === 'object' && (teacherProfile.userId as any).passwordHash) {
        // @ts-ignore
        delete (teacherProfile.userId as any).passwordHash;
    }

    // Optionally filter assignedClassesAndSubjects to only include those for the active academic year
    // For now, returning all assignments as per the population.
    // If needed, we can add a query param to filter by active year later.

    return NextResponse.json(teacherProfile);
  } catch (error: any) {
    console.error(`Error fetching teacher profile for user ${token.uid}, school ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch teacher profile', details: error.message }, { status: 500 });
  }
}
