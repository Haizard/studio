
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import FeePaymentModel, { IFeePayment } from '@/models/Tenant/FeePayment';
import FeeItemModel, { IFeeItem } from '@/models/Tenant/FeeItem';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import TermModel, { ITerm } from '@/models/Tenant/Term';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.FeePayment) tenantDb.model<IFeePayment>('FeePayment', FeePaymentModel.schema);
  if (!tenantDb.models.FeeItem) tenantDb.model<IFeeItem>('FeeItem', FeeItemModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
  if (!tenantDb.models.AcademicYear) tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
  if (!tenantDb.models.Term) tenantDb.model<ITerm>('Term', TermModel.schema);
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string; paymentId: string } }
) {
  const { schoolCode, paymentId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    return NextResponse.json({ error: 'Invalid Payment ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const FeePayment = tenantDb.models.FeePayment as mongoose.Model<IFeePayment>;

    const payment = await FeePayment.findById(paymentId)
      .populate<{ studentId: ITenantUser }>('studentId', 'firstName lastName username')
      .populate<{ feeItemId: IFeeItem }>('feeItemId', 'name amount currency')
      .populate<{ academicYearId: IAcademicYear }>('academicYearId', 'name')
      .populate<{ termId?: ITerm }>('termId', 'name')
      .populate<{ recordedById: ITenantUser }>('recordedById', 'username')
      .lean();
      
    if (!payment) {
      return NextResponse.json({ error: 'Fee payment not found' }, { status: 404 });
    }
    return NextResponse.json(payment);
  } catch (error: any) {
    console.error(`Error fetching fee payment ${paymentId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch fee payment', details: String(error.message || 'Unknown server error') }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string; paymentId: string } }
) {
  const { schoolCode, paymentId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

   if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    return NextResponse.json({ error: 'Invalid Payment ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    // StudentId, feeItemId, academicYearId, termId are generally not updatable for an existing payment.
    // If they need to be changed, it's better to delete and recreate the payment.
    const { amountPaid, paymentDate, paymentMethod, transactionReference, notes } = body;

    if (amountPaid === undefined && !paymentDate && !paymentMethod && !transactionReference && !notes) {
        return NextResponse.json({ error: 'No updatable fields provided.' }, { status: 400 });
    }
    if (amountPaid !== undefined && (typeof amountPaid !== 'number' || amountPaid <= 0)) {
        return NextResponse.json({ error: 'Amount paid must be a positive number if provided.' }, { status: 400 });
    }


    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const FeePayment = tenantDb.models.FeePayment as mongoose.Model<IFeePayment>;

    const paymentToUpdate = await FeePayment.findById(paymentId);
    if (!paymentToUpdate) {
      return NextResponse.json({ error: 'Fee payment not found' }, { status: 404 });
    }
    
    if (amountPaid !== undefined) paymentToUpdate.amountPaid = Number(amountPaid);
    if (paymentDate) paymentToUpdate.paymentDate = new Date(paymentDate);
    if (paymentMethod) paymentToUpdate.paymentMethod = paymentMethod;
    if (transactionReference !== undefined) paymentToUpdate.transactionReference = transactionReference || undefined;
    if (notes !== undefined) paymentToUpdate.notes = notes || undefined;
    // recordedById is not updated here, it remains the original recorder. Could add a lastUpdatedById if needed.

    await paymentToUpdate.save();
    const populatedPayment = await FeePayment.findById(paymentToUpdate._id)
      .populate<{ studentId: ITenantUser }>('studentId', 'firstName lastName username')
      .populate<{ feeItemId: IFeeItem }>('feeItemId', 'name amount currency')
      .populate<{ academicYearId: IAcademicYear }>('academicYearId', 'name')
      .populate<{ termId?: ITerm }>('termId', 'name')
      .populate<{ recordedById: ITenantUser }>('recordedById', 'username')
      .lean();
    return NextResponse.json(populatedPayment);
  } catch (error: any) {
    console.error(`Error updating fee payment ${paymentId} for ${schoolCode}:`, error);
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((e: any) => String(e.message || 'Validation error')).join(', ');
      return NextResponse.json({ error: 'Validation Error', details: messages || 'Please check your input.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update fee payment', details: String(error.message || 'Unknown server error') }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { schoolCode: string; paymentId: string } }
) {
  const { schoolCode, paymentId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }
  
  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    return NextResponse.json({ error: 'Invalid Payment ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const FeePayment = tenantDb.models.FeePayment as mongoose.Model<IFeePayment>;

    const result = await FeePayment.deleteOne({ _id: paymentId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Fee payment not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Fee payment deleted successfully' });
  } catch (error: any) {
    console.error(`Error deleting fee payment ${paymentId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to delete fee payment', details: String(error.message || 'Unknown server error') }, { status: 500 });
  }
}

