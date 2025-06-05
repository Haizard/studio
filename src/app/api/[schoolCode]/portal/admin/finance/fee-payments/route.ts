
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
  const studentId = searchParams.get('studentId');
  const feeItemId = searchParams.get('feeItemId');
  const academicYearId = searchParams.get('academicYearId');
  const termId = searchParams.get('termId');
  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const FeePayment = tenantDb.models.FeePayment as mongoose.Model<IFeePayment>;

    const query: any = {};
    if (studentId && mongoose.Types.ObjectId.isValid(studentId)) query.studentId = new mongoose.Types.ObjectId(studentId);
    if (feeItemId && mongoose.Types.ObjectId.isValid(feeItemId)) query.feeItemId = new mongoose.Types.ObjectId(feeItemId);
    if (academicYearId && mongoose.Types.ObjectId.isValid(academicYearId)) query.academicYearId = new mongoose.Types.ObjectId(academicYearId);
    if (termId && mongoose.Types.ObjectId.isValid(termId)) query.termId = new mongoose.Types.ObjectId(termId);
    if (startDateStr && endDateStr) {
        const startDate = new Date(startDateStr);
        startDate.setUTCHours(0,0,0,0);
        const endDate = new Date(endDateStr);
        endDate.setUTCHours(23,59,59,999);
        query.paymentDate = { $gte: startDate, $lte: endDate };
    }


    const payments = await FeePayment.find(query)
      .populate<{ studentId: ITenantUser }>('studentId', 'firstName lastName username')
      .populate<{ feeItemId: IFeeItem }>('feeItemId', 'name amount currency')
      .populate<{ academicYearId: IAcademicYear }>('academicYearId', 'name')
      .populate<{ termId?: ITerm }>('termId', 'name')
      .populate<{ recordedById: ITenantUser }>('recordedById', 'username')
      .sort({ paymentDate: -1 })
      .lean();

    return NextResponse.json(payments);
  } catch (error: any) {
    console.error(`Error fetching fee payments for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch fee payments', details: String(error.message || 'Unknown server error') }, { status: 500 });
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
    const { studentId, feeItemId, academicYearId, termId, amountPaid, paymentDate, paymentMethod, transactionReference, notes } = body;

    if (!studentId || !feeItemId || !academicYearId || amountPaid === undefined || !paymentDate || !paymentMethod) {
      return NextResponse.json({ error: 'Missing required fields: studentId, feeItemId, academicYearId, amountPaid, paymentDate, paymentMethod.' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(studentId) ||
        !mongoose.Types.ObjectId.isValid(feeItemId) ||
        !mongoose.Types.ObjectId.isValid(academicYearId) ||
        (termId && !mongoose.Types.ObjectId.isValid(termId))) {
        return NextResponse.json({ error: 'Invalid ID format for studentId, feeItemId, academicYearId, or termId.' }, { status: 400 });
    }
    if (typeof amountPaid !== 'number' || amountPaid <= 0) {
        return NextResponse.json({ error: 'Amount paid must be a positive number.' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const FeePayment = tenantDb.models.FeePayment as mongoose.Model<IFeePayment>;
    const FeeItem = tenantDb.models.FeeItem as mongoose.Model<IFeeItem>;
    const User = tenantDb.models.User as mongoose.Model<ITenantUser>;
    const AcademicYear = tenantDb.models.AcademicYear as mongoose.Model<IAcademicYear>;

    // Validate existence of related documents
    const [studentExists, feeItemExists, academicYearExists] = await Promise.all([
        User.countDocuments({ _id: studentId, role: 'student' }), // Ensure studentId is for a student role
        FeeItem.countDocuments({ _id: feeItemId }),
        AcademicYear.countDocuments({ _id: academicYearId }),
    ]);

    if (studentExists === 0) return NextResponse.json({ error: 'Student not found or invalid student ID.' }, { status: 404 });
    if (feeItemExists === 0) return NextResponse.json({ error: 'Fee item not found.' }, { status: 404 });
    if (academicYearExists === 0) return NextResponse.json({ error: 'Academic year not found.' }, { status: 404 });
    if (termId) {
        const Term = tenantDb.models.Term as mongoose.Model<ITerm>;
        const termExists = await Term.countDocuments({ _id: termId, academicYearId });
        if (termExists === 0) return NextResponse.json({ error: 'Term not found or does not belong to the specified academic year.' }, { status: 404 });
    }


    const newPayment = new FeePayment({
      studentId: new mongoose.Types.ObjectId(studentId),
      feeItemId: new mongoose.Types.ObjectId(feeItemId),
      academicYearId: new mongoose.Types.ObjectId(academicYearId),
      termId: termId ? new mongoose.Types.ObjectId(termId) : undefined,
      amountPaid: Number(amountPaid),
      paymentDate: new Date(paymentDate),
      paymentMethod,
      transactionReference: transactionReference || undefined,
      notes: notes || undefined,
      recordedById: new mongoose.Types.ObjectId(token.uid as string),
    });

    await newPayment.save();
    const populatedPayment = await FeePayment.findById(newPayment._id)
      .populate<{ studentId: ITenantUser }>('studentId', 'firstName lastName username')
      .populate<{ feeItemId: IFeeItem }>('feeItemId', 'name amount currency')
      .populate<{ academicYearId: IAcademicYear }>('academicYearId', 'name')
      .populate<{ termId?: ITerm }>('termId', 'name')
      .populate<{ recordedById: ITenantUser }>('recordedById', 'username')
      .lean();
      
    return NextResponse.json(populatedPayment, { status: 201 });
  } catch (error: any) {
    console.error(`Error creating fee payment for ${schoolCode}:`, error);
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((e: any) => String(e.message || 'Validation error')).join(', ');
      return NextResponse.json({ error: 'Validation Error', details: messages || 'Please check your input.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create fee payment', details: String(error.message || 'Unknown server error') }, { status: 500 });
  }
}
