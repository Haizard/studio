
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import SubjectModel, { ISubject } from '@/models/Tenant/Subject'; // Adjust path as needed
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Subject) {
    tenantDb.model<ISubject>('Subject', SubjectModel.schema);
  }
}

export async function GET(
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
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Subject = tenantDb.models.Subject as mongoose.Model<ISubject>;
    
    const subjects = await Subject.find({}).sort({ name: 1 }).lean(); 

    return NextResponse.json(subjects);
  } catch (error: any) {
    console.error(`Error fetching subjects for ${schoolCode}:`, error);
    if (error.message.includes('School not found') || error.message.includes('MongoDB URI not configured')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to fetch subjects', details: error.message }, { status: 500 });
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
    const { name, code, department, isElective, forLevel } = body;

    if (!name) {
      return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Subject = tenantDb.models.Subject as mongoose.Model<ISubject>;

    const existingSubjectByName = await Subject.findOne({ name });
    if (existingSubjectByName) {
      return NextResponse.json({ error: 'Subject with this name already exists' }, { status: 409 });
    }
    if (code) {
        const existingSubjectByCode = await Subject.findOne({ code });
        if (existingSubjectByCode) {
            return NextResponse.json({ error: 'Subject with this code already exists' }, { status: 409 });
        }
    }

    const newSubject = new Subject({
      name,
      code,
      department,
      isElective: isElective !== undefined ? isElective : false,
      forLevel: Array.isArray(forLevel) ? forLevel : [],
    });

    await newSubject.save();
    return NextResponse.json(newSubject.toObject(), { status: 201 });
  } catch (error: any) {
    console.error(`Error creating subject for ${schoolCode}:`, error);
    if (error.code === 11000) { // Mongoose duplicate key error
        if (error.keyPattern?.name) return NextResponse.json({ error: 'Subject name must be unique.' }, { status: 409 });
        if (error.keyPattern?.code) return NextResponse.json({ error: 'Subject code must be unique.' }, { status: 409 });
    }
    if (error.message.includes('School not found') || error.message.includes('MongoDB URI not configured')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to create subject', details: error.message }, { status: 500 });
  }
}
