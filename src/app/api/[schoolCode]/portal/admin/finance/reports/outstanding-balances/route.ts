
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import StudentModel, { IStudent } from '@/models/Tenant/Student';
import FeeItemModel, { IFeeItem } from '@/models/Tenant/FeeItem';
import FeePaymentModel, { IFeePayment } from '@/models/Tenant/FeePayment';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Student) tenantDb.model<IStudent>('Student', StudentModel.schema);
  if (!tenantDb.models.FeeItem) tenantDb.model<IFeeItem>('FeeItem', FeeItemModel.schema);
  if (!tenantDb.models.FeePayment) tenantDb.model<IFeePayment>('FeePayment', FeePaymentModel.schema);
  if (!tenantDb.models.AcademicYear) tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
}

interface StudentBalance {
  studentId: string;
  studentName: string;
  studentIdNumber?: string;
  className?: string;
  classLevel?: string;
  totalFeesDue: number;
  totalFeesPaid: number;
  outstandingBalance: number;
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
  const academicYearIdParam = searchParams.get('academicYearId');
  const classIdParam = searchParams.get('classId');
  const studentIdParam = searchParams.get('studentId'); // For a specific student's balance

  if (!academicYearIdParam || !mongoose.Types.ObjectId.isValid(academicYearIdParam)) {
    return NextResponse.json({ error: 'Valid Academic Year ID is required.' }, { status: 400 });
  }
  const academicYearId = new mongoose.Types.ObjectId(academicYearIdParam);

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);

    const Student = tenantDb.models.Student as mongoose.Model<IStudent>;
    const FeeItem = tenantDb.models.FeeItem as mongoose.Model<IFeeItem>;
    const FeePayment = tenantDb.models.FeePayment as mongoose.Model<IFeePayment>;

    // 1. Determine target students
    const studentQuery: any = { currentAcademicYearId: academicYearId, isActive: true };
    if (classIdParam && mongoose.Types.ObjectId.isValid(classIdParam)) {
      studentQuery.currentClassId = new mongoose.Types.ObjectId(classIdParam);
    }
    if (studentIdParam && mongoose.Types.ObjectId.isValid(studentIdParam)) {
      // If a specific studentId is provided, override other student filters
      // This assumes studentIdParam is the User ID.
      studentQuery.userId = new mongoose.Types.ObjectId(studentIdParam);
    }

    const students = await Student.find(studentQuery)
      .populate<{ userId: ITenantUser }>('userId', 'firstName lastName _id')
      .populate<{ currentClassId?: IClass }>('currentClassId', 'name level _id')
      .lean();

    if (students.length === 0) {
      return NextResponse.json([]); // No students match criteria
    }

    // 2. Fetch all potentially applicable fee items for the academic year
    const allFeeItemsForYear = await FeeItem.find({ academicYearId }).lean();

    const studentBalances: StudentBalance[] = [];

    for (const student of students) {
      if (!student.userId) continue; // Skip if student doesn't have a linked user account

      let totalFeesDue = 0;
      // Determine applicable fee items for this student
      const applicableFeeItems = allFeeItemsForYear.filter(item => {
        const appliesToAllLevels = !item.appliesToLevels || item.appliesToLevels.length === 0 || item.appliesToLevels.includes("All");
        const levelMatch = student.currentClassId?.level && item.appliesToLevels?.includes(student.currentClassId.level);
        
        const appliesToAllClasses = !item.appliesToClasses || item.appliesToClasses.length === 0;
        const classMatch = student.currentClassId?._id && item.appliesToClasses?.map(id => id.toString()).includes(student.currentClassId._id.toString());

        return (appliesToAllLevels || levelMatch) && (appliesToAllClasses || classMatch);
      });

      totalFeesDue = applicableFeeItems.reduce((sum, item) => sum + item.amount, 0);

      // 3. Fetch payments for this student for the academic year
      const payments = await FeePayment.find({
        studentId: student.userId._id, // Payments are linked to User ID
        academicYearId,
      }).lean();
      
      const totalFeesPaid = payments.reduce((sum, payment) => sum + payment.amountPaid, 0);
      const outstandingBalance = totalFeesDue - totalFeesPaid;

      studentBalances.push({
        studentId: student.userId._id.toString(), // Use User ID for consistency
        studentName: `${student.userId.firstName} ${student.userId.lastName}`,
        studentIdNumber: student.studentIdNumber,
        className: student.currentClassId?.name,
        classLevel: student.currentClassId?.level,
        totalFeesDue,
        totalFeesPaid,
        outstandingBalance,
      });
    }

    return NextResponse.json(studentBalances.sort((a,b) => a.studentName.localeCompare(b.studentName)));

  } catch (error: any) {
    console.error(`Error generating outstanding balances report for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to generate outstanding balances report', details: String(error.message || 'Unknown server error') }, { status: 500 });
  }
}
