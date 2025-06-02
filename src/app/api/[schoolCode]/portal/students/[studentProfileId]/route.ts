
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import StudentModel, { IStudent } from '@/models/Tenant/Student';
import TenantUserModel, { ITenantUser } from '@/models/Tenant/User';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import AlevelCombinationModel, { IAlevelCombination } from '@/models/Tenant/AlevelCombination';
import SubjectModel, { ISubject } from '@/models/Tenant/Subject';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Student) tenantDb.model<IStudent>('Student', StudentModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserModel.schema);
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
    // @ts-ignore
    if (student.userId && student.userId.passwordHash) delete student.userId.passwordHash;

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
        userId, // This is the TenantUser._id
        firstName, lastName, username, email, password, // User fields
        studentIdNumber, admissionDate, dateOfBirth, gender, // Student profile fields
        currentClassId, currentAcademicYearId, // Academic fields
        // alevelCombinationId, oLevelOptionalSubjects, // TODO: Handle these if included in form
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

    // Update User Account
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

    // Update Student Profile
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
    // studentProfile.alevelCombinationId = alevelCombinationId || undefined;
    // studentProfile.oLevelOptionalSubjects = oLevelOptionalSubjects || [];
    studentProfile.isActive = isActive !== undefined ? isActive : studentProfile.isActive;
    await studentProfile.save();

    const updatedStudent = await Student.findById(studentProfileId)
        .populate<{ userId: ITenantUser }>('userId', 'firstName lastName username email isActive role')
        .populate<{ currentClassId: IClass }>('currentClassId', 'name level')
        .populate<{ currentAcademicYearId: IAcademicYear }>('currentAcademicYearId', 'name')
        .lean();
    
    // @ts-ignore
    if (updatedStudent.userId && updatedStudent.userId.passwordHash) delete updatedStudent.userId.passwordHash;

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

    // Soft delete: Deactivate the student and their user account
    studentProfile.isActive = false;
    await studentProfile.save();

    const userAccount = await User.findById(studentProfile.userId);
    if (userAccount) {
      userAccount.isActive = false;
      await userAccount.save();
    }

    // TODO: Consider implications: what happens to marks, enrollments etc.? 
    // For now, this is a soft delete. Hard deletion would require more cascading logic.

    return NextResponse.json({ message: 'Student deactivated successfully' });
  } catch (error: any) {
    console.error(`Error deactivating student ${studentProfileId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to deactivate student', details: error.message }, { status: 500 });
  }
}
