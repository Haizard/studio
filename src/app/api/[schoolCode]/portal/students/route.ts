
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import StudentModel, { IStudent } from '@/models/Tenant/Student';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import { getToken } from 'next-auth/jwt';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Student) tenantDb.model<IStudent>('Student', StudentModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
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
    const Student = tenantDb.models.Student as mongoose.Model<IStudent>;

    const students = await Student.find({})
      .populate<{ userId: ITenantUser | null }>('userId', 'firstName lastName username email isActive')
      .populate<{ currentClassId: IClass | null }>('currentClassId', 'name level')
      .populate<{ currentAcademicYearId: IAcademicYear | null }>('currentAcademicYearId', 'name')
      .sort({ 'userId.lastName': 1, 'userId.firstName': 1 })
      .lean();
    
    const sanitizedStudents = students.map(student => {
      if (student.userId && typeof student.userId === 'object' && (student.userId as any).passwordHash) {
        // @ts-ignore
        delete (student.userId as any).passwordHash;
      }
      return student;
    });

    return NextResponse.json(sanitizedStudents);
  } catch (error: any) {
    console.error(`Error fetching students for ${schoolCode}:`, error.message, error.stack);
    return NextResponse.json({ error: 'Failed to fetch students', details: String(error.message || 'Unknown server error') }, { status: 500 });
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
        firstName, lastName, username, email, password, 
        studentIdNumber, admissionDate, dateOfBirth, gender, 
        currentClassId, currentAcademicYearId, 
        isActive 
    } = body;

    if (!firstName || !lastName || !username || !email || !password || !studentIdNumber || !admissionDate || !dateOfBirth || !gender || !currentAcademicYearId) {
        return NextResponse.json({ error: 'Missing required fields for student creation.' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Student = tenantDb.models.Student as mongoose.Model<IStudent>;
    const User = tenantDb.models.User as mongoose.Model<ITenantUser>;

    const existingUser = await User.findOne({ $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }] });
    if (existingUser) {
        return NextResponse.json({ error: 'Username or email already taken.' }, { status: 409 });
    }
    const existingStudentById = await Student.findOne({ studentIdNumber });
    if (existingStudentById) {
        return NextResponse.json({ error: 'Student ID Number already in use.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = new User({
        username: username.toLowerCase(),
        passwordHash,
        role: 'student',
        email: email.toLowerCase(),
        firstName,
        lastName,
        isActive: isActive !== undefined ? isActive : true,
    });
    await newUser.save();

    const newStudent = new Student({
        userId: newUser._id,
        studentIdNumber,
        admissionDate: new Date(admissionDate),
        dateOfBirth: new Date(dateOfBirth),
        gender,
        currentClassId: currentClassId || undefined,
        currentAcademicYearId,
        isActive: isActive !== undefined ? isActive : true,
    });
    await newStudent.save();

    const populatedStudent = await Student.findById(newStudent._id)
        .populate<{ userId: ITenantUser | null }>('userId', 'firstName lastName username email isActive')
        .populate<{ currentClassId: IClass | null }>('currentClassId', 'name level')
        .populate<{ currentAcademicYearId: IAcademicYear | null }>('currentAcademicYearId', 'name')
        .lean();
    
    if (populatedStudent && populatedStudent.userId && typeof populatedStudent.userId === 'object' && (populatedStudent.userId as any).passwordHash) {
      delete (populatedStudent.userId as any).passwordHash;
    }

    return NextResponse.json(populatedStudent, { status: 201 });

  } catch (error: any) {
    console.error(`Error creating student for ${schoolCode}:`, error.message, error.stack);
    if (error.code === 11000) { 
        return NextResponse.json({ error: 'A unique field (e.g., username, email, student ID) already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create student', details: String(error.message || 'Unknown server error') }, { status: 500 });
  }
}
