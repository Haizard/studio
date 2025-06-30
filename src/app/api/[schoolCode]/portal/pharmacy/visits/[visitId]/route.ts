
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import VisitModel, { IVisit } from '@/models/Tenant/Visit';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import MedicationModel, { IMedication } from '@/models/Tenant/Medication';
import DispensationModel, { IDispensation } from '@/models/Tenant/Dispensation';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Visit) tenantDb.model<IVisit>('Visit', VisitModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
  if (!tenantDb.models.Medication) tenantDb.model<IMedication>('Medication', MedicationModel.schema);
  if (!tenantDb.models.Dispensation) tenantDb.model<IDispensation>('Dispensation', DispensationModel.schema);
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string; visitId: string } }
) {
  const { schoolCode, visitId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin', 'pharmacy'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(visitId)) {
    return NextResponse.json({ error: 'Invalid Visit ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Visit = tenantDb.models.Visit as mongoose.Model<IVisit>;
    const Dispensation = tenantDb.models.Dispensation as mongoose.Model<IDispensation>;

    const visit = await Visit.findById(visitId)
      .populate<{ studentId: ITenantUser }>('studentId', 'firstName lastName username')
      .populate<{ recordedById: ITenantUser }>('recordedById', 'username')
      .lean();

    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    const dispensations = await Dispensation.find({ visitId: visit._id })
        .populate<{ medicationId: IMedication }>('medicationId', 'name brand unit')
        .populate<{ dispensedById: ITenantUser }>('dispensedById', 'username')
        .sort({ dispensationDate: -1 })
        .lean();

    return NextResponse.json({ ...visit, dispensations });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch visit details', details: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string; visitId: string } }
) {
  const { schoolCode, visitId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin', 'pharmacy'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(visitId)) {
    return NextResponse.json({ error: 'Invalid Visit ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { diagnosis, treatment, notes, performCheckout } = body;

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Visit = tenantDb.models.Visit as mongoose.Model<IVisit>;

    const visitToUpdate = await Visit.findById(visitId);
    if (!visitToUpdate) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }
    
    if (visitToUpdate.checkOutTime) {
      return NextResponse.json({ error: 'Cannot update a visit that has already been checked out.' }, { status: 400 });
    }

    if (diagnosis !== undefined) visitToUpdate.diagnosis = diagnosis;
    if (treatment !== undefined) visitToUpdate.treatment = treatment;
    if (notes !== undefined) visitToUpdate.notes = notes;
    if (performCheckout) {
        visitToUpdate.checkOutTime = new Date();
    }

    await visitToUpdate.save();
    const populatedVisit = await Visit.findById(visitToUpdate._id)
      .populate<{ studentId: ITenantUser }>('studentId', 'firstName lastName username')
      .populate<{ recordedById: ITenantUser }>('recordedById', 'username')
      .lean();
    return NextResponse.json(populatedVisit);
  } catch (error: any) {
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json({ error: 'Validation Error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update visit', details: error.message }, { status: 500 });
  }
}
