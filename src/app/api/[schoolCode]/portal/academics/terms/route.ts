
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import TermModel, { ITerm } from '@/models/Tenant/Term';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Term) {
    tenantDb.model<ITerm>('Term', TermModel.schema);
  }
  if (!tenantDb.models.AcademicYear) {
    tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
  }
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const { searchParams } = new URL(request.url);
  const academicYearId = searchParams.get('academicYearId');

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
    const Term = tenantDb.models.Term as mongoose.Model<ITerm>;
    
    let query: any = {};
    if (academicYearId && mongoose.Types.ObjectId.isValid(academicYearId)) {
      query.academicYearId = academicYearId;
    }

    const terms = await Term.find(query)
      .populate('academicYearId', 'name')
      .sort({ 'academicYearId.name': 1, startDate: 1 })
      .lean(); 

    return NextResponse.json(terms);
  } catch (error: any) {
    console.error(`Error fetching terms for ${schoolCode}:`, error);
    if (error.message.includes('School not found') || error.message.includes('MongoDB URI not configured')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to fetch terms', details: error.message }, { status: 500 });
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
    const { name, academicYearId, startDate, endDate, isActive } = body;

    if (!name || !academicYearId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields: name, academicYearId, startDate, endDate' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(academicYearId)) {
        return NextResponse.json({ error: 'Invalid Academic Year ID' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Term = tenantDb.models.Term as mongoose.Model<ITerm>;

    const existingTerm = await Term.findOne({ name, academicYearId });
    if (existingTerm) {
      return NextResponse.json({ error: 'Term with this name already exists for the selected academic year.' }, { status: 409 });
    }
    
    if (isActive) {
        await Term.updateMany({ academicYearId, isActive: true }, { $set: { isActive: false } });
    }

    const newTerm = new Term({
      name,
      academicYearId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: isActive !== undefined ? isActive : false,
    });

    await newTerm.save();
    const populatedTerm = await Term.findById(newTerm._id).populate('academicYearId', 'name').lean();
    return NextResponse.json(populatedTerm, { status: 201 });
  } catch (error: any) {
    console.error(`Error creating term for ${schoolCode}:`, error);
    if (error.code === 11000) {
        return NextResponse.json({ error: 'Term name must be unique within an academic year.' }, { status: 409 });
    }
    if (error.message.includes('School not found') || error.message.includes('MongoDB URI not configured')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to create term', details: error.message }, { status: 500 });
  }
}
