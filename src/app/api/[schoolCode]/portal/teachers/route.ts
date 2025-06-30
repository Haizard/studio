
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import TeacherModel, { ITeacher } from '@/models/Tenant/Teacher';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import SubjectModel, { ISubject } from '@/models/Tenant/Subject';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import { getToken } from 'next-auth/jwt';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
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
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Teacher = tenantDb.models.Teacher as mongoose.Model<ITeacher>;

    const teachers = await Teacher.find({})
      .populate<{ userId: ITenantUser }>('userId', 'firstName lastName username email isActive')
      .populate<{ isClassTeacherOf: IClass }>('isClassTeacherOf', 'name level')
      .sort({ 'userId.lastName': 1, 'userId.firstName': 1 })
      .lean();
    
    const sanitizedTeachers = teachers.map(teacher => {
      if (teacher.userId && (teacher.userId as any).passwordHash) {
        delete (teacher.userId as any).passwordHash;
      }
      return teacher;
    });

    return NextResponse.json(sanitizedTeachers);
  } catch (error: any) {
    console.error(`Error fetching teachers for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch teachers', details: String(error.message || 'Unknown server error') }, { status: 500 });
  }
}

export async function POST(
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

  try {
    const body = await request.json();
    const { 
        firstName, lastName, username, email, password, // User fields
        teacherIdNumber, qualifications, dateOfJoining, specialization, // Teacher profile fields
        isActive 
    } = body;

    if (!firstName || !lastName || !username || !email || !password || !dateOfJoining) {
        return NextResponse.json({ error: 'Missing required fields for teacher creation.' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Teacher = tenantDb.models.Teacher as mongoose.Model<ITeacher>;
    const User = tenantDb.models.User as mongoose.Model<ITenantUser>;

    const existingUser = await User.findOne({ $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }] });
    if (existingUser) {
        return NextResponse.json({ error: 'Username or email already taken.' }, { status: 409 });
    }
    if (teacherIdNumber) {
        const existingTeacherById = await Teacher.findOne({ teacherIdNumber });
        if (existingTeacherById) {
            return NextResponse.json({ error: 'Teacher ID Number already in use.' }, { status: 409 });
        }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = new User({
        username: username.toLowerCase(),
        passwordHash,
        role: 'teacher',
        email: email.toLowerCase(),
        firstName,
        lastName,
        isActive: isActive !== undefined ? isActive : true,
    });
    await newUser.save();

    const newTeacher = new Teacher({
        userId: newUser._id,
        teacherIdNumber,
        qualifications: qualifications || [],
        dateOfJoining: new Date(dateOfJoining),
        specialization,
        assignedClassesAndSubjects: body.assignedClassesAndSubjects || [], 
        isClassTeacherOf: body.isClassTeacherOf || undefined,
        isActive: isActive !== undefined ? isActive : true,
    });
    await newTeacher.save();

    const populatedTeacher = await Teacher.findById(newTeacher._id)
        .populate<{ userId: ITenantUser }>('userId', 'firstName lastName username email isActive')
        .lean();
    
    if (populatedTeacher && populatedTeacher.userId && (populatedTeacher.userId as any).passwordHash) {
      delete (populatedTeacher.userId as any).passwordHash;
    }

    await logAudit(schoolCode, {
      userId: token.uid,
      username: token.email,
      action: 'CREATE',
      entity: 'Teacher',
      entityId: newTeacher._id.toString(),
      details: `Created new teacher: ${newUser.firstName} ${newUser.lastName} (${newUser.username})`,
      newValues: safeObject(populatedTeacher),
      req: request as any,
    });

    return NextResponse.json(populatedTeacher, { status: 201 });

  } catch (error: any) {
    console.error(`Error creating teacher for ${schoolCode}:`, error);
    if (error.code === 11000) {
        return NextResponse.json({ error: 'A unique field (e.g., username, email, teacher ID) already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create teacher', details: String(error.message || 'Unknown server error') }, { status: 500 });
  }
}
