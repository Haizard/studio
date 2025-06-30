import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import VisitModel, { IVisit } from '@/models/Tenant/Visit';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Visit) tenantDb.model<IVisit>('Visit', VisitModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
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

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Visit = tenantDb.models.Visit as mongoose.Model<IVisit>;
    
    // Add filtering later if needed, e.g., by student, date range
    const visits = await Visit.find({})
      .populate<{ studentId: ITenantUser }>('studentId', 'firstName lastName username')
      .populate<{ recordedById: ITenantUser }>('recordedById', 'username')
      .sort({ checkInTime: -1 })
      .lean();

    return NextResponse.json(visits);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch visits', details: error.message }, { status: 500 });
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
    const { studentId, checkInTime, symptoms } = body;

    if (!studentId || !symptoms) {
      return NextResponse.json({ error: 'Missing required fields: studentId, symptoms' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return NextResponse.json({ error: 'Invalid Student ID format' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Visit = tenantDb.models.Visit as mongoose.Model<IVisit>;
    const User = tenantDb.models.User as mongoose.Model<ITenantUser>;

    const studentExists = await User.countDocuments({ _id: studentId, role: 'student' });
    if (studentExists === 0) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    }

    const newVisit = new Visit({
      studentId,
      checkInTime: checkInTime ? new Date(checkInTime) : new Date(),
      symptoms,
      recordedById: token.uid,
    });

    await newVisit.save();
    const populatedVisit = await Visit.findById(newVisit._id)
      .populate<{ studentId: ITenantUser }>('studentId', 'firstName lastName username')
      .populate<{ recordedById: ITenantUser }>('recordedById', 'username')
      .lean();
    return NextResponse.json(populatedVisit, { status: 201 });
  } catch (error: any) {
    if (error instanceof mongoose.Error.ValidationError) {
        return NextResponse.json({ error: 'Validation Error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create visit', details: error.message }, { status: 500 });
  }
}
