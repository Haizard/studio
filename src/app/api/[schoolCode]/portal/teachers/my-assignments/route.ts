
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

  if (!token || token.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized: Only teachers can access their assignments.' }, { status: 403 });
  }
  if (token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const academicYearId = searchParams.get('academicYearId');

  if (!academicYearId || !mongoose.Types.ObjectId.isValid(academicYearId)) {
    return NextResponse.json({ error: 'Valid Academic Year ID is required' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    
    const Teacher = tenantDb.models.Teacher as mongoose.Model<ITeacher>;

    const teacherProfile = await Teacher.findOne({ userId: token.uid })
      .populate<{ assignedClassesAndSubjects: { classId: IClass, subjectId: ISubject, academicYearId: IAcademicYear}[] }>([
        {
            path: 'assignedClassesAndSubjects.classId',
            model: 'Class', 
            select: 'name level stream'
        },
        {
            path: 'assignedClassesAndSubjects.subjectId',
            model: 'Subject', 
            select: 'name code'
        },
        {
            path: 'assignedClassesAndSubjects.academicYearId',
            model: 'AcademicYear', 
            select: 'name _id' // Ensure _id is populated
        }
      ])
      .lean();

    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found.' }, { status: 404 });
    }
    
    const relevantAssignments = (teacherProfile.assignedClassesAndSubjects || []).filter(
      (assignment: any) => assignment.academicYearId && assignment.academicYearId._id.toString() === academicYearId
    );

    return NextResponse.json(relevantAssignments);

  } catch (error: any) {
    console.error(`Error fetching teacher assignments for ${schoolCode}, teacher ${token.uid}:`, error);
    return NextResponse.json({ error: 'Failed to fetch teacher assignments', details: error.message }, { status: 500 });
  }
}
