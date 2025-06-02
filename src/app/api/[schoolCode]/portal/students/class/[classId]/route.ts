
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import StudentModel, { IStudent } from '@/models/Tenant/Student';
import TenantUserModel, { ITenantUser } from '@/models/Tenant/User'; // For populating user details
import ClassModel, { IClass } from '@/models/Tenant/Class';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Student) tenantDb.model<IStudent>('Student', StudentModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserModel.schema);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string; classId: string } }
) {
  const { schoolCode, classId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['teacher', 'admin', 'superadmin'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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

    const targetClass = await Class.findById(classId).lean();
    if (!targetClass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Find students who are in the currentClassId and currentAcademicYearId (from the class object)
    // This assumes Student model's currentClassId and currentAcademicYearId are kept up-to-date.
    const students = await Student.find({ 
        currentClassId: classId,
        currentAcademicYearId: targetClass.academicYearId, // Use the academic year of the class
        isActive: true 
    })
    .populate<{ userId: ITenantUser }>({
        path: 'userId',
        select: 'firstName lastName username email profilePictureUrl', // Select fields from TenantUser
    })
    .sort({ 'userId.lastName': 1, 'userId.firstName': 1 }) // Sort by student name
    .lean();

    // We need to return a structure that's easy for the marks entry table,
    // often the ITenantUser directly, or a projection of it plus student-specific details.
    // For now, returning the populated student records. The frontend will map over `student.userId`.
    return NextResponse.json(students);

  } catch (error: any) {
    console.error(`Error fetching students for class ${classId}, school ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch students', details: error.message }, { status: 500 });
  }
}
