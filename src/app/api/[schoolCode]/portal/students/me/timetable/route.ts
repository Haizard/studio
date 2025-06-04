
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import StudentModel, { IStudent } from '@/models/Tenant/Student';
import TimetableModel, { ITimetable } from '@/models/Tenant/Timetable';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import SubjectModel, { ISubject } from '@/models/Tenant/Subject'; // For populating periods
import TenantUserModel, { ITenantUser } from '@/models/Tenant/User'; // For populating periods
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Student) tenantDb.model<IStudent>('Student', StudentModel.schema);
  if (!tenantDb.models.Timetable) tenantDb.model<ITimetable>('Timetable', TimetableModel.schema);
  if (!tenantDb.models.AcademicYear) tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
  if (!tenantDb.models.Subject) tenantDb.model<ISubject>('Subject', SubjectModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserModel.schema);
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

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    
    const Student = tenantDb.models.Student as mongoose.Model<IStudent>;
    const Timetable = tenantDb.models.Timetable as mongoose.Model<ITimetable>;

    // 1. Fetch student's profile to get current class and academic year
    const studentProfile = await Student.findOne({ userId: token.uid })
      .populate<{ currentClassId?: IClass }>('currentClassId', '_id name level')
      .populate<{ currentAcademicYearId?: IAcademicYear }>('currentAcademicYearId', '_id name isActive')
      .lean();

    if (!studentProfile || !studentProfile.currentClassId || !studentProfile.currentAcademicYearId) {
      return NextResponse.json({ error: 'Student profile, current class, or academic year not found.' }, { status: 404 });
    }

    if (!studentProfile.currentAcademicYearId.isActive) {
        return NextResponse.json({ error: 'The student\'s current academic year is not active. Timetable cannot be displayed.' }, { status: 400 });
    }

    const studentClassId = studentProfile.currentClassId._id;
    const activeAcademicYearId = studentProfile.currentAcademicYearId._id;

    // 2. Find the active timetable for the student's class and active academic year
    const timetable = await Timetable.findOne({
      classId: studentClassId,
      academicYearId: activeAcademicYearId,
      isActive: true,
    })
      .populate('academicYearId', 'name')
      .populate('classId', 'name level')
      .populate('termId', 'name')
      .populate({ path: 'periods.subjectId', model: 'Subject', select: 'name code' })
      .populate({ path: 'periods.teacherId', model: 'User', select: 'firstName lastName username' })
      .lean();

    if (!timetable) {
      return NextResponse.json({ error: 'No active timetable found for your class in the current academic year.' }, { status: 404 });
    }

    return NextResponse.json(timetable);

  } catch (error: any) {
    console.error(`Error fetching timetable for student ${token.uid}, school ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch timetable', details: error.message, stack: error.stack }, { status: 500 });
  }
}
