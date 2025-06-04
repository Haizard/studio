
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import FeeItemModel, { IFeeItem } from '@/models/Tenant/FeeItem';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import TermModel, { ITerm } from '@/models/Tenant/Term';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.FeeItem) tenantDb.model<IFeeItem>('FeeItem', FeeItemModel.schema);
  if (!tenantDb.models.AcademicYear) tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
  if (!tenantDb.models.Term) tenantDb.model<ITerm>('Term', TermModel.schema);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
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

  const { searchParams } = new URL(request.url);
  const academicYearId = searchParams.get('academicYearId');
  const termId = searchParams.get('termId');
  const level = searchParams.get('level');
  const classId = searchParams.get('classId');

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const FeeItem = tenantDb.models.FeeItem as mongoose.Model<IFeeItem>;

    const query: any = {};
    if (academicYearId && mongoose.Types.ObjectId.isValid(academicYearId)) query.academicYearId = new mongoose.Types.ObjectId(academicYearId);
    if (termId && mongoose.Types.ObjectId.isValid(termId)) query.termId = new mongoose.Types.ObjectId(termId);
    if (level) query.appliesToLevels = level; // Assumes exact match for level, consider $in if multiple levels
    if (classId && mongoose.Types.ObjectId.isValid(classId)) query.appliesToClasses = new mongoose.Types.ObjectId(classId); // Assumes exact match for class, consider $in if multiple classes

    const feeItems = await FeeItem.find(query)
      .populate('academicYearId', 'name')
      .populate('termId', 'name')
      .populate('appliesToClasses', 'name level')
      .sort({ 'academicYearId.name': -1, name: 1 })
      .lean();

    return NextResponse.json(feeItems);
  } catch (error: any) {
    console.error(`Error fetching fee items for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch fee items', details: String(error.message || 'Unknown error') }, { status: 500 });
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
    const { name, description, amount, currency, academicYearId, termId, appliesToLevels, appliesToClasses, category, isMandatory } = body;

    if (!name || amount === undefined || typeof amount !== 'number' || !academicYearId) {
      return NextResponse.json({ error: 'Missing or invalid required fields: name (string), amount (number), academicYearId (string).' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(academicYearId) || (termId && !mongoose.Types.ObjectId.isValid(termId))) {
        return NextResponse.json({ error: 'Invalid ID format for academicYearId or termId.' }, { status: 400 });
    }
    if (appliesToClasses && !Array.isArray(appliesToClasses)) {
        return NextResponse.json({ error: 'appliesToClasses must be an array of Class IDs.' }, { status: 400 });
    }
    if (appliesToClasses) {
        for (const cId of appliesToClasses) {
            if (!mongoose.Types.ObjectId.isValid(cId)) return NextResponse.json({ error: `Invalid Class ID in appliesToClasses: ${cId}`}, { status: 400 });
        }
    }
    if (appliesToLevels && !Array.isArray(appliesToLevels)) {
      return NextResponse.json({ error: 'appliesToLevels must be an array of strings.' }, { status: 400 });
    }


    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const FeeItem = tenantDb.models.FeeItem as mongoose.Model<IFeeItem>;

    const existingFeeItem = await FeeItem.findOne({ name, academicYearId: new mongoose.Types.ObjectId(academicYearId) });
    if (existingFeeItem) {
      return NextResponse.json({ error: 'A fee item with this name already exists for the selected academic year.' }, { status: 409 });
    }

    const newFeeItem = new FeeItem({
      name,
      description: description || undefined,
      amount: Number(amount),
      currency: currency || 'TZS',
      academicYearId: new mongoose.Types.ObjectId(academicYearId),
      termId: termId ? new mongoose.Types.ObjectId(termId) : undefined,
      appliesToLevels: appliesToLevels || [],
      appliesToClasses: appliesToClasses ? appliesToClasses.map((id: string) => new mongoose.Types.ObjectId(id)) : [],
      category: category || undefined,
      isMandatory: isMandatory !== undefined ? isMandatory : true,
    });

    await newFeeItem.save();
    const populatedFeeItem = await FeeItem.findById(newFeeItem._id)
      .populate('academicYearId', 'name')
      .populate('termId', 'name')
      .populate('appliesToClasses', 'name level')
      .lean();
    return NextResponse.json(populatedFeeItem, { status: 201 });
  } catch (error: any) {
    console.error(`Error creating fee item for ${schoolCode}:`, error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Fee item name must be unique within an academic year.', details: String(error.message || '') }, { status: 409 });
    }
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((e: any) => String(e.message || 'Validation error')).join(', ');
      return NextResponse.json({ error: 'Validation Error', details: messages || 'Please check your input.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create fee item', details: String(error.message || 'Unknown error') }, { status: 500 });
  }
}
