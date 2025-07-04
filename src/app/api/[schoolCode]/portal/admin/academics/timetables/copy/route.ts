
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import TimetableModel, { ITimetable } from '@/models/Tenant/Timetable';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import TermModel, { ITerm } from '@/models/Tenant/Term';
import SubjectModel, { ISubject } from '@/models/Tenant/Subject';
import TenantUserModel, { ITenantUser } from '@/models/Tenant/User';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Timetable) tenantDb.model<ITimetable>('Timetable', TimetableModel.schema);
  if (!tenantDb.models.AcademicYear) tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
  if (!tenantDb.models.Term) tenantDb.model<ITerm>('Term', TermModel.schema);
  if (!tenantDb.models.Subject) tenantDb.model<ISubject>('Subject', SubjectModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserModel.schema);
}

export async function POST(
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

  try {
    const body = await request.json();
    const { sourceTimetableId, name, academicYearId, classId, termId, description } = body;

    if (!sourceTimetableId || !mongoose.Types.ObjectId.isValid(sourceTimetableId)) {
        return NextResponse.json({ error: 'Invalid or missing Source Timetable ID' }, { status: 400 });
    }

    if (!name || !academicYearId || !classId) {
      return NextResponse.json({ error: 'Missing required fields for the new timetable copy: name, academicYearId, classId' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(academicYearId) || 
        !mongoose.Types.ObjectId.isValid(classId) ||
        (termId && !mongoose.Types.ObjectId.isValid(termId))) {
        return NextResponse.json({ error: 'Invalid ID format for new academicYearId, classId, or termId' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Timetable = tenantDb.models.Timetable as mongoose.Model<ITimetable>;

    const sourceTimetable = await Timetable.findById(sourceTimetableId).lean();
    if (!sourceTimetable) {
      return NextResponse.json({ error: 'Source timetable not found' }, { status: 404 });
    }

    const existingTimetableCheck = await Timetable.findOne({ 
        name, 
        academicYearId, 
        classId, 
        termId: termId || undefined 
    });
    if (existingTimetableCheck) {
      return NextResponse.json({ error: 'A timetable with this name already exists for the selected academic year, class, and term.' }, { status: 409 });
    }
    
    const validPeriodsToCopy = sourceTimetable.periods
      .filter(p => p.subjectId && p.teacherId && mongoose.Types.ObjectId.isValid(p.subjectId.toString()) && mongoose.Types.ObjectId.isValid(p.teacherId.toString()))
      .map((p: any) => ({
        dayOfWeek: p.dayOfWeek,
        startTime: p.startTime,
        endTime: p.endTime,
        subjectId: new mongoose.Types.ObjectId(p.subjectId.toString()),
        teacherId: new mongoose.Types.ObjectId(p.teacherId.toString()),
        location: p.location,
        _id: new mongoose.Types.ObjectId(), 
      }));

    const newTimetable = new Timetable({
      name,
      academicYearId,
      classId,
      termId: termId || undefined,
      description: description || sourceTimetable.description,
      periods: validPeriodsToCopy,
      isActive: false, 
      version: 1, 
    });

    await newTimetable.save();

    const populatedTimetable = await Timetable.findById(newTimetable._id)
      .populate('academicYearId', 'name')
      .populate('classId', 'name level')
      .populate('termId', 'name')
      .populate({ path: 'periods.subjectId', model: 'Subject', select: 'name code' })
      .populate({ path: 'periods.teacherId', model: 'User', select: 'firstName lastName username' })
      .lean();
      
    return NextResponse.json(populatedTimetable, { status: 201 });

  } catch (error: any) {
    console.error(`Error copying timetable for ${schoolCode}:`, error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Timetable name, class, academic year, and term combination must be unique.' }, { status: 409 });
    }
    if (error instanceof mongoose.Error.ValidationError) {
        const messages = Object.values(error.errors).map((e: any) => e.message).join(', ');
        return NextResponse.json({ error: 'Validation failed when copying timetable.', details: messages || 'Please check your input.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to copy timetable', details: String(error.message || 'Unknown error') }, { status: 500 });
  }
}
