
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import StudentModel, { IStudent } from '@/models/Tenant/Student';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User'; 
import ClassModel, { IClass } from '@/models/Tenant/Class';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Student) tenantDb.model<IStudent>('Student', StudentModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
  if (!tenantDb.models.AcademicYear) tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string; classId: string } }
) {
  const { schoolCode, classId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  // Allow teachers, admins, and superadmins to fetch students for a class
  if (!token || !['teacher', 'admin', 'superadmin'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
  }
   if ((token.role === 'teacher' || token.role === 'admin') && token.schoolCode !== schoolCode) {
      return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(classId)) {
    return NextResponse.json({ error: 'Invalid Class ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Student = tenantDb.models.Student as mongoose.Model<IStudent>;
    const Class = tenantDb.models.Class as mongoose.Model<IClass>;

    const targetClass = await Class.findById(classId).populate('academicYearId', 'name').lean();
    if (!targetClass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    if (!targetClass.academicYearId) {
        return NextResponse.json({ error: 'Class is not associated with an academic year.' }, {status: 400});
    }
    const classAcademicYearId = (targetClass.academicYearId as IAcademicYear)._id;

    const students = await Student.find({ 
        currentClassId: classId,
        currentAcademicYearId: classAcademicYearId, 
        isActive: true 
    })
    .populate<{ userId: ITenantUser }>({
        path: 'userId',
        model: 'User', // Explicit model name
        select: 'firstName lastName username email profilePictureUrl', 
    })
    .sort({ 'userId.lastName': 1, 'userId.firstName': 1 }) 
    .lean();

    return NextResponse.json(students);

  } catch (error: any) {
    console.error(`Error fetching students for class ${classId}, school ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch students', details: error.message }, { status: 500 });
  }
}

    