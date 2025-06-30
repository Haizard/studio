
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import InvoiceModel, { IInvoice, InvoiceStatus } from '@/models/Tenant/Invoice';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Invoice) tenantDb.model<IInvoice>('Invoice', InvoiceModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
}

export async function GET(request: Request, { params }: { params: { schoolCode: string; invoiceId: string } }) {
  const { schoolCode, invoiceId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !['admin', 'superadmin', 'finance'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
    return NextResponse.json({ error: 'Invalid Invoice ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Invoice = tenantDb.models.Invoice as mongoose.Model<IInvoice>;

    const invoice = await Invoice.findById(invoiceId)
      .populate<{ studentId: ITenantUser }>('studentId', 'firstName lastName username')
      .populate('academicYearId', 'name')
      .populate('termId', 'name')
      .populate('classId', 'name')
      .populate('items.feeItemId', 'name category')
      .lean();

    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    return NextResponse.json(invoice);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch invoice', details: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { schoolCode: string; invoiceId: string } }) {
  const { schoolCode, invoiceId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !['admin', 'superadmin', 'finance'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
    return NextResponse.json({ error: 'Invalid Invoice ID' }, { status: 400 });
  }

  try {
    const body: { status?: InvoiceStatus, notes?: string } = await request.json();
    const { status, notes } = body;

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Invoice = tenantDb.models.Invoice as mongoose.Model<IInvoice>;

    const invoiceToUpdate = await Invoice.findById(invoiceId);
    if (!invoiceToUpdate) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    
    if (status) invoiceToUpdate.status = status;
    if (notes) invoiceToUpdate.notes = notes;

    await invoiceToUpdate.save();

    return NextResponse.json(invoiceToUpdate.toObject());

  } catch (error: any) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ error: 'Failed to update invoice', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { schoolCode: string; invoiceId: string } }) {
    const { schoolCode, invoiceId } = params;
    const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !['admin', 'superadmin', 'finance'].includes(token.role as string)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
        return NextResponse.json({ error: 'Invalid Invoice ID' }, { status: 400 });
    }

    try {
        const tenantDb = await getTenantConnection(schoolCode);
        await ensureTenantModelsRegistered(tenantDb);
        const Invoice = tenantDb.models.Invoice as mongoose.Model<IInvoice>;
        
        const invoiceToCancel = await Invoice.findById(invoiceId);
        if (!invoiceToCancel) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

        if (invoiceToCancel.amountPaid > 0) {
            return NextResponse.json({ error: 'Cannot cancel an invoice that has partial or full payments.' }, { status: 400 });
        }
        
        invoiceToCancel.status = 'Cancelled';
        await invoiceToCancel.save();

        return NextResponse.json({ message: 'Invoice cancelled successfully.' });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to cancel invoice', details: error.message }, { status: 500 });
    }
}
