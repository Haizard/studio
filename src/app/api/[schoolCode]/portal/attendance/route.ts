
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import AttendanceModel, { IAttendance, AttendanceStatus } from '@/models/Tenant/Attendance';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import SubjectModel, { ISubject } from '@/models/Tenant/Subject';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import TeacherModel, { ITeacher } from '@/models/Tenant/Teacher';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

interface AttendanceRecordPayload {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
}

interface SubmitAttendancePayload {
  academicYearId: string;
  classId: string;
  subjectId?: string;
  date: string; // YYYY-MM-DD string
  records: AttendanceRecordPayload[];
}

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Attendance) tenantDb.model<IAttendance>('Attendance', AttendanceModel.schema);
  if (!tenantDb.models.AcademicYear) tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
  if (!tenantDb.models.Subject) tenantDb.model<ISubject>('Subject', SubjectModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
  if (!tenantDb.models.Teacher) tenantDb.model<ITeacher>('Teacher', TeacherModel.schema);
}

export async function POST(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.role !== 'teacher' || token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized: Only teachers can submit attendance.' }, { status: 403 });
  }

  try {
    const body: SubmitAttendancePayload = await request.json();
    const { academicYearId, classId, subjectId, date, records } = body;

    if (!academicYearId || !classId || !date || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Missing required fields: academicYearId, classId, date, records array.' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(academicYearId) || !mongoose.Types.ObjectId.isValid(classId) || (subjectId && !mongoose.Types.ObjectId.isValid(subjectId))) {
        return NextResponse.json({ error: 'Invalid ID format for academic year, class, or subject.' }, { status: 400 });
    }
    const attendanceDate = new Date(date); 
    attendanceDate.setUTCHours(0,0,0,0);


    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Attendance = tenantDb.models.Attendance as mongoose.Model<IAttendance>;
    const Teacher = tenantDb.models.Teacher as mongoose.Model<ITeacher>;

    const teacherProfile = await Teacher.findOne({ userId: token.uid }).lean();
    if (!teacherProfile) {
      return NextResponse.json({ error: "Teacher profile not found." }, { status: 403 });
    }
    const isAuthorized = (teacherProfile.assignedClassesAndSubjects || []).some(
        (assignment: any) =>
            assignment.classId.toString() === classId &&
            (!subjectId || assignment.subjectId.toString() === subjectId) && 
            assignment.academicYearId.toString() === academicYearId
    );
    if (!isAuthorized) {
        return NextResponse.json({ error: "Unauthorized: You are not assigned to this class/subject for the academic year." }, { status: 403 });
    }


    const operations = records.map(record => {
      if (!mongoose.Types.ObjectId.isValid(record.studentId)) {
        console.warn(`Skipping invalid studentId: ${record.studentId}`);
        return null; 
      }
      const updateQuery: any = {
        studentId: record.studentId,
        classId,
        academicYearId,
        date: attendanceDate, 
      };
      if (subjectId) {
        updateQuery.subjectId = subjectId;
      }

      return Attendance.updateOne(
        updateQuery,
        {
          $set: {
            status: record.status,
            remarks: record.remarks || '',
            recordedById: token.uid,
          },
        },
        { upsert: true }
      );
    }).filter(op => op !== null);

    const results = await Promise.all(operations);
    const successfulOps = results.filter(r => r && (r.modifiedCount > 0 || (r as any).upsertedCount > 0)).length;

    return NextResponse.json({ message: `Attendance processed. ${successfulOps} records updated/inserted.`, results });

  } catch (error: any) {
    console.error(`Error processing attendance for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to process attendance', details: error.message }, { status: 500 });
  }
}


export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['teacher', 'admin', 'superadmin'].includes(token.role as string) || (token.schoolCode !== schoolCode && token.role !== 'superadmin')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const academicYearId = searchParams.get('academicYearId');
  const classId = searchParams.get('classId');
  const subjectId = searchParams.get('subjectId'); // Optional
  const date = searchParams.get('date'); // YYYY-MM-DD string

  if (!academicYearId || !classId || !date) {
    return NextResponse.json({ error: 'Missing required query params: academicYearId, classId, date.' }, { status: 400 });
  }
  if (!mongoose.Types.ObjectId.isValid(academicYearId) || !mongoose.Types.ObjectId.isValid(classId) || (subjectId && !mongoose.Types.ObjectId.isValid(subjectId))) {
      return NextResponse.json({ error: 'Invalid ID format for query parameters.' }, { status: 400 });
  }
  const attendanceDate = new Date(date);
  attendanceDate.setUTCHours(0,0,0,0);

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Attendance = tenantDb.models.Attendance as mongoose.Model<IAttendance>;
    const Teacher = tenantDb.models.Teacher as mongoose.Model<ITeacher>;

    if (token.role === 'teacher') {
        const teacherProfile = await Teacher.findOne({ userId: token.uid }).lean();
        if (!teacherProfile) {
            return NextResponse.json({ error: "Teacher profile not found." }, { status: 403 });
        }
        const isAuthorized = (teacherProfile.assignedClassesAndSubjects || []).some(
            (assignment: any) =>
                assignment.classId.toString() === classId &&
                (!subjectId || assignment.subjectId.toString() === subjectId) &&
                assignment.academicYearId.toString() === academicYearId
        );
        if (!isAuthorized) {
            return NextResponse.json({ error: "Unauthorized: You are not assigned to this class/subject for the academic year." }, { status: 403 });
        }
    }


    const query: any = {
      academicYearId,
      classId,
      date: attendanceDate,
    };
    if (subjectId) {
      query.subjectId = subjectId;
    }

    const attendanceRecords = await Attendance.find(query)
      .populate<{ studentId: ITenantUser }>({ path: 'studentId', model: 'User', select: 'firstName lastName username' })
      .populate<{ recordedById: ITenantUser }>({ path: 'recordedById', model: 'User', select: 'firstName lastName username' })
      .lean();

    return NextResponse.json(attendanceRecords);
  } catch (error: any) {
    console.error(`Error fetching attendance for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch attendance', details: error.message }, { status: 500 });
  }
}
