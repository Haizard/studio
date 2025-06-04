
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import TeacherModel, { ITeacher } from '@/models/Tenant/Teacher';
import TimetableModel, { ITimetable } from '@/models/Tenant/Timetable';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import SubjectModel, { ISubject } from '@/models/Tenant/Subject';
import TenantUserModel, { ITenantUser } from '@/models/Tenant/User';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Teacher) tenantDb.model<ITeacher>('Teacher', TeacherModel.schema);
  if (!tenantDb.models.Timetable) tenantDb.model<ITimetable>('Timetable', TimetableModel.schema);
  if (!tenantDb.models.AcademicYear) tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
  if (!tenantDb.models.Subject) tenantDb.model<ISubject>('Subject', SubjectModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserModel.schema);
}

interface TeacherPeriod {
  _id: mongoose.Types.ObjectId | string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  subjectCode?: string;
  className: string;
  classLevel?: string;
  location?: string;
  timetableName: string;
  academicYearName: string;
  termName?: string;
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.role !== 'teacher' || token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (!token.uid) {
    return NextResponse.json({ error: 'User ID not found in token' }, { status: 400 });
  }
  const teacherUserId = new mongoose.Types.ObjectId(token.uid as string);

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    
    const AcademicYear = tenantDb.models.AcademicYear as mongoose.Model<IAcademicYear>;
    const Timetable = tenantDb.models.Timetable as mongoose.Model<ITimetable>;

    // 1. Find the active academic year
    const activeAcademicYear = await AcademicYear.findOne({ isActive: true }).lean();
    if (!activeAcademicYear) {
      return NextResponse.json({ error: 'No active academic year found.' }, { status: 404 });
    }

    // 2. Fetch all active timetables for the active academic year
    const activeTimetables = await Timetable.find({
      academicYearId: activeAcademicYear._id,
      isActive: true,
    })
      .populate<{ academicYearId: IAcademicYear }>('academicYearId', 'name')
      .populate<{ classId: IClass }>('classId', 'name level')
      .populate<{ termId?: ITerm }>('termId', 'name')
      .populate({ path: 'periods.subjectId', model: 'Subject', select: 'name code' })
      .populate({ path: 'periods.teacherId', model: 'User', select: '_id' }) // Only need teacherId for filtering
      .lean();

    if (activeTimetables.length === 0) {
      return NextResponse.json([]); // No active timetables, so no periods for the teacher
    }

    const teacherPeriods: TeacherPeriod[] = [];

    activeTimetables.forEach(tt => {
      tt.periods.forEach(p => {
        const periodTeacherId = (p.teacherId as unknown as ITenantUser)?._id;
        if (periodTeacherId && periodTeacherId.equals(teacherUserId)) {
          teacherPeriods.push({
            _id: p._id,
            dayOfWeek: p.dayOfWeek,
            startTime: p.startTime,
            endTime: p.endTime,
            subjectName: (p.subjectId as ISubject).name,
            subjectCode: (p.subjectId as ISubject).code,
            className: (tt.classId as IClass).name,
            classLevel: (tt.classId as IClass).level,
            location: p.location,
            timetableName: tt.name,
            academicYearName: (tt.academicYearId as IAcademicYear).name,
            termName: (tt.termId as ITerm)?.name,
          });
        }
      });
    });
    
    // Sort by day, then by start time
    teacherPeriods.sort((a, b) => {
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const dayComparison = dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
        if (dayComparison !== 0) return dayComparison;
        return a.startTime.localeCompare(b.startTime);
    });


    return NextResponse.json(teacherPeriods);

  } catch (error: any) {
    console.error(`Error fetching timetable for teacher ${token.uid}, school ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch teacher timetable', details: error.message, stack: error.stack }, { status: 500 });
  }
}
