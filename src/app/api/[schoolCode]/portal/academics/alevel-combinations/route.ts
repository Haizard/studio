
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import AlevelCombinationModel, { IAlevelCombination } from '@/models/Tenant/AlevelCombination';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import SubjectModel, { ISubject } from '@/models/Tenant/Subject';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.AlevelCombination) {
    tenantDb.model<IAlevelCombination>('AlevelCombination', AlevelCombinationModel.schema);
  }
  if (!tenantDb.models.AcademicYear) {
    tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
  }
  if (!tenantDb.models.Subject) {
    tenantDb.model<ISubject>('Subject', SubjectModel.schema);
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
    const AlevelCombination = tenantDb.models.AlevelCombination as mongoose.Model<IAlevelCombination>;
    
    const combinations = await AlevelCombination.find({})
      .populate<{ academicYearId: IAcademicYear }>('academicYearId', 'name')
      .populate<{ subjects: ISubject[] }>('subjects', 'name code')
      .sort({ 'academicYearId.name': -1, name: 1 })
      .lean(); 

    return NextResponse.json(combinations);
  } catch (error: any) {
    console.error(`Error fetching A-Level combinations for ${schoolCode}:`, error);
    if (error.message.includes('School not found') || error.message.includes('MongoDB URI not configured')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to fetch A-Level combinations', details: error.message }, { status: 500 });
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
    const { name, code, subjects, description, academicYearId } = body;

    if (!name || !code || !subjects || !academicYearId || subjects.length === 0) {
      return NextResponse.json({ error: 'Missing required fields: name, code, subjects, academicYearId' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(academicYearId)){
      return NextResponse.json({ error: 'Invalid Academic Year ID format.' }, { status: 400 });
    }
    if (!Array.isArray(subjects) || subjects.some(subId => !mongoose.Types.ObjectId.isValid(subId))) {
      return NextResponse.json({ error: 'Invalid Subject ID format in subjects array.' }, { status: 400 });
    }


    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const AlevelCombination = tenantDb.models.AlevelCombination as mongoose.Model<IAlevelCombination>;

    const existingCombination = await AlevelCombination.findOne({ code, academicYearId });
    if (existingCombination) {
      return NextResponse.json({ error: 'A combination with this code already exists for the selected academic year.' }, { status: 409 });
    }

    const newCombination = new AlevelCombination({
      name,
      code,
      subjects,
      description,
      academicYearId,
    });

    await newCombination.save();
    const populatedCombination = await AlevelCombination.findById(newCombination._id)
        .populate<{ academicYearId: IAcademicYear }>('academicYearId', 'name')
        .populate<{ subjects: ISubject[] }>('subjects', 'name code')
        .lean();
    return NextResponse.json(populatedCombination, { status: 201 });
  } catch (error: any) {
    console.error(`Error creating A-Level combination for ${schoolCode}:`, error);
    if (error.code === 11000) {
        return NextResponse.json({ error: 'Combination code must be unique within an academic year.' }, { status: 409 });
    }
    if (error.message.includes('School not found') || error.message.includes('MongoDB URI not configured')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to create A-Level combination', details: error.message }, { status: 500 });
  }
}
