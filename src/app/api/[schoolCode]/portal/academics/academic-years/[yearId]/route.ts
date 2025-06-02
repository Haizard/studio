
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.AcademicYear) {
    tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
  }
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string; yearId: string } }
) {
  const { schoolCode, yearId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized for this school or role' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(yearId)) {
    return NextResponse.json({ error: 'Invalid Academic Year ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const AcademicYear = tenantDb.models.AcademicYear as mongoose.Model<IAcademicYear>;

    const academicYear = await AcademicYear.findById(yearId).lean();
    if (!academicYear) {
      return NextResponse.json({ error: 'Academic Year not found' }, { status: 404 });
    }
    return NextResponse.json(academicYear);
  } catch (error: any) {
    console.error(`Error fetching academic year ${yearId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch academic year', details: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string; yearId: string } }
) {
  const { schoolCode, yearId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
     if (!(token?.role === 'superadmin' && schoolCode)) {
        return NextResponse.json({ error: 'Unauthorized for this school or role' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(yearId)) {
    return NextResponse.json({ error: 'Invalid Academic Year ID' }, { status: 400 });
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

    const academicYearToUpdate = await AcademicYear.findById(yearId);
    if (!academicYearToUpdate) {
      return NextResponse.json({ error: 'Academic Year not found' }, { status: 404 });
    }

    // Check for name uniqueness if name is being changed
    if (name !== academicYearToUpdate.name) {
        const existingYear = await AcademicYear.findOne({ name });
        if (existingYear) {
          return NextResponse.json({ error: 'Academic year with this name already exists' }, { status: 409 });
        }
    }
    
    // If setting a year to active, ensure no other year is active
    if (isActive && !academicYearToUpdate.isActive) { // Only run if changing isActive to true
        await AcademicYear.updateMany({ _id: { $ne: yearId }, isActive: true }, { $set: { isActive: false } });
    }


    academicYearToUpdate.name = name;
    academicYearToUpdate.startDate = new Date(startDate);
    academicYearToUpdate.endDate = new Date(endDate);
    academicYearToUpdate.isActive = isActive !== undefined ? isActive : academicYearToUpdate.isActive;

    await academicYearToUpdate.save();
    return NextResponse.json(academicYearToUpdate.toObject());
  } catch (error: any) {
    console.error(`Error updating academic year ${yearId} for ${schoolCode}:`, error);
    if (error.code === 11000) {
        return NextResponse.json({ error: 'Academic year name must be unique.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update academic year', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { schoolCode: string; yearId: string } }
) {
  const { schoolCode, yearId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
        return NextResponse.json({ error: 'Unauthorized for this school or role' }, { status: 403 });
    }
  }
  
  if (!mongoose.Types.ObjectId.isValid(yearId)) {
    return NextResponse.json({ error: 'Invalid Academic Year ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const AcademicYear = tenantDb.models.AcademicYear as mongoose.Model<IAcademicYear>;

    // TODO: Add check if academic year is in use by other entities (terms, classes, etc.) before deleting
    const result = await AcademicYear.deleteOne({ _id: yearId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Academic Year not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Academic Year deleted successfully' });
  } catch (error: any) {
    console.error(`Error deleting academic year ${yearId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to delete academic year', details: error.message }, { status: 500 });
  }
}
