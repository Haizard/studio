
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import AttendanceModel, { IAttendance } from '@/models/Tenant/Attendance';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import TermModel, { ITerm } from '@/models/Tenant/Term';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import SubjectModel, { ISubject } from '@/models/Tenant/Subject';
import TenantUserModel, { ITenantUser } from '@/models/Tenant/User'; // For User._id reference
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Attendance) tenantDb.model<IAttendance>('Attendance', AttendanceModel.schema);
  if (!tenantDb.models.AcademicYear) tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
  if (!tenantDb.models.Term) tenantDb.model<ITerm>('Term', TermModel.schema);
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

  const { searchParams } = new URL(request.url);
  const academicYearId = searchParams.get('academicYearId');
  const termId = searchParams.get('termId'); // Optional

  if (!academicYearId || !mongoose.Types.ObjectId.isValid(academicYearId)) {
    return NextResponse.json({ error: 'Valid Academic Year ID is required' }, { status: 400 });
  }
  if (termId && !mongoose.Types.ObjectId.isValid(termId)) {
    return NextResponse.json({ error: 'Invalid Term ID provided' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    
    const Attendance = tenantDb.models.Attendance as mongoose.Model<IAttendance>;

    const query: any = {
      studentId: new mongoose.Types.ObjectId(token.uid as string),
      academicYearId: new mongoose.Types.ObjectId(academicYearId),
    };

    if (termId) {
      // To correctly filter by term, we need to find attendance records
      // where the 'date' falls within the selected term's start and end dates,
      // AND the attendance record itself might or might not have a termId directly.
      // The Attendance model has academicYearId, but not explicitly termId.
      // We will filter by date range of the term.
      const Term = tenantDb.models.Term as mongoose.Model<ITerm>;
      const termDetails = await Term.findById(termId).lean();
      if (termDetails) {
        query.date = { $gte: termDetails.startDate, $lte: termDetails.endDate };
      } else {
        // If termId is provided but not found, return empty or handle as error
        return NextResponse.json({ error: "Specified term not found for the academic year." }, { status: 404 });
      }
    }
    
    const attendanceRecords = await Attendance.find(query)
      .populate<{ classId: IClass }>('classId', 'name level')
      .populate<{ subjectId?: ISubject }>('subjectId', 'name code')
      .populate<{ academicYearId: IAcademicYear }>('academicYearId', 'name')
      // Populate recordedBy if needed for student view? Probably not.
      .sort({ date: -1 }) // Sort by most recent date first
      .lean();

    return NextResponse.json(attendanceRecords);

  } catch (error: any) {
    console.error(`Error fetching attendance for student ${token.uid}, school ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch student attendance', details: error.message, stack: error.stack }, { status: 500 });
  }
}
