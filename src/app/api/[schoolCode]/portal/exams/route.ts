
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import ExamModel, { IExam } from '@/models/Tenant/Exam';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import TermModel, { ITerm } from '@/models/Tenant/Term';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Exam) {
    tenantDb.model<IExam>('Exam', ExamModel.schema);
  }
  if (!tenantDb.models.AcademicYear) {
    tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
  }
  if (!tenantDb.models.Term) {
    tenantDb.model<ITerm>('Term', TermModel.schema);
  }
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized for this school or role' }, { status: 403 });
    }
  }
  
  if (!schoolCode) {
    return NextResponse.json({ error: 'School code is required' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Exam = tenantDb.models.Exam as mongoose.Model<IExam>;
    
    const exams = await Exam.find({})
      .populate('academicYearId', 'name')
      .populate('termId', 'name')
      .sort({ 'academicYearId.name': -1, 'termId.name': 1, startDate: -1 })
      .lean(); 

    return NextResponse.json(exams);
  } catch (error: any) {
    console.error(`Error fetching exams for ${schoolCode}:`, error);
    if (error.message.includes('School not found') || error.message.includes('MongoDB URI not configured')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to fetch exams', details: error.message }, { status: 500 });
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
        return NextResponse.json({ error: 'Unauthorized for this school or role' }, { status: 403 });
    }
  }

  if (!schoolCode) {
    return NextResponse.json({ error: 'School code is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, academicYearId, termId, startDate, endDate, description, status, weight } = body;

    if (!name || !academicYearId || !startDate || !endDate || !status) {
      return NextResponse.json({ error: 'Missing required fields: name, academicYearId, startDate, endDate, status' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(academicYearId)) {
        return NextResponse.json({ error: 'Invalid Academic Year ID' }, { status: 400 });
    }
    if (termId && !mongoose.Types.ObjectId.isValid(termId)) {
        return NextResponse.json({ error: 'Invalid Term ID' }, { status: 400 });
    }
    if (weight !== undefined && (typeof weight !== 'number' || weight < 0 || weight > 100)) {
        return NextResponse.json({ error: 'Weight must be a number between 0 and 100.' }, { status: 400 });
    }


    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Exam = tenantDb.models.Exam as mongoose.Model<IExam>;

    const existingExam = await Exam.findOne({ name, academicYearId, termId: termId || null });
    if (existingExam) {
      return NextResponse.json({ error: 'An exam with this name already exists for the selected academic year and term.' }, { status: 409 });
    }

    const newExam = new Exam({
      name,
      academicYearId,
      termId: termId || undefined,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      description,
      status,
      weight: weight !== undefined ? weight : undefined,
    });

    await newExam.save();
    const populatedExam = await Exam.findById(newExam._id)
        .populate('academicYearId', 'name')
        .populate('termId', 'name')
        .lean();
    return NextResponse.json(populatedExam, { status: 201 });
  } catch (error: any) {
    console.error(`Error creating exam for ${schoolCode}:`, error);
    if (error.code === 11000) { // Mongoose duplicate key error for composite index
        return NextResponse.json({ error: 'An exam with this name might already exist for the selected academic year and term.' }, { status: 409 });
    }
    if (error.message.includes('School not found') || error.message.includes('MongoDB URI not configured')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to create exam', details: error.message }, { status: 500 });
  }
}
