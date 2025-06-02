
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear'; // Adjust path as needed
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

// Helper to ensure models are registered on the tenant connection
async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
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
  const fetchActiveOnly = searchParams.get('active') === 'true';

  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  // Allow teachers, admins, and superadmins to fetch academic years
  if (!token || !['teacher', 'admin', 'superadmin'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }
  
  if (!schoolCode) {
    return NextResponse.json({ error: 'School code is required' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const AcademicYear = tenantDb.models.AcademicYear as mongoose.Model<IAcademicYear>;
    
    const query: any = {};
    if (fetchActiveOnly) {
      query.isActive = true;
    }
    
    const academicYears = await AcademicYear.find(query).sort({ startDate: -1 }).lean(); 

    return NextResponse.json(academicYears);
  } catch (error: any) {
    console.error(`Error fetching academic years for ${schoolCode}:`, error);
    if (error.message.includes('School not found') || error.message.includes('MongoDB URI not configured')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to fetch academic years', details: error.message }, { status: 500 });
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
    const { name, startDate, endDate, isActive } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields: name, startDate, endDate' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const AcademicYear = tenantDb.models.AcademicYear as mongoose.Model<IAcademicYear>;

    const existingYear = await AcademicYear.findOne({ name });
    if (existingYear) {
      return NextResponse.json({ error: 'Academic year with this name already exists' }, { status: 409 });
    }
    
    // If setting a year to active, ensure no other year is active
    if (isActive) {
        await AcademicYear.updateMany({ isActive: true }, { $set: { isActive: false } });
    }

    const newAcademicYear = new AcademicYear({
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: isActive !== undefined ? isActive : false,
    });

    await newAcademicYear.save();
    return NextResponse.json(newAcademicYear.toObject(), { status: 201 });
  } catch (error: any) {
    console.error(`Error creating academic year for ${schoolCode}:`, error);
    if (error.code === 11000) {
        return NextResponse.json({ error: 'Academic year name must be unique.' }, { status: 409 });
    }
    if (error.message.includes('School not found') || error.message.includes('MongoDB URI not configured')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to create academic year', details: error.message }, { status: 500 });
  }
}

    