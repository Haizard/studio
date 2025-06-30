
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import TeacherModel, { ITeacher } from '@/models/Tenant/Teacher';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import SubjectModel, { ISubject } from '@/models/Tenant/Subject';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { logAudit, safeObject } from '@/lib/audit';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Teacher) tenantDb.model<ITeacher>('Teacher', TeacherModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
  if (!tenantDb.models.Subject) tenantDb.model<ISubject>('Subject', SubjectModel.schema);
  if (!tenantDb.models.AcademicYear) tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string; teacherProfileId: string } }
) {
  const { schoolCode, teacherProfileId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(teacherProfileId)) {
    return NextResponse.json({ error: 'Invalid Teacher Profile ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Teacher = tenantDb.models.Teacher as mongoose.Model<ITeacher>;

    const teacher = await Teacher.findById(teacherProfileId)
      .populate<{ userId: ITenantUser }>('userId', 'firstName lastName username email isActive role')
      .populate<{ isClassTeacherOf: IClass }>('isClassTeacherOf', 'name level')
      .populate({
        path: 'assignedClassesAndSubjects.classId',
        model: 'Class',
        select: 'name level'
      })
      .populate({
        path: 'assignedClassesAndSubjects.subjectId',
        model: 'Subject',
        select: 'name code'
      })
      .populate({
        path: 'assignedClassesAndSubjects.academicYearId',
        model: 'AcademicYear',
        select: 'name'
      })
      .lean();
      
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }
    if (teacher.userId && (teacher.userId as any).passwordHash) {
      delete (teacher.userId as any).passwordHash;
    }

    return NextResponse.json(teacher);
  } catch (error: any) {
    console.error(`[API GET /teachers/${teacherProfileId}] CRITICAL ERROR fetching teacher ${teacherProfileId} for ${schoolCode}:`, error.message);
    console.error(`[API GET /teachers/${teacherProfileId}] Full error stack:`, error.stack);
    return NextResponse.json({ error: 'Failed to fetch teacher', details: error.message, stack: error.stack }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string; teacherProfileId: string } }
) {
  const { schoolCode, teacherProfileId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(teacherProfileId)) {
    return NextResponse.json({ error: 'Invalid Teacher Profile ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { 
        userId, 
        firstName, lastName, username, email, password, 
        teacherIdNumber, qualifications, dateOfJoining, specialization, 
        assignedClassesAndSubjects, isClassTeacherOf,
        isActive 
    } = body;

    if (!userId || !firstName || !lastName || !username || !email || !dateOfJoining) {
        return NextResponse.json({ error: 'Missing required fields for teacher update.' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Teacher = tenantDb.models.Teacher as mongoose.Model<ITeacher>;
    const User = tenantDb.models.User as mongoose.Model<ITenantUser>;

    const teacherProfile = await Teacher.findById(teacherProfileId);
    if (!teacherProfile || teacherProfile.userId.toString() !== userId) {
        return NextResponse.json({ error: 'Teacher profile not found or mismatched user ID.' }, { status: 404 });
    }

    const userAccount = await User.findById(userId);
    if (!userAccount) {
        return NextResponse.json({ error: 'Associated user account not found.' }, { status: 404 });
    }
    
    const originalTeacher = teacherProfile.toObject();
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

    if (teacherIdNumber && teacherIdNumber !== teacherProfile.teacherIdNumber) {
         const existingTeacherById = await Teacher.findOne({ teacherIdNumber, _id: { $ne: teacherProfileId } });
        if (existingTeacherById) return NextResponse.json({ error: 'Teacher ID Number already in use.' }, { status: 409 });
        teacherProfile.teacherIdNumber = teacherIdNumber;
    } else if (!teacherIdNumber && teacherProfile.teacherIdNumber) {
        teacherProfile.teacherIdNumber = undefined;
    }

    teacherProfile.qualifications = qualifications || teacherProfile.qualifications;
    teacherProfile.dateOfJoining = new Date(dateOfJoining);
    teacherProfile.specialization = specialization || teacherProfile.specialization;
    teacherProfile.assignedClassesAndSubjects = assignedClassesAndSubjects || teacherProfile.assignedClassesAndSubjects;
    teacherProfile.isClassTeacherOf = isClassTeacherOf || undefined;
    teacherProfile.isActive = isActive !== undefined ? isActive : teacherProfile.isActive;
    await teacherProfile.save();

    await logAudit(schoolCode, {
      userId: token.uid,
      username: token.email,
      action: 'UPDATE',
      entity: 'Teacher',
      entityId: teacherProfile._id.toString(),
      details: `Updated teacher: ${userAccount.firstName} ${userAccount.lastName}`,
      originalValues: { teacher: safeObject(originalTeacher), user: safeObject(originalUser) },
      newValues: { teacher: safeObject(teacherProfile.toObject()), user: safeObject(userAccount.toObject()) },
      req: request as any,
    });

    const updatedTeacher = await Teacher.findById(teacherProfileId)
        .populate<{ userId: ITenantUser }>('userId', 'firstName lastName username email isActive role')
        .populate('isClassTeacherOf', 'name level')
        .populate({ path: 'assignedClassesAndSubjects.classId', model: 'Class', select: 'name level' })
        .populate({ path: 'assignedClassesAndSubjects.subjectId', model: 'Subject', select: 'name code' })
        .populate({ path: 'assignedClassesAndSubjects.academicYearId', model: 'AcademicYear', select: 'name' })
        .lean();
    
    if (updatedTeacher && updatedTeacher.userId && (updatedTeacher.userId as any).passwordHash) {
        delete (updatedTeacher.userId as any).passwordHash;
    }

    return NextResponse.json(updatedTeacher);

  } catch (error: any) {
    console.error(`Error updating teacher ${teacherProfileId} for ${schoolCode}:`, error);
    if (error.code === 11000) {
        return NextResponse.json({ error: 'A unique field (e.g., username, email, teacher ID) already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update teacher', details: error.message, stack: error.stack }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { schoolCode: string; teacherProfileId: string } }
) {
  const { schoolCode, teacherProfileId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(teacherProfileId)) {
    return NextResponse.json({ error: 'Invalid Teacher Profile ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Teacher = tenantDb.models.Teacher as mongoose.Model<ITeacher>;
    const User = tenantDb.models.User as mongoose.Model<ITenantUser>;

    const teacherProfile = await Teacher.findById(teacherProfileId);
    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }
    const userAccount = await User.findById(teacherProfile.userId);
    const wasActive = userAccount?.isActive;
    const newStatus = !wasActive;

    teacherProfile.isActive = newStatus;
    await teacherProfile.save();

    if (userAccount) {
      userAccount.isActive = newStatus;
      await userAccount.save();
    }
    
    await logAudit(schoolCode, {
      userId: token.uid,
      username: token.email,
      action: 'UPDATE',
      entity: 'Teacher',
      entityId: teacherProfile._id.toString(),
      details: `${newStatus ? 'Activated' : 'Deactivated'} teacher: ${userAccount?.firstName} ${userAccount?.lastName}`,
      newValues: { isActive: newStatus },
      req: request as any,
    });

    return NextResponse.json({ message: `Teacher ${newStatus ? 'activated' : 'deactivated'} successfully` });
  } catch (error: any) {
    console.error(`Error deactivating teacher ${teacherProfileId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to deactivate teacher', details: error.message, stack: error.stack }, { status: 500 });
  }
}
