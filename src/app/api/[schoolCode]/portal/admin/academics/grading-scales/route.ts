
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
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const GradingScale = tenantDb.models.GradingScale as mongoose.Model<IGradingScale>;

    const scales = await GradingScale.find({})
      .populate('academicYearId', 'name')
      .sort({ name: 1 })
      .lean();

    return NextResponse.json(scales);
  } catch (error: any) {
    console.error(`Error fetching grading scales for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch grading scales', details: String(error.message || 'Unknown error') }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
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

    const existingScale = await GradingScale.findOne({ name });
    if (existingScale) {
      return NextResponse.json({ error: 'A grading scale with this name already exists.' }, { status: 409 });
    }

    if (isDefault) {
      await GradingScale.updateMany({ isDefault: true }, { $set: { isDefault: false } });
    }

    const newGradingScale = new GradingScale({
      name,
      academicYearId: academicYearId || undefined,
      level,
      description,
      grades,
      isDefault,
    });

    await newGradingScale.save();
    const populatedScale = await GradingScale.findById(newGradingScale._id)
      .populate('academicYearId', 'name')
      .lean();
    return NextResponse.json(populatedScale, { status: 201 });
  } catch (error: any) {
    console.error(`Error creating grading scale for ${schoolCode}:`, error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Grading scale name must be unique.' }, { status: 409 });
    }
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((e: any) => e.message).join(', ');
      return NextResponse.json({ error: 'Validation Error', details: messages || 'Please check your input.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create grading scale', details: String(error.message || 'Unknown error') }, { status: 500 });
  }
}
