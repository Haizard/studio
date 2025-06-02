
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import TenantUserModel, { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import SubjectModel, { ISubject } from '@/models/Tenant/Subject';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Class) {
    tenantDb.model<IClass>('Class', ClassModel.schema);
  }
  if (!tenantDb.models.AcademicYear) {
    tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
  }
  if (!tenantDb.models.User) { // For Class Teacher
    tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
  }
   if (!tenantDb.models.Subject) { // For Subjects Offered
    tenantDb.model<ISubject>('Subject', SubjectModel.schema);
  }
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const { searchParams } = new URL(request.url);
  const academicYearId = searchParams.get('academicYearId');

  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized for this school or role' }, { status: 403 });
    }
  }
  
  if (!schoolCode) {
    return NextResponse.json({ error: 'School code is required' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Class = tenantDb.models.Class as mongoose.Model<IClass>;
    
    let query: any = {};
    if (academicYearId && mongoose.Types.ObjectId.isValid(academicYearId)) {
      query.academicYearId = academicYearId;
    }
    
    const classes = await Class.find(query)
      .populate<{ academicYearId: IAcademicYear }>('academicYearId', 'name')
      .populate<{ classTeacherId: ITenantUser }>('classTeacherId', 'firstName lastName username')
      .populate<{ subjectsOffered: ISubject[] }>('subjectsOffered', 'name code')
      .sort({ 'academicYearId.name': -1, name: 1 })
      .lean(); 

    return NextResponse.json(classes);
  } catch (error: any) {
    console.error(`Error fetching classes for ${schoolCode}:`, error);
    if (error.message.includes('School not found') || error.message.includes('MongoDB URI not configured')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to fetch classes', details: error.message }, { status: 500 });
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
        return NextResponse.json({ error: 'Unauthorized for this school or role' }, { status: 403 });
    }
  }

  if (!schoolCode) {
    return NextResponse.json({ error: 'School code is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, level, stream, classTeacherId, academicYearId, subjectsOffered, capacity } = body;

    if (!name || !level || !academicYearId) {
      return NextResponse.json({ error: 'Missing required fields: name, level, academicYearId' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(academicYearId)) {
        return NextResponse.json({ error: 'Invalid Academic Year ID format' }, { status: 400 });
    }
    if (classTeacherId && !mongoose.Types.ObjectId.isValid(classTeacherId)) {
        return NextResponse.json({ error: 'Invalid Class Teacher ID format' }, { status: 400 });
    }
    if (subjectsOffered && !Array.isArray(subjectsOffered)) {
        return NextResponse.json({ error: 'Subjects offered must be an array' }, { status: 400 });
    }
    if (subjectsOffered) {
        for (const subId of subjectsOffered) {
            if (!mongoose.Types.ObjectId.isValid(subId)) {
                 return NextResponse.json({ error: `Invalid Subject ID format in subjectsOffered: ${subId}` }, { status: 400 });
            }
        }
    }


    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Class = tenantDb.models.Class as mongoose.Model<IClass>;

    const existingClass = await Class.findOne({ name, academicYearId });
    if (existingClass) {
      return NextResponse.json({ error: 'A class with this name already exists for the selected academic year.' }, { status: 409 });
    }

    const newClass = new Class({
      name,
      level,
      stream,
      classTeacherId: classTeacherId || undefined,
      academicYearId,
      subjectsOffered: subjectsOffered || [],
      capacity: capacity || undefined,
    });

    await newClass.save();
    const populatedClass = await Class.findById(newClass._id)
      .populate<{ academicYearId: IAcademicYear }>('academicYearId', 'name')
      .populate<{ classTeacherId: ITenantUser }>('classTeacherId', 'firstName lastName username')
      .populate<{ subjectsOffered: ISubject[] }>('subjectsOffered', 'name code')
      .lean();
    return NextResponse.json(populatedClass, { status: 201 });
  } catch (error: any) {
    console.error(`Error creating class for ${schoolCode}:`, error);
    if (error.code === 11000) { // Mongoose duplicate key error from unique index
        return NextResponse.json({ error: 'Class name must be unique within an academic year.' }, { status: 409 });
    }
    if (error.message.includes('School not found') || error.message.includes('MongoDB URI not configured')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to create class', details: error.message }, { status: 500 });
  }
}
