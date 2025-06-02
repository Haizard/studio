
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import AttendanceModel, { IAttendance } from '@/models/Tenant/Attendance';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import SubjectModel, { ISubject } from '@/models/Tenant/Subject';
import TenantUserModel, { ITenantUser } from '@/models/Tenant/User';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Attendance) tenantDb.model<IAttendance>('Attendance', AttendanceModel.schema);
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

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  const { searchParams } = new URL(request.url);
  const academicYearId = searchParams.get('academicYearId');
  const classId = searchParams.get('classId');
  const subjectId = searchParams.get('subjectId');
  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');

  if (!academicYearId || !classId || !startDateStr || !endDateStr) {
    return NextResponse.json({ error: 'Missing required query parameters: academicYearId, classId, startDate, endDate.' }, { status: 400 });
  }

  if (!mongoose.Types.ObjectId.isValid(academicYearId) || !mongoose.Types.ObjectId.isValid(classId)) {
    return NextResponse.json({ error: 'Invalid ID format for academic year or class.' }, { status: 400 });
  }
  if (subjectId && !mongoose.Types.ObjectId.isValid(subjectId)) {
    return NextResponse.json({ error: 'Invalid ID format for subject.' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Attendance = tenantDb.models.Attendance as mongoose.Model<IAttendance>;

    const startDate = new Date(startDateStr);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(endDateStr);
    endDate.setUTCHours(23, 59, 59, 999);

    const query: any = {
      academicYearId: new mongoose.Types.ObjectId(academicYearId),
      classId: new mongoose.Types.ObjectId(classId),
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    if (subjectId) {
      query.subjectId = new mongoose.Types.ObjectId(subjectId);
    }

    const attendanceRecords = await Attendance.find(query)
      .populate<{ studentId: ITenantUser }>({ path: 'studentId', model: 'User', select: 'firstName lastName username' })
      .populate<{ classId: IClass }>({ path: 'classId', model: 'Class', select: 'name level' })
      .populate<{ subjectId?: ISubject }>({ path: 'subjectId', model: 'Subject', select: 'name code' })
      .populate<{ recordedById: ITenantUser }>({ path: 'recordedById', model: 'User', select: 'username' })
      .populate<{ academicYearId: IAcademicYear }>({ path: 'academicYearId', model: 'AcademicYear', select: 'name'})
      .sort({ date: -1, 'studentId.lastName': 1, 'studentId.firstName': 1 })
      .lean();

    return NextResponse.json(attendanceRecords);
  } catch (error: any) {
    console.error(`Error fetching attendance records for admin, school ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch attendance records', details: error.message }, { status: 500 });
  }
}
