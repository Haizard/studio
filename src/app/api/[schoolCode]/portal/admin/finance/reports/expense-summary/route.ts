
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import ExpenseModel, { IExpense } from '@/models/Tenant/Expense';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Expense) tenantDb.model<IExpense>('Expense', ExpenseModel.schema);
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin' && token.role !== 'finance')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Expense = tenantDb.models.Expense as mongoose.Model<IExpense>;

    const matchStage: any = {};
    if (category) matchStage.category = category;
    if (startDateStr && endDateStr) {
      const startDate = new Date(startDateStr);
      startDate.setUTCHours(0, 0, 0, 0);
      const endDate = new Date(endDateStr);
      endDate.setUTCHours(23, 59, 59, 999);
      matchStage.expenseDate = { $gte: startDate, $lte: endDate };
    }

    const aggregation = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          breakdownByCategory: {
            $push: {
              category: '$category',
              amount: '$amount'
            }
          }
        }
      }
    ]);

    if (aggregation.length === 0) {
      return NextResponse.json({
        totalExpenses: 0,
        totalTransactions: 0,
        breakdownByCategory: []
      });
    }

    const result = aggregation[0];
    
    // Process breakdown by category
    const categoryBreakdown = result.breakdownByCategory.reduce((acc: any, item: any) => {
      const key = item.category || 'Uncategorized';
      if (!acc[key]) {
        acc[key] = { category: key, totalAmount: 0, count: 0 };
      }
      acc[key].totalAmount += item.amount;
      acc[key].count += 1;
      return acc;
    }, {});
    
    return NextResponse.json({
      totalExpenses: result.totalExpenses,
      totalTransactions: result.totalTransactions,
      breakdownByCategory: Object.values(categoryBreakdown).sort((a: any, b: any) => b.totalAmount - a.totalAmount),
    });
    
  } catch (error: any) {
    console.error(`Error generating expense summary for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to generate expense summary', details: String(error.message || 'Unknown server error') }, { status: 500 });
  }
}
