
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import DispensationModel, { IDispensation } from '@/models/Tenant/Dispensation';
import MedicationModel, { IMedication } from '@/models/Tenant/Medication';
import VisitModel, { IVisit } from '@/models/Tenant/Visit';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Dispensation) tenantDb.model<IDispensation>('Dispensation', DispensationModel.schema);
  if (!tenantDb.models.Medication) tenantDb.model<IMedication>('Medication', MedicationModel.schema);
  if (!tenantDb.models.Visit) tenantDb.model<IVisit>('Visit', VisitModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
}

export async function POST(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin', 'pharmacy'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { visitId, medicationId, quantityDispensed, notes } = body;

    if (!visitId || !medicationId || quantityDispensed === undefined) {
      return NextResponse.json({ error: 'Missing required fields: visitId, medicationId, quantityDispensed' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(visitId) || !mongoose.Types.ObjectId.isValid(medicationId)) {
        return NextResponse.json({ error: 'Invalid ID format for Visit or Medication' }, { status: 400 });
    }
    if (Number(quantityDispensed) <= 0) {
        return NextResponse.json({ error: 'Quantity must be a positive number' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Dispensation = tenantDb.models.Dispensation as mongoose.Model<IDispensation>;
    const Medication = tenantDb.models.Medication as mongoose.Model<IMedication>;
    const Visit = tenantDb.models.Visit as mongoose.Model<IVisit>;
    
    // Use a transaction to ensure atomicity
    const session = await tenantDb.startSession();
    session.startTransaction();
    let newDispensation;

    try {
        const visit = await Visit.findById(visitId).session(session);
        if (!visit) throw new Error("Visit not found.");
        if (visit.checkOutTime) throw new Error("Cannot dispense medication for a visit that has already been checked out.");

        const medication = await Medication.findById(medicationId).session(session);
        if (!medication) throw new Error("Medication not found.");
        if (medication.stock < quantityDispensed) throw new Error(`Insufficient stock for ${medication.name}. Available: ${medication.stock}, Requested: ${quantityDispensed}`);

        medication.stock -= quantityDispensed;
        await medication.save({ session });

        const dispensationDocs = await Dispensation.create([{
            visitId,
            medicationId,
            quantityDispensed,
            dispensationDate: new Date(),
            dispensedById: token.uid,
            notes,
        }], { session });

        newDispensation = dispensationDocs[0];

        await session.commitTransaction();
    } catch (error: any) {
        await session.abortTransaction();
        throw error; // Rethrow to be caught by outer catch block
    } finally {
        session.endSession();
    }
    
    // Populate after transaction is committed
    const populatedDispensation = await Dispensation.findById(newDispensation._id)
      .populate<{ medicationId: IMedication }>('medicationId', 'name brand unit')
      .populate<{ dispensedById: ITenantUser }>('dispensedById', 'username')
      .lean();

    return NextResponse.json(populatedDispensation, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: `Failed to dispense medication: ${error.message}` }, { status: 500 });
  }
}
