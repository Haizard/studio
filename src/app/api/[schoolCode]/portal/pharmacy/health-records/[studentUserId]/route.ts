
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import HealthRecordModel, { IHealthRecord } from '@/models/Tenant/HealthRecord';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.HealthRecord) tenantDb.model<IHealthRecord>('HealthRecord', HealthRecordModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string; studentUserId: string } }
) {
  const { schoolCode, studentUserId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin', 'pharmacy'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(studentUserId)) {
    return NextResponse.json({ error: 'Invalid Student User ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const HealthRecord = tenantDb.models.HealthRecord as mongoose.Model<IHealthRecord>;

    const record = await HealthRecord.findOne({ studentId: studentUserId }).lean();
      
    if (!record) {
      return NextResponse.json({ error: 'Health record not found' }, { status: 404 });
    }
    return NextResponse.json(record);
  } catch (error: any) {
    console.error(`Error fetching health record for student ${studentUserId} in ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch health record', details: String(error.message || 'Unknown server error') }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string; studentUserId: string } }
) {
  const { schoolCode, studentUserId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin', 'pharmacy'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(studentUserId)) {
    return NextResponse.json({ error: 'Invalid Student User ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { bloodType, allergies, medicalConditions, emergencyContact, notes } = body;

    if (!emergencyContact || !emergencyContact.name || !emergencyContact.relationship || !emergencyContact.phone) {
        return NextResponse.json({ error: 'Emergency contact information is required.' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const HealthRecord = tenantDb.models.HealthRecord as mongoose.Model<IHealthRecord>;

    const updateData = {
        studentId: studentUserId,
        bloodType,
        allergies,
        medicalConditions,
        emergencyContact,
        notes,
    };
    
    // Using findOneAndUpdate with upsert:true to create if not exists, update if it does.
    const options = { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true };
    const updatedRecord = await HealthRecord.findOneAndUpdate({ studentId: studentUserId }, updateData, options).lean();
      
    return NextResponse.json(updatedRecord);
  } catch (error: any) {
    console.error(`Error saving health record for student ${studentUserId} in ${schoolCode}:`, error);
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((e: any) => String(e.message || 'Validation error')).join(', ');
      return NextResponse.json({ error: 'Validation failed', details: messages || 'Please check your input.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to save health record', details: String(error.message || 'Unknown server error') }, { status: 500 });
  }
}
