
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import TeacherResourceModel, { ITeacherResource } from '@/models/Tenant/TeacherResource';
import StudentModel, { IStudent } from '@/models/Tenant/Student';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import SubjectModel, { ISubject } from '@/models/Tenant/Subject';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import ClassModel, { IClass } from '@/models/Tenant/Class'; // Import IClass
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.TeacherResource) tenantDb.model<ITeacherResource>('TeacherResource', TeacherResourceModel.schema);
  if (!tenantDb.models.Student) tenantDb.model<IStudent>('Student', StudentModel.schema);
  if (!tenantDb.models.AcademicYear) tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
  if (!tenantDb.models.Subject) tenantDb.model<ISubject>('Subject', SubjectModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.role !== 'student' || token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (!token.uid) {
    return NextResponse.json({ error: 'User ID not found in token' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const filterSubjectId = searchParams.get('subjectId');

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    
    const TeacherResource = tenantDb.models.TeacherResource as mongoose.Model<ITeacherResource>;
    const Student = tenantDb.models.Student as mongoose.Model<IStudent>;

    // 1. Fetch student's profile to get current academic year and class level
    const studentProfile = await Student.findOne({ userId: token.uid })
      .populate<{ currentAcademicYearId?: IAcademicYear }>('currentAcademicYearId', 'name _id')
      .populate<{ currentClassId?: IClass }>({
          path: 'currentClassId',
          model: 'Class',
          select: 'level name'
      })
      .lean();

    if (!studentProfile || !studentProfile.currentAcademicYearId) {
      return NextResponse.json({ error: 'Student profile or current academic year not found.' }, { status: 404 });
    }

    const studentAcademicYearId = studentProfile.currentAcademicYearId._id;
    const studentClassLevel = studentProfile.currentClassId?.level; // e.g., "Form 1", "Senior 5"

    // 2. Build query for resources
    const resourceQuery: any = {
      isPublic: true,
      academicYearId: studentAcademicYearId,
    };
    
    // Filter by class level:
    // Resource classLevel is empty (general for the academic year) OR
    // Resource classLevel matches the student's specific class level
    if (studentClassLevel) {
      resourceQuery.$or = [
        { classLevel: { $exists: false } },
        { classLevel: '' },
        { classLevel: studentClassLevel }
      ];
    } else {
       // If student has no class level, they only see general resources for the year
       resourceQuery.$or = [
        { classLevel: { $exists: false } },
        { classLevel: '' },
      ];
    }

    if (filterSubjectId && mongoose.Types.ObjectId.isValid(filterSubjectId)) {
      resourceQuery.subjectId = filterSubjectId;
    }
    
    const resources = await TeacherResource.find(resourceQuery)
      .populate<{ teacherId: ITenantUser }>({ path: 'teacherId', model: 'User', select: 'firstName lastName' })
      .populate<{ subjectId?: ISubject }>('subjectId', 'name code')
      .populate<{ academicYearId: IAcademicYear }>('academicYearId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(resources);

  } catch (error: any) {
    console.error(`Error fetching resources for student ${token.uid}, school ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch resources', details: error.message }, { status: 500 });
  }
}
