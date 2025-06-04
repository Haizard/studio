
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import GradingScaleModel, { IGradingScale } from '@/models/Tenant/GradingScale';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.GradingScale) tenantDb.model<IGradingScale>('GradingScale', GradingScaleModel.schema);
  if (!tenantDb.models.AcademicYear) tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string; id: string } }
) {
  const { schoolCode, id } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid Grading Scale ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const GradingScale = tenantDb.models.GradingScale as mongoose.Model<IGradingScale>;

    const scale = await GradingScale.findById(id)
      .populate('academicYearId', 'name')
      .lean();
      
    if (!scale) {
      return NextResponse.json({ error: 'Grading scale not found' }, { status: 404 });
    }
    return NextResponse.json(scale);
  } catch (error: any) {
    console.error(`Error fetching grading scale ${id} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch grading scale', details: String(error.message || 'Unknown error') }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string; id: string } }
) {
  const { schoolCode, id } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid Grading Scale ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, academicYearId, level, description, grades, isDefault } = body;

    if (!name || !Array.isArray(grades) || grades.length === 0) {
      return NextResponse.json({ error: 'Missing required fields: name, and at least one grade definition.' }, { status: 400 });
    }
     if (academicYearId && !mongoose.Types.ObjectId.isValid(academicYearId)) {
        return NextResponse.json({ error: 'Invalid Academic Year ID format.' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const GradingScale = tenantDb.models.GradingScale as mongoose.Model<IGradingScale>;

    const scaleToUpdate = await GradingScale.findById(id);
    if (!scaleToUpdate) {
      return NextResponse.json({ error: 'Grading scale not found' }, { status: 404 });
    }

    if (name !== scaleToUpdate.name) {
        const existingScale = await GradingScale.findOne({ name, _id: { $ne: id } });
        if (existingScale) {
          return NextResponse.json({ error: 'Another grading scale with this name already exists.' }, { status: 409 });
        }
    }
    
    if (isDefault && !scaleToUpdate.isDefault) {
      await GradingScale.updateMany({ _id: { $ne: id }, isDefault: true }, { $set: { isDefault: false } });
    }

    scaleToUpdate.name = name;
    scaleToUpdate.academicYearId = academicYearId || undefined;
    scaleToUpdate.level = level;
    scaleToUpdate.description = description;
    scaleToUpdate.grades = grades;
    scaleToUpdate.isDefault = isDefault !== undefined ? isDefault : scaleToUpdate.isDefault;

    await scaleToUpdate.save();
    const populatedScale = await GradingScale.findById(scaleToUpdate._id)
      .populate('academicYearId', 'name')
      .lean();
    return NextResponse.json(populatedScale);
  } catch (error: any) {
    console.error(`Error updating grading scale ${id} for ${schoolCode}:`, error);
    if (error.code === 11000) {
       return NextResponse.json({ error: 'Grading scale name must be unique.' }, { status: 409 });
    }
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((e: any) => e.message).join(', ');
      return NextResponse.json({ error: 'Validation Error', details: messages || 'Please check your input.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update grading scale', details: String(error.message || 'Unknown error') }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { schoolCode: string; id: string } }
) {
  const { schoolCode, id } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid Grading Scale ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const GradingScale = tenantDb.models.GradingScale as mongoose.Model<IGradingScale>;

    const scaleToDelete = await GradingScale.findById(id);
    if (!scaleToDelete) {
        return NextResponse.json({ error: 'Grading scale not found' }, { status: 404 });
    }
    if (scaleToDelete.isDefault) {
        return NextResponse.json({ error: 'Cannot delete the default grading scale. Set another scale as default first.' }, { status: 400 });
    }
    // TODO: Add check if grading scale is currently in use by exams or results before deleting

    const result = await GradingScale.deleteOne({ _id: id });
    if (result.deletedCount === 0) { // Should not happen if findById worked, but good practice
      return NextResponse.json({ error: 'Grading scale not found during deletion' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Grading scale deleted successfully' });
  } catch (error: any) {
    console.error(`Error deleting grading scale ${id} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to delete grading scale', details: String(error.message || 'Unknown error') }, { status: 500 });
  }
}
