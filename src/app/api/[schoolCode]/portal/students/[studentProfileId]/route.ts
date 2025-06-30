
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import StudentModel, { IStudent } from '@/models/Tenant/Student';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import AlevelCombinationModel, { IAlevelCombination } from '@/models/Tenant/AlevelCombination';
import SubjectModel, { ISubject } from '@/models/Tenant/Subject';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { logAudit, safeObject } from '@/lib/audit';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Student) tenantDb.model<IStudent>('Student', StudentModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
  if (!tenantDb.models.AcademicYear) tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
  if (!tenantDb.models.AlevelCombination) tenantDb.model<IAlevelCombination>('AlevelCombination', AlevelCombinationModel.schema);
  if (!tenantDb.models.Subject) tenantDb.model<ISubject>('Subject', SubjectModel.schema);
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string; studentProfileId: string } }
) {
  const { schoolCode, studentProfileId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(studentProfileId)) {
    return NextResponse.json({ error: 'Invalid Student Profile ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Student = tenantDb.models.Student as mongoose.Model<IStudent>;

    const student = await Student.findById(studentProfileId)
      .populate<{ userId: ITenantUser }>('userId', 'firstName lastName username email isActive role')
      .populate<{ currentClassId: IClass }>('currentClassId', 'name level')
      .populate<{ currentAcademicYearId: IAcademicYear }>('currentAcademicYearId', 'name')
      .populate<{ alevelCombinationId: IAlevelCombination }>('alevelCombinationId', 'name code')
      .populate<{ oLevelOptionalSubjects: ISubject[] }>('oLevelOptionalSubjects', 'name code')
      .lean();
      
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    if (student.userId && typeof student.userId === 'object' && (student.userId as any).passwordHash) {
        // @ts-ignore
        delete (student.userId as any).passwordHash;
    }


    return NextResponse.json(student);
  } catch (error: any) {
    console.error(`Error fetching student ${studentProfileId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch student', details: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string; studentProfileId: string } }
) {
  const { schoolCode, studentProfileId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(studentProfileId)) {
    return NextResponse.json({ error: 'Invalid Student Profile ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { 
        userId, 
        firstName, lastName, username, email, password, 
        studentIdNumber, admissionDate, dateOfBirth, gender, 
        currentClassId, currentAcademicYearId, 
        isActive 
    } = body;

    if (!userId || !firstName || !lastName || !username || !email || !studentIdNumber || !admissionDate || !dateOfBirth || !gender || !currentAcademicYearId) {
        return NextResponse.json({ error: 'Missing required fields for student update.' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Student = tenantDb.models.Student as mongoose.Model<IStudent>;
    const User = tenantDb.models.User as mongoose.Model<ITenantUser>;

    const studentProfile = await Student.findById(studentProfileId);
    if (!studentProfile || studentProfile.userId.toString() !== userId) {
        return NextResponse.json({ error: 'Student profile not found or mismatched user ID.' }, { status: 404 });
    }

    const userAccount = await User.findById(userId);
    if (!userAccount) {
        return NextResponse.json({ error: 'Associated user account not found.' }, { status: 404 });
    }

    const originalStudent = studentProfile.toObject();
    const originalUser = userAccount.toObject();

    userAccount.firstName = firstName;
    userAccount.lastName = lastName;
    if (username.toLowerCase() !== userAccount.username) {
        const existingUserByUsername = await User.findOne({ username: username.toLowerCase(), _id: { $ne: userId } });
        if (existingUserByUsername) return NextResponse.json({ error: 'Username already taken.' }, { status: 409 });
        userAccount.username = username.toLowerCase();
    }
    if (email.toLowerCase() !== userAccount.email) {
        const existingUserByEmail = await User.findOne({ email: email.toLowerCase(), _id: { $ne: userId } });
        if (existingUserByEmail) return NextResponse.json({ error: 'Email already taken.' }, { status: 409 });
        userAccount.email = email.toLowerCase();
    }
    if (password) {
        userAccount.passwordHash = await bcrypt.hash(password, 10);
    }
    userAccount.isActive = isActive !== undefined ? isActive : userAccount.isActive;
    await userAccount.save();

    if (studentIdNumber !== studentProfile.studentIdNumber) {
         const existingStudentById = await Student.findOne({ studentIdNumber, _id: { $ne: studentProfileId } });
        if (existingStudentById) return NextResponse.json({ error: 'Student ID Number already in use.' }, { status: 409 });
        studentProfile.studentIdNumber = studentIdNumber;
    }
    studentProfile.admissionDate = new Date(admissionDate);
    studentProfile.dateOfBirth = new Date(dateOfBirth);
    studentProfile.gender = gender;
    studentProfile.currentClassId = currentClassId || undefined;
    studentProfile.currentAcademicYearId = currentAcademicYearId;
    studentProfile.isActive = isActive !== undefined ? isActive : studentProfile.isActive;
    await studentProfile.save();

    await logAudit(schoolCode, {
      userId: token.uid,
      username: token.email,
      action: 'UPDATE',
      entity: 'Student',
      entityId: studentProfile._id.toString(),
      details: `Updated student: ${userAccount.firstName} ${userAccount.lastName}`,
      originalValues: { student: safeObject(originalStudent), user: safeObject(originalUser) },
      newValues: { student: safeObject(studentProfile.toObject()), user: safeObject(userAccount.toObject()) },
      req: request as any,
    });


    const updatedStudent = await Student.findById(studentProfileId)
        .populate<{ userId: ITenantUser }>('userId', 'firstName lastName username email isActive role')
        .populate<{ currentClassId: IClass }>('currentClassId', 'name level')
        .populate<{ currentAcademicYearId: IAcademicYear }>('currentAcademicYearId', 'name')
        .lean();
    
    if (updatedStudent && updatedStudent.userId && typeof updatedStudent.userId === 'object' && (updatedStudent.userId as any).passwordHash) {
        // @ts-ignore
        delete (updatedStudent.userId as any).passwordHash;
    }

    return NextResponse.json(updatedStudent);

  } catch (error: any) {
    console.error(`Error updating student ${studentProfileId} for ${schoolCode}:`, error);
    if (error.code === 11000) {
        return NextResponse.json({ error: 'A unique field (e.g., username, email, student ID) already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update student', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { schoolCode: string; studentProfileId: string } }
) {
  const { schoolCode, studentProfileId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(studentProfileId)) {
    return NextResponse.json({ error: 'Invalid Student Profile ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Student = tenantDb.models.Student as mongoose.Model<IStudent>;
    const User = tenantDb.models.User as mongoose.Model<ITenantUser>;

    const studentProfile = await Student.findById(studentProfileId);
    if (!studentProfile) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    const userAccount = await User.findById(studentProfile.userId);
    const wasActive = userAccount?.isActive;
    const newStatus = !wasActive;

    studentProfile.isActive = newStatus;
    await studentProfile.save();

    if (userAccount) {
      userAccount.isActive = newStatus;
      await userAccount.save();
    }
    
    await logAudit(schoolCode, {
      userId: token.uid,
      username: token.email,
      action: 'UPDATE',
      entity: 'Student',
      entityId: studentProfile._id.toString(),
      details: `${newStatus ? 'Activated' : 'Deactivated'} student: ${userAccount?.firstName} ${userAccount?.lastName}`,
      newValues: { isActive: newStatus },
      req: request as any,
    });


    return NextResponse.json({ message: `Student ${newStatus ? 'activated' : 'deactivated'} successfully` });
  } catch (error: any) {
    console.error(`Error deactivating student ${studentProfileId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to deactivate student', details: error.message }, { status: 500 });
  }
}
