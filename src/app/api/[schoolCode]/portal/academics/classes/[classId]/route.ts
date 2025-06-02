
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import TenantUserModel, { ITenantUser } from '@/models/Tenant/User';
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
  if (!tenantDb.models.User) {
    tenantDb.model<ITenantUser>('User', TenantUserModel.schema);
  }
  if (!tenantDb.models.Subject) {
    tenantDb.model<ISubject>('Subject', SubjectModel.schema);
  }
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string; classId: string } }
) {
  const { schoolCode, classId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized for this school or role' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(classId)) {
    return NextResponse.json({ error: 'Invalid Class ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Class = tenantDb.models.Class as mongoose.Model<IClass>;

    const classData = await Class.findById(classId)
      .populate('academicYearId', 'name')
      .populate('classTeacherId', 'firstName lastName username')
      .populate('subjectsOffered', 'name code')
      .lean();
      
    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    return NextResponse.json(classData);
  } catch (error: any) {
    console.error(`Error fetching class ${classId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch class', details: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string; classId: string } }
) {
  const { schoolCode, classId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
     if (!(token?.role === 'superadmin' && schoolCode)) {
        return NextResponse.json({ error: 'Unauthorized for this school or role' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(classId)) {
    return NextResponse.json({ error: 'Invalid Class ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, level, stream, classTeacherId, academicYearId, subjectsOffered, capacity } = body;

    if (!name || !level || !academicYearId) {
      return NextResponse.json({ error: 'Missing required fields: name, level, academicYearId' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Class = tenantDb.models.Class as mongoose.Model<IClass>;

    const classToUpdate = await Class.findById(classId);
    if (!classToUpdate) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    if (name !== classToUpdate.name || academicYearId.toString() !== classToUpdate.academicYearId.toString()) {
        const existingClass = await Class.findOne({ name, academicYearId, _id: { $ne: classId } });
        if (existingClass) {
          return NextResponse.json({ error: 'Another class with this name already exists for the selected academic year.' }, { status: 409 });
        }
    }
    
    classToUpdate.name = name;
    classToUpdate.level = level;
    classToUpdate.stream = stream || undefined;
    classToUpdate.classTeacherId = classTeacherId || undefined;
    classToUpdate.academicYearId = academicYearId;
    classToUpdate.subjectsOffered = subjectsOffered || [];
    classToUpdate.capacity = capacity || undefined;

    await classToUpdate.save();
    const populatedClass = await Class.findById(classToUpdate._id)
      .populate('academicYearId', 'name')
      .populate('classTeacherId', 'firstName lastName username')
      .populate('subjectsOffered', 'name code')
      .lean();
    return NextResponse.json(populatedClass);
  } catch (error: any) {
    console.error(`Error updating class ${classId} for ${schoolCode}:`, error);
    if (error.code === 11000) {
        return NextResponse.json({ error: 'Class name must be unique within an academic year.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update class', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { schoolCode: string; classId: string } }
) {
  const { schoolCode, classId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
        return NextResponse.json({ error: 'Unauthorized for this school or role' }, { status: 403 });
    }
  }
  
  if (!mongoose.Types.ObjectId.isValid(classId)) {
    return NextResponse.json({ error: 'Invalid Class ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Class = tenantDb.models.Class as mongoose.Model<IClass>;

    // TODO: Add check if class is in use by students or other entities before deleting
    const result = await Class.deleteOne({ _id: classId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Class deleted successfully' });
  } catch (error: any) {
    console.error(`Error deleting class ${classId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to delete class', details: error.message }, { status: 500 });
  }
}
