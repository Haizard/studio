
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import MedicationModel, { IMedication } from '@/models/Tenant/Medication';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Medication) tenantDb.model<IMedication>('Medication', MedicationModel.schema);
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string; medicationId: string } }
) {
  const { schoolCode, medicationId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin', 'pharmacy'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(medicationId)) {
    return NextResponse.json({ error: 'Invalid Medication ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Medication = tenantDb.models.Medication as mongoose.Model<IMedication>;

    const medication = await Medication.findById(medicationId).lean();
    if (!medication) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
    }
    return NextResponse.json(medication);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch medication', details: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string; medicationId: string } }
) {
  const { schoolCode, medicationId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin', 'pharmacy'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(medicationId)) {
    return NextResponse.json({ error: 'Invalid Medication ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, brand, stock, unit, lowStockThreshold, notes } = body;

    if (!name || stock === undefined || !unit) {
      return NextResponse.json({ error: 'Missing required fields: name, stock, unit' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Medication = tenantDb.models.Medication as mongoose.Model<IMedication>;

    const medicationToUpdate = await Medication.findById(medicationId);
    if (!medicationToUpdate) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
    }

    if (name !== medicationToUpdate.name) {
      const existing = await Medication.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') }, _id: { $ne: medicationId } });
      if (existing) {
        return NextResponse.json({ error: 'A medication with this name already exists.' }, { status: 409 });
      }
    }

    medicationToUpdate.name = name;
    medicationToUpdate.brand = brand;
    medicationToUpdate.stock = stock;
    medicationToUpdate.unit = unit;
    medicationToUpdate.lowStockThreshold = lowStockThreshold;
    medicationToUpdate.notes = notes;

    await medicationToUpdate.save();
    return NextResponse.json(medicationToUpdate.toObject());
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'A medication with this name already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update medication', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { schoolCode: string; medicationId: string } }
) {
  const { schoolCode, medicationId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin', 'pharmacy'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(medicationId)) {
    return NextResponse.json({ error: 'Invalid Medication ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Medication = tenantDb.models.Medication as mongoose.Model<IMedication>;

    // Add check if medication has been dispensed before deleting
    const result = await Medication.deleteOne({ _id: medicationId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Medication deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete medication', details: error.message }, { status: 500 });
  }
}
