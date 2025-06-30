
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import StudentModel, { IStudent } from '@/models/Tenant/Student';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Student) tenantDb.model<IStudent>('Student', StudentModel.schema);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
}

export async function POST(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { studentProfileIds, targetClassId } = body;

    if (!Array.isArray(studentProfileIds) || studentProfileIds.length === 0 || !targetClassId) {
      return NextResponse.json({ error: 'Missing required fields: studentProfileIds array and targetClassId.' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(targetClassId)) {
      return NextResponse.json({ error: 'Invalid Target Class ID format.' }, { status: 400 });
    }
    for (const id of studentProfileIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: `Invalid Student Profile ID format in array: ${id}` }, { status: 400 });
      }
    }
    
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Student = tenantDb.models.Student as mongoose.Model<IStudent>;
    const Class = tenantDb.models.Class as mongoose.Model<IClass>;

    const targetClass = await Class.findById(targetClassId).lean();
    if (!targetClass) {
      return NextResponse.json({ error: 'Target class not found.' }, { status: 404 });
    }
    const targetAcademicYearId = targetClass.academicYearId;

    const updateResult = await Student.updateMany(
      { _id: { $in: studentProfileIds } },
      { 
        $set: { 
          currentClassId: targetClassId,
          currentAcademicYearId: targetAcademicYearId,
        }
      }
    );

    return NextResponse.json({
      message: `${updateResult.modifiedCount} students promoted successfully.`,
      ...updateResult,
    });

  } catch (error: any) {
    console.error(`Error processing promotions for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to process promotions', details: error.message }, { status: 500 });
  }
}
