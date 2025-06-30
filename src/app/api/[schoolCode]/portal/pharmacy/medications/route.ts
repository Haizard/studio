
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

  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('search');

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Medication = tenantDb.models.Medication as mongoose.Model<IMedication>;

    const query: any = {};
    if (searchTerm) {
        query.$or = [
            { name: { $regex: searchTerm, $options: 'i' } },
            { brand: { $regex: searchTerm, $options: 'i' } }
        ];
    }
    
    const medications = await Medication.find(query).sort({ name: 1 }).lean();

    return NextResponse.json(medications);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch medications', details: error.message }, { status: 500 });
  }
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
    const { name, brand, stock, unit, lowStockThreshold, notes } = body;

    if (!name || stock === undefined || !unit) {
      return NextResponse.json({ error: 'Missing required fields: name, stock, unit' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Medication = tenantDb.models.Medication as mongoose.Model<IMedication>;

    const existingMedication = await Medication.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingMedication) {
      return NextResponse.json({ error: 'A medication with this name already exists.' }, { status: 409 });
    }

    const newMedication = new Medication({
      name,
      brand,
      stock,
      unit,
      lowStockThreshold,
      notes,
    });

    await newMedication.save();
    return NextResponse.json(newMedication.toObject(), { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'A medication with this name already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create medication', details: error.message }, { status: 500 });
  }
}
