
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import FeePaymentModel, { IFeePayment } from '@/models/Tenant/FeePayment';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import FeeItemModel, { IFeeItem } from '@/models/Tenant/FeeItem';
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
  const academicYearId = searchParams.get('academicYearId');
  const termId = searchParams.get('termId');
  const feeItemId = searchParams.get('feeItemId');
  const paymentMethod = searchParams.get('paymentMethod');
  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const FeePayment = tenantDb.models.FeePayment as mongoose.Model<IFeePayment>;

    const matchStage: any = {};
    if (academicYearId && mongoose.Types.ObjectId.isValid(academicYearId)) matchStage.academicYearId = new mongoose.Types.ObjectId(academicYearId);
    if (termId && mongoose.Types.ObjectId.isValid(termId)) matchStage.termId = new mongoose.Types.ObjectId(termId);
    if (feeItemId && mongoose.Types.ObjectId.isValid(feeItemId)) matchStage.feeItemId = new mongoose.Types.ObjectId(feeItemId);
    if (paymentMethod) matchStage.paymentMethod = paymentMethod;
    if (startDateStr && endDateStr) {
      const startDate = new Date(startDateStr);
      startDate.setUTCHours(0, 0, 0, 0);
      const endDate = new Date(endDateStr);
      endDate.setUTCHours(23, 59, 59, 999);
      matchStage.paymentDate = { $gte: startDate, $lte: endDate };
    }

    const aggregation = await FeePayment.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'feeitems', // Mongoose default collection name for FeeItem model
          localField: 'feeItemId',
          foreignField: '_id',
          as: 'feeItemDetails'
        }
      },
      {
        $unwind: { path: '$feeItemDetails', preserveNullAndEmptyArrays: true }
      },
      {
        $group: {
          _id: null,
          totalCollected: { $sum: '$amountPaid' },
          totalTransactions: { $sum: 1 },
          breakdownByFeeItem: {
            $push: {
              feeItemId: '$feeItemId',
              feeItemName: '$feeItemDetails.name',
              amountPaid: '$amountPaid'
            }
          },
          breakdownByPaymentMethod: {
            $push: {
              paymentMethod: '$paymentMethod',
              amountPaid: '$amountPaid'
            }
          }
        }
      }
    ]);
    
    if (aggregation.length === 0) {
      return NextResponse.json({
        totalCollected: 0,
        totalTransactions: 0,
        breakdownByFeeItem: [],
        breakdownByPaymentMethod: []
      });
    }

    const result = aggregation[0];
    
    // Process breakdown by fee item
    const feeItemBreakdown = result.breakdownByFeeItem.reduce((acc: any, item: any) => {
      const key = item.feeItemName || 'Unknown';
      if (!acc[key]) {
        acc[key] = { feeItemName: key, totalAmount: 0, count: 0 };
      }
      acc[key].totalAmount += item.amountPaid;
      acc[key].count += 1;
      return acc;
    }, {});
    
    // Process breakdown by payment method
    const paymentMethodBreakdown = result.breakdownByPaymentMethod.reduce((acc: any, item: any) => {
      const key = item.paymentMethod;
      if (!acc[key]) {
        acc[key] = { paymentMethod: key, totalAmount: 0, count: 0 };
      }
      acc[key].totalAmount += item.amountPaid;
      acc[key].count += 1;
      return acc;
    }, {});

    return NextResponse.json({
      totalCollected: result.totalCollected,
      totalTransactions: result.totalTransactions,
      breakdownByFeeItem: Object.values(feeItemBreakdown).sort((a: any, b: any) => b.totalAmount - a.totalAmount),
      breakdownByPaymentMethod: Object.values(paymentMethodBreakdown).sort((a: any, b: any) => b.totalAmount - a.totalAmount)
    });
    
  } catch (error: any) {
    console.error(`Error generating fee collection summary for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to generate fee collection summary', details: String(error.message || 'Unknown server error') }, { status: 500 });
  }
}
