
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
  { params }: { params: { schoolCode: string; termId: string } }
) {
  const { schoolCode, termId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized for this school or role' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(termId)) {
    return NextResponse.json({ error: 'Invalid Term ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Term = tenantDb.models.Term as mongoose.Model<ITerm>;

    const term = await Term.findById(termId).populate('academicYearId', 'name').lean();
    if (!term) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }
    return NextResponse.json(term);
  } catch (error: any) {
    console.error(`Error fetching term ${termId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch term', details: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string; termId: string } }
) {
  const { schoolCode, termId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
     if (!(token?.role === 'superadmin' && schoolCode)) {
        return NextResponse.json({ error: 'Unauthorized for this school or role' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(termId)) {
    return NextResponse.json({ error: 'Invalid Term ID' }, { status: 400 });
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

    const termToUpdate = await Term.findById(termId);
    if (!termToUpdate) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }

    if (name !== termToUpdate.name || academicYearId.toString() !== termToUpdate.academicYearId.toString()) {
        const existingTerm = await Term.findOne({ name, academicYearId, _id: { $ne: termId } });
        if (existingTerm) {
          return NextResponse.json({ error: 'Another term with this name already exists for the selected academic year.' }, { status: 409 });
        }
    }
    
    if (isActive && !termToUpdate.isActive) {
        await Term.updateMany({ academicYearId: termToUpdate.academicYearId, _id: { $ne: termId }, isActive: true }, { $set: { isActive: false } });
    }

    termToUpdate.name = name;
    termToUpdate.academicYearId = academicYearId;
    termToUpdate.startDate = new Date(startDate);
    termToUpdate.endDate = new Date(endDate);
    termToUpdate.isActive = isActive !== undefined ? isActive : termToUpdate.isActive;

    await termToUpdate.save();
    const populatedTerm = await Term.findById(termToUpdate._id).populate('academicYearId', 'name').lean();
    return NextResponse.json(populatedTerm);
  } catch (error: any) {
    console.error(`Error updating term ${termId} for ${schoolCode}:`, error);
    if (error.code === 11000) {
        return NextResponse.json({ error: 'Term name must be unique within an academic year.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update term', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { schoolCode: string; termId: string } }
) {
  const { schoolCode, termId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
        return NextResponse.json({ error: 'Unauthorized for this school or role' }, { status: 403 });
    }
  }
  
  if (!mongoose.Types.ObjectId.isValid(termId)) {
    return NextResponse.json({ error: 'Invalid Term ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Term = tenantDb.models.Term as mongoose.Model<ITerm>;

    // TODO: Add check if term is in use by other entities (exams, marks, etc.) before deleting
    const result = await Term.deleteOne({ _id: termId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Term deleted successfully' });
  } catch (error: any) {
    console.error(`Error deleting term ${termId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to delete term', details: error.message }, { status: 500 });
  }
}
