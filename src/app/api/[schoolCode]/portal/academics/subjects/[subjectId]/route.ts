
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import SubjectModel, { ISubject } from '@/models/Tenant/Subject';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Subject) {
    tenantDb.model<ISubject>('Subject', SubjectModel.schema);
  }
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string; subjectId: string } }
) {
  const { schoolCode, subjectId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized for this school or role' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(subjectId)) {
    return NextResponse.json({ error: 'Invalid Subject ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Subject = tenantDb.models.Subject as mongoose.Model<ISubject>;

    const subject = await Subject.findById(subjectId).lean();
    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }
    return NextResponse.json(subject);
  } catch (error: any) {
    console.error(`Error fetching subject ${subjectId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch subject', details: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string; subjectId: string } }
) {
  const { schoolCode, subjectId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
     if (!(token?.role === 'superadmin' && schoolCode)) {
        return NextResponse.json({ error: 'Unauthorized for this school or role' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(subjectId)) {
    return NextResponse.json({ error: 'Invalid Subject ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, code, department, isElective, forLevel } = body;

    if (!name) {
      return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Subject = tenantDb.models.Subject as mongoose.Model<ISubject>;

    const subjectToUpdate = await Subject.findById(subjectId);
    if (!subjectToUpdate) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    // Check for name uniqueness if name is being changed
    if (name !== subjectToUpdate.name) {
        const existingSubjectByName = await Subject.findOne({ name, _id: { $ne: subjectId } });
        if (existingSubjectByName) {
          return NextResponse.json({ error: 'Subject with this name already exists' }, { status: 409 });
        }
    }
    // Check for code uniqueness if code is being changed and is not empty
    if (code && code !== subjectToUpdate.code) {
        const existingSubjectByCode = await Subject.findOne({ code, _id: { $ne: subjectId } });
        if (existingSubjectByCode) {
            return NextResponse.json({ error: 'Subject with this code already exists' }, { status: 409 });
        }
    } else if (!code && subjectToUpdate.code) { // If code is being removed
        // No specific check, just allow removal
    }

    subjectToUpdate.name = name;
    subjectToUpdate.code = code || undefined; // Allow unsetting code by passing null/empty string
    subjectToUpdate.department = department || undefined;
    subjectToUpdate.isElective = isElective !== undefined ? isElective : subjectToUpdate.isElective;
    subjectToUpdate.forLevel = Array.isArray(forLevel) ? forLevel : subjectToUpdate.forLevel;

    await subjectToUpdate.save();
    return NextResponse.json(subjectToUpdate.toObject());
  } catch (error: any) {
    console.error(`Error updating subject ${subjectId} for ${schoolCode}:`, error);
     if (error.code === 11000) { // Mongoose duplicate key error
        if (error.keyPattern?.name) return NextResponse.json({ error: 'Subject name must be unique.' }, { status: 409 });
        if (error.keyPattern?.code && error.keyValue?.code) return NextResponse.json({ error: 'Subject code must be unique.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update subject', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { schoolCode: string; subjectId: string } }
) {
  const { schoolCode, subjectId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
        return NextResponse.json({ error: 'Unauthorized for this school or role' }, { status: 403 });
    }
  }
  
  if (!mongoose.Types.ObjectId.isValid(subjectId)) {
    return NextResponse.json({ error: 'Invalid Subject ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Subject = tenantDb.models.Subject as mongoose.Model<ISubject>;

    // TODO: Add check if subject is in use by other entities (classes, combinations, marks) before deleting
    const result = await Subject.deleteOne({ _id: subjectId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Subject deleted successfully' });
  } catch (error: any) {
    console.error(`Error deleting subject ${subjectId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to delete subject', details: error.message }, { status: 500 });
  }
}
