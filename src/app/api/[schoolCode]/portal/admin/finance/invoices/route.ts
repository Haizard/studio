
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import InvoiceModel, { IInvoice } from '@/models/Tenant/Invoice';
import FeeItemModel, { IFeeItem } from '@/models/Tenant/FeeItem';
import StudentModel, { IStudent } from '@/models/Tenant/Student';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import TermModel, { ITerm } from '@/models/Tenant/Term';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Invoice) tenantDb.model<IInvoice>('Invoice', InvoiceModel.schema);
  if (!tenantDb.models.FeeItem) tenantDb.model<IFeeItem>('FeeItem', FeeItemModel.schema);
  if (!tenantDb.models.Student) tenantDb.model<IStudent>('Student', StudentModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
  if (!tenantDb.models.AcademicYear) tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
  if (!tenantDb.models.Term) tenantDb.model<ITerm>('Term', TermModel.schema);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
}

export async function GET(request: Request, { params }: { params: { schoolCode: string } }) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !['admin', 'superadmin', 'finance'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');
  const status = searchParams.get('status');
  
  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Invoice = tenantDb.models.Invoice as mongoose.Model<IInvoice>;

    const query: any = {};
    if (studentId && mongoose.Types.ObjectId.isValid(studentId)) query.studentId = studentId;
    if (status) query.status = status;

    const invoices = await Invoice.find(query)
      .populate<{ studentId: ITenantUser }>('studentId', 'firstName lastName username')
      .populate('academicYearId', 'name')
      .populate('termId', 'name')
      .sort({ issueDate: -1 })
      .lean();

    return NextResponse.json(invoices);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch invoices', details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { schoolCode: string } }) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !['admin', 'superadmin', 'finance'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { studentId, academicYearId, termId, issueDate, dueDate, notes } = body;

    if (!studentId || !academicYearId || !issueDate || !dueDate) {
      return NextResponse.json({ error: 'Missing required fields: studentId, academicYearId, issueDate, dueDate' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Invoice = tenantDb.models.Invoice as mongoose.Model<IInvoice>;
    const Student = tenantDb.models.Student as mongoose.Model<IStudent>;
    const FeeItem = tenantDb.models.FeeItem as mongoose.Model<IFeeItem>;

    const student = await Student.findOne({ userId: studentId }).populate('currentClassId').lean();
    if (!student || !student.currentClassId) return NextResponse.json({ error: 'Student or student\'s class not found.' }, { status: 404 });
    const studentClass = student.currentClassId as IClass;

    const feeItemsQuery: any = {
      academicYearId,
      isMandatory: true,
      $or: [
        { appliesToLevels: { $exists: false } },
        { appliesToLevels: { $size: 0 } },
        { appliesToLevels: "All" },
        { appliesToLevels: studentClass.level },
      ],
      $and: [
        { $or: [
            { appliesToClasses: { $exists: false } },
            { appliesToClasses: { $size: 0 } },
            { appliesToClasses: studentClass._id },
          ]
        }
      ]
    };
    if (termId) feeItemsQuery.termId = termId;
    
    const applicableFeeItems = await FeeItem.find(feeItemsQuery).lean();
    if (applicableFeeItems.length === 0) return NextResponse.json({ error: 'No applicable mandatory fee items found for this student to generate an invoice.' }, { status: 400 });

    const invoiceItems = applicableFeeItems.map(item => ({
      feeItemId: item._id,
      description: item.name,
      amount: item.amount,
    }));

    const totalAmount = invoiceItems.reduce((sum, item) => sum + item.amount, 0);

    const lastInvoice = await Invoice.findOne().sort({ createdAt: -1 });
    const lastInvoiceNumber = lastInvoice?.invoiceNumber ? parseInt(lastInvoice.invoiceNumber.split('-').pop() || '0') : 0;
    const newInvoiceNumber = `${schoolCode.toUpperCase()}-INV-${(lastInvoiceNumber + 1).toString().padStart(5, '0')}`;

    const newInvoice = new Invoice({
      invoiceNumber: newInvoiceNumber,
      studentId,
      academicYearId,
      termId: termId || undefined,
      classId: studentClass._id,
      items: invoiceItems,
      totalAmount,
      amountPaid: 0,
      outstandingBalance: totalAmount,
      issueDate: new Date(issueDate),
      dueDate: new Date(dueDate),
      status: 'Unpaid',
      notes,
    });

    await newInvoice.save();

    const populatedInvoice = await Invoice.findById(newInvoice._id)
      .populate<{ studentId: ITenantUser }>('studentId', 'firstName lastName username')
      .populate('items.feeItemId', 'name')
      .lean();

    return NextResponse.json(populatedInvoice, { status: 201 });
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Failed to create invoice', details: error.message }, { status: 500 });
  }
}
