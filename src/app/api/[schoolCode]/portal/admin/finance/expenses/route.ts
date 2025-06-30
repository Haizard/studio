
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import ExpenseModel, { IExpense } from '@/models/Tenant/Expense';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Expense) tenantDb.model<IExpense>('Expense', ExpenseModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
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

    const query: any = {};
    if (category) query.category = category;
    if (startDateStr && endDateStr) {
        const startDate = new Date(startDateStr);
        startDate.setUTCHours(0,0,0,0);
        const endDate = new Date(endDateStr);
        endDate.setUTCHours(23,59,59,999);
        query.expenseDate = { $gte: startDate, $lte: endDate };
    }

    const expenses = await Expense.find(query)
      .populate<{ recordedById: ITenantUser }>('recordedById', 'username')
      .sort({ expenseDate: -1 })
      .lean();

    return NextResponse.json(expenses);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch expenses', details: String(error.message || 'Unknown server error') }, { status: 500 });
  }
}

export async function POST(
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

  try {
    const body = await request.json();
    const { category, description, amount, currency, expenseDate, receiptUrl } = body;

    if (!category || !description || amount === undefined || !expenseDate) {
      return NextResponse.json({ error: 'Missing required fields: category, description, amount, expenseDate.' }, { status: 400 });
    }
    
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Expense = tenantDb.models.Expense as mongoose.Model<IExpense>;

    const newExpense = new Expense({
      category,
      description,
      amount: Number(amount),
      currency: currency || 'TZS',
      expenseDate: new Date(expenseDate),
      receiptUrl,
      recordedById: new mongoose.Types.ObjectId(token.uid as string),
    });

    await newExpense.save();
    const populatedExpense = await Expense.findById(newExpense._id)
      .populate<{ recordedById: ITenantUser }>('recordedById', 'username')
      .lean();
      
    return NextResponse.json(populatedExpense, { status: 201 });
  } catch (error: any) {
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((e: any) => e.message).join(', ');
      return NextResponse.json({ error: 'Validation failed', details: messages }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create expense', details: String(error.message || 'Unknown server error') }, { status: 500 });
  }
}
