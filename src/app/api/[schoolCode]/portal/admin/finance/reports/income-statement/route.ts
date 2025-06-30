
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import FeePaymentModel, { IFeePayment } from '@/models/Tenant/FeePayment';
import ExpenseModel, { IExpense } from '@/models/Tenant/Expense';
import FeeItemModel, { IFeeItem } from '@/models/Tenant/FeeItem';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.FeePayment) tenantDb.model<IFeePayment>('FeePayment', FeePaymentModel.schema);
  if (!tenantDb.models.Expense) tenantDb.model<IExpense>('Expense', ExpenseModel.schema);
  if (!tenantDb.models.FeeItem) tenantDb.model<IFeeItem>('FeeItem', FeeItemModel.schema);
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin', 'finance'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');

  if (!startDateStr || !endDateStr) {
    return NextResponse.json({ error: 'Start Date and End Date are required.' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const FeePayment = tenantDb.models.FeePayment as mongoose.Model<IFeePayment>;
    const Expense = tenantDb.models.Expense as mongoose.Model<IExpense>;

    const startDate = new Date(startDateStr);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(endDateStr);
    endDate.setUTCHours(23, 59, 59, 999);

    // Aggregate Income
    const incomeAggregation = await FeePayment.aggregate([
      { $match: { paymentDate: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: '$amountPaid' },
        }
      }
    ]);

    // Aggregate Expenses
    const expenseAggregation = await Expense.aggregate([
      { $match: { expenseDate: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amount' },
        }
      }
    ]);
    
    const totalIncome = incomeAggregation.length > 0 ? incomeAggregation[0].totalIncome : 0;
    const totalExpenses = expenseAggregation.length > 0 ? expenseAggregation[0].totalExpenses : 0;
    const netResult = totalIncome - totalExpenses;

    return NextResponse.json({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalIncome,
      totalExpenses,
      netResult,
    });
    
  } catch (error: any) {
    console.error(`Error generating income statement for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to generate income statement', details: String(error.message) }, { status: 500 });
  }
}
