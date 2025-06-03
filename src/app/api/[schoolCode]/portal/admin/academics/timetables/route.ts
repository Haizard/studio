
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import TimetableModel, { ITimetable } from '@/models/Tenant/Timetable';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import TermModel, { ITerm } from '@/models/Tenant/Term';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Timetable) tenantDb.model<ITimetable>('Timetable', TimetableModel.schema);
  if (!tenantDb.models.AcademicYear) tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
  if (!tenantDb.models.Term) tenantDb.model<ITerm>('Term', TermModel.schema);
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

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Timetable = tenantDb.models.Timetable as mongoose.Model<ITimetable>;

    const timetables = await Timetable.find({})
      .populate('academicYearId', 'name')
      .populate('classId', 'name level')
      .populate('termId', 'name')
      .sort({ 'academicYearId.name': 1, 'classId.name': 1, 'termId.name': 1, name: 1 })
      .lean();

    return NextResponse.json(timetables);
  } catch (error: any) {
    console.error(`Error fetching timetables for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch timetables', details: error.message }, { status: 500 });
  }
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
    const { name, academicYearId, classId, termId, periods, description, isActive } = body;

    if (!name || !academicYearId || !classId) {
      return NextResponse.json({ error: 'Missing required fields: name, academicYearId, classId' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(academicYearId) || 
        !mongoose.Types.ObjectId.isValid(classId) ||
        (termId && !mongoose.Types.ObjectId.isValid(termId))) {
        return NextResponse.json({ error: 'Invalid ID format for academicYearId, classId, or termId' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Timetable = tenantDb.models.Timetable as mongoose.Model<ITimetable>;

    const existingTimetable = await Timetable.findOne({ name, academicYearId, classId, termId: termId || null });
    if (existingTimetable) {
      return NextResponse.json({ error: 'A timetable with this name already exists for the selected class, academic year, and term.' }, { status: 409 });
    }

    if (isActive) {
        // If setting this timetable to active, deactivate others for the same class, year, and term
        await Timetable.updateMany(
            { classId, academicYearId, termId: termId || null, isActive: true },
            { $set: { isActive: false } }
        );
    }

    const newTimetable = new Timetable({
      name,
      academicYearId,
      classId,
      termId: termId || undefined,
      periods: periods || [],
      description,
      isActive: isActive !== undefined ? isActive : false,
      version: 1,
    });

    await newTimetable.save();
    const populatedTimetable = await Timetable.findById(newTimetable._id)
      .populate('academicYearId', 'name')
      .populate('classId', 'name level')
      .populate('termId', 'name')
      .lean();
    return NextResponse.json(populatedTimetable, { status: 201 });
  } catch (error: any) {
    console.error(`Error creating timetable for ${schoolCode}:`, error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Timetable name, class, academic year, and term combination must be unique.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create timetable', details: error.message }, { status: 500 });
  }
}
