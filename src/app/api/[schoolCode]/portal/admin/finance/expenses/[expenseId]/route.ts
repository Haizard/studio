
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
  { params }: { params: { schoolCode: string; expenseId: string } }
) {
  const { schoolCode, expenseId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin' && token.role !== 'finance')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(expenseId)) {
    return NextResponse.json({ error: 'Invalid Expense ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Expense = tenantDb.models.Expense as mongoose.Model<IExpense>;

    const expense = await Expense.findById(expenseId)
      .populate<{ recordedById: ITenantUser }>('recordedById', 'username')
      .lean();
      
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    return NextResponse.json(expense);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch expense', details: String(error.message || 'Unknown server error') }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string; expenseId: string } }
) {
  const { schoolCode, expenseId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin' && token.role !== 'finance')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(expenseId)) {
    return NextResponse.json({ error: 'Invalid Expense ID' }, { status: 400 });
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

    const expenseToUpdate = await Expense.findById(expenseId);
    if (!expenseToUpdate) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    expenseToUpdate.category = category;
    expenseToUpdate.description = description;
    expenseToUpdate.amount = Number(amount);
    if (currency) expenseToUpdate.currency = currency;
    expenseToUpdate.expenseDate = new Date(expenseDate);
    expenseToUpdate.receiptUrl = receiptUrl || undefined;

    await expenseToUpdate.save();
    const populatedExpense = await Expense.findById(expenseToUpdate._id)
      .populate<{ recordedById: ITenantUser }>('recordedById', 'username')
      .lean();
      
    return NextResponse.json(populatedExpense);
  } catch (error: any) {
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((e: any) => e.message).join(', ');
      return NextResponse.json({ error: 'Validation failed', details: messages }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update expense', details: String(error.message || 'Unknown server error') }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { schoolCode: string; expenseId: string } }
) {
  const { schoolCode, expenseId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin' && token.role !== 'finance')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }
  
  if (!mongoose.Types.ObjectId.isValid(expenseId)) {
    return NextResponse.json({ error: 'Invalid Expense ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Expense = tenantDb.models.Expense as mongoose.Model<IExpense>;

    const result = await Expense.deleteOne({ _id: expenseId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete expense', details: String(error.message || 'Unknown server error') }, { status: 500 });
  }
}
