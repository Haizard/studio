
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
  { params }: { params: { schoolCode: string; feeItemId: string } }
) {
  const { schoolCode, feeItemId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(feeItemId)) {
    return NextResponse.json({ error: 'Invalid Fee Item ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const FeeItem = tenantDb.models.FeeItem as mongoose.Model<IFeeItem>;

    const feeItem = await FeeItem.findById(feeItemId)
      .populate('academicYearId', 'name')
      .populate('termId', 'name')
      .populate('appliesToClasses', 'name level')
      .lean();
      
    if (!feeItem) {
      return NextResponse.json({ error: 'Fee item not found' }, { status: 404 });
    }
    return NextResponse.json(feeItem);
  } catch (error: any) {
    console.error(`Error fetching fee item ${feeItemId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch fee item', details: String(error.message || 'Unknown error') }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string; feeItemId: string } }
) {
  const { schoolCode, feeItemId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

   if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(feeItemId)) {
    return NextResponse.json({ error: 'Invalid Fee Item ID' }, { status: 400 });
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

    const feeItemToUpdate = await FeeItem.findById(feeItemId);
    if (!feeItemToUpdate) {
      return NextResponse.json({ error: 'Fee item not found' }, { status: 404 });
    }

    if (name !== feeItemToUpdate.name || academicYearId.toString() !== (feeItemToUpdate.academicYearId as mongoose.Types.ObjectId).toString()) {
        const existingFeeItem = await FeeItem.findOne({ name, academicYearId: new mongoose.Types.ObjectId(academicYearId), _id: { $ne: feeItemId } });
        if (existingFeeItem) {
          return NextResponse.json({ error: 'Another fee item with this name already exists for the selected academic year.' }, { status: 409 });
        }
    }
    
    feeItemToUpdate.name = name;
    feeItemToUpdate.description = description || undefined;
    feeItemToUpdate.amount = Number(amount);
    feeItemToUpdate.currency = currency || feeItemToUpdate.currency;
    feeItemToUpdate.academicYearId = new mongoose.Types.ObjectId(academicYearId);
    feeItemToUpdate.termId = termId ? new mongoose.Types.ObjectId(termId) : undefined;
    feeItemToUpdate.appliesToLevels = appliesToLevels || [];
    feeItemToUpdate.appliesToClasses = appliesToClasses ? appliesToClasses.map((id: string) => new mongoose.Types.ObjectId(id)) : [];
    feeItemToUpdate.category = category || undefined;
    feeItemToUpdate.isMandatory = isMandatory !== undefined ? isMandatory : feeItemToUpdate.isMandatory;

    await feeItemToUpdate.save();
    const populatedFeeItem = await FeeItem.findById(feeItemToUpdate._id)
      .populate('academicYearId', 'name')
      .populate('termId', 'name')
      .populate('appliesToClasses', 'name level')
      .lean();
    return NextResponse.json(populatedFeeItem);
  } catch (error: any) {
    console.error(`Error updating fee item ${feeItemId} for ${schoolCode}:`, error);
    if (error.code === 11000) {
       return NextResponse.json({ error: 'Fee item name must be unique within an academic year.', details: String(error.message || '') }, { status: 409 });
    }
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((e: any) => String(e.message || 'Validation error')).join(', ');
      return NextResponse.json({ error: 'Validation Error', details: messages || 'Please check your input.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update fee item', details: String(error.message || 'Unknown error') }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { schoolCode: string; feeItemId: string } }
) {
  const { schoolCode, feeItemId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }
  
  if (!mongoose.Types.ObjectId.isValid(feeItemId)) {
    return NextResponse.json({ error: 'Invalid Fee Item ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const FeeItem = tenantDb.models.FeeItem as mongoose.Model<IFeeItem>;

    // TODO: Add check if fee item is in use (e.g., in student invoices) before deleting
    const result = await FeeItem.deleteOne({ _id: feeItemId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Fee item not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Fee item deleted successfully' });
  } catch (error: any) {
    console.error(`Error deleting fee item ${feeItemId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to delete fee item', details: String(error.message || 'Unknown error') }, { status: 500 });
  }
}
