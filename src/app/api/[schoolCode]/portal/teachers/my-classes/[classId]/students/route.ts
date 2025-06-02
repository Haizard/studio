
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import TeacherModel, { ITeacher } from '@/models/Tenant/Teacher';
import StudentModel, { IStudent } from '@/models/Tenant/Student';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import ClassModel, { IClass } from '@/models/Tenant/Class'; // Needed for class details
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Teacher) tenantDb.model<ITeacher>('Teacher', TeacherModel.schema);
  if (!tenantDb.models.Student) tenantDb.model<IStudent>('Student', StudentModel.schema);
  if (!tenantDb.models.AcademicYear) tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string; classId: string } }
) {
  const { schoolCode, classId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.role !== 'teacher' || token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(classId)) {
    return NextResponse.json({ error: 'Invalid Class ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);

    const Teacher = tenantDb.models.Teacher as mongoose.Model<ITeacher>;
    const Student = tenantDb.models.Student as mongoose.Model<IStudent>;
    const AcademicYear = tenantDb.models.AcademicYear as mongoose.Model<IAcademicYear>;

    // 1. Get current active academic year
    const activeAcademicYear = await AcademicYear.findOne({ isActive: true }).lean();
    if (!activeAcademicYear) {
      return NextResponse.json({ error: 'No active academic year found.' }, { status: 404 });
    }

    // 2. Verify teacher is assigned to this class in the active academic year
    const teacherProfile = await Teacher.findOne({ userId: token.uid }).lean();
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found.' }, { status: 404 });
    }

    const isAssignedToClass = (teacherProfile.assignedClassesAndSubjects || []).some(
      (assignment: any) =>
        assignment.classId.toString() === classId &&
        assignment.academicYearId.toString() === activeAcademicYear._id.toString()
    );

    if (!isAssignedToClass) {
      return NextResponse.json({ error: 'Teacher not assigned to this class for the current academic year.' }, { status: 403 });
    }

    // 3. Fetch students for the class in the active academic year
    const students = await Student.find({
      currentClassId: classId,
      currentAcademicYearId: activeAcademicYear._id,
      isActive: true, // Only active students
    })
    .populate<{ userId: ITenantUser }>({
        path: 'userId',
        model: 'User',
        select: 'firstName lastName username email gender profilePictureUrl' // Added gender
    })
    .sort({ 'userId.lastName': 1, 'userId.firstName': 1 })
    .lean();

    return NextResponse.json(students);

  } catch (error: any) {
    console.error(`Error fetching students for class ${classId} by teacher ${token.uid} in ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch students for class', details: error.message }, { status: 500 });
  }
}
    