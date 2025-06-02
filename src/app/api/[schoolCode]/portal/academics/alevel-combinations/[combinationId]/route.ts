
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
  { params }: { params: { schoolCode: string; combinationId: string } }
) {
  const { schoolCode, combinationId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized for this school or role' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(combinationId)) {
    return NextResponse.json({ error: 'Invalid Combination ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const AlevelCombination = tenantDb.models.AlevelCombination as mongoose.Model<IAlevelCombination>;

    const combination = await AlevelCombination.findById(combinationId)
      .populate('academicYearId', 'name')
      .populate('subjects', 'name code')
      .lean();
      
    if (!combination) {
      return NextResponse.json({ error: 'A-Level Combination not found' }, { status: 404 });
    }
    return NextResponse.json(combination);
  } catch (error: any) {
    console.error(`Error fetching combination ${combinationId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch combination', details: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string; combinationId: string } }
) {
  const { schoolCode, combinationId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
     if (!(token?.role === 'superadmin' && schoolCode)) {
        return NextResponse.json({ error: 'Unauthorized for this school or role' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(combinationId)) {
    return NextResponse.json({ error: 'Invalid Combination ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, code, subjects, description, academicYearId } = body;

    if (!name || !code || !subjects || !academicYearId || subjects.length === 0) {
      return NextResponse.json({ error: 'Missing required fields: name, code, subjects, academicYearId' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const AlevelCombination = tenantDb.models.AlevelCombination as mongoose.Model<IAlevelCombination>;

    const combinationToUpdate = await AlevelCombination.findById(combinationId);
    if (!combinationToUpdate) {
      return NextResponse.json({ error: 'A-Level Combination not found' }, { status: 404 });
    }

    if ((code !== combinationToUpdate.code || academicYearId.toString() !== combinationToUpdate.academicYearId.toString())) {
        const existingCombination = await AlevelCombination.findOne({ code, academicYearId, _id: { $ne: combinationId } });
        if (existingCombination) {
          return NextResponse.json({ error: 'Another combination with this code already exists for the selected academic year.' }, { status: 409 });
        }
    }
    
    combinationToUpdate.name = name;
    combinationToUpdate.code = code;
    combinationToUpdate.subjects = subjects;
    combinationToUpdate.description = description || undefined;
    combinationToUpdate.academicYearId = academicYearId;

    await combinationToUpdate.save();
    const populatedCombination = await AlevelCombination.findById(combinationToUpdate._id)
        .populate('academicYearId', 'name')
        .populate('subjects', 'name code')
        .lean();
    return NextResponse.json(populatedCombination);
  } catch (error: any) {
    console.error(`Error updating combination ${combinationId} for ${schoolCode}:`, error);
    if (error.code === 11000) {
        return NextResponse.json({ error: 'Combination code must be unique within an academic year.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update A-Level combination', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { schoolCode: string; combinationId: string } }
) {
  const { schoolCode, combinationId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
        return NextResponse.json({ error: 'Unauthorized for this school or role' }, { status: 403 });
    }
  }
  
  if (!mongoose.Types.ObjectId.isValid(combinationId)) {
    return NextResponse.json({ error: 'Invalid Combination ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const AlevelCombination = tenantDb.models.AlevelCombination as mongoose.Model<IAlevelCombination>;

    // TODO: Add check if combination is in use by students before deleting
    const result = await AlevelCombination.deleteOne({ _id: combinationId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'A-Level Combination not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'A-Level Combination deleted successfully' });
  } catch (error: any) {
    console.error(`Error deleting combination ${combinationId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to delete A-Level combination', details: error.message }, { status: 500 });
  }
}
