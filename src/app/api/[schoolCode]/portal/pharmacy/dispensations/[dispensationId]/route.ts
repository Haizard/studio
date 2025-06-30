
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import DispensationModel, { IDispensation } from '@/models/Tenant/Dispensation';
import MedicationModel, { IMedication } from '@/models/Tenant/Medication';
import VisitModel, { IVisit } from '@/models/Tenant/Visit';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Dispensation) tenantDb.model<IDispensation>('Dispensation', DispensationModel.schema);
  if (!tenantDb.models.Medication) tenantDb.model<IMedication>('Medication', MedicationModel.schema);
  if (!tenantDb.models.Visit) tenantDb.model<IVisit>('Visit', VisitModel.schema);
}

export async function DELETE(
  request: Request,
  { params }: { params: { schoolCode: string; dispensationId: string } }
) {
  const { schoolCode, dispensationId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin', 'pharmacy'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(dispensationId)) {
    return NextResponse.json({ error: 'Invalid Dispensation ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Dispensation = tenantDb.models.Dispensation as mongoose.Model<IDispensation>;
    const Medication = tenantDb.models.Medication as mongoose.Model<IMedication>;
    const Visit = tenantDb.models.Visit as mongoose.Model<IVisit>;
    
    const session = await tenantDb.startSession();
    session.startTransaction();

    try {
        const dispensationToDelete = await Dispensation.findById(dispensationId).session(session);
        if (!dispensationToDelete) throw new Error("Dispensation record not found.");

        const visit = await Visit.findById(dispensationToDelete.visitId).session(session);
        if (visit && visit.checkOutTime) {
            throw new Error("Cannot delete dispensation from a visit that has already been checked out.");
        }
        
        const medication = await Medication.findById(dispensationToDelete.medicationId).session(session);
        if (medication) {
            medication.stock += dispensationToDelete.quantityDispensed;
            await medication.save({ session });
        } else {
            // Log a warning if the medication doesn't exist, but allow deletion of the record anyway
            console.warn(`Medication with ID ${dispensationToDelete.medicationId} not found while deleting dispensation ${dispensationId}. Stock cannot be restored.`);
        }

        await dispensationToDelete.deleteOne({ session });

        await session.commitTransaction();
        return NextResponse.json({ message: 'Dispensation record deleted successfully' });

    } catch (error: any) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
  } catch (error: any) {
    return NextResponse.json({ error: `Failed to delete dispensation: ${error.message}` }, { status: 500 });
  }
}
