
import { NextResponse } from 'next/server';
import { connectToSuperAdminDB } from '@/lib/db';
import SchoolModel, { ISchool } from '@/models/SuperAdmin/School'; // Adjust path as needed
import SuperAdminUserModel from '@/models/SuperAdmin/SuperAdminUser'; // Needed to ensure model is registered
import { getToken } from 'next-auth/jwt';

async function ensureModelsRegistered(db: any) {
  // Ensure models are registered on the connection
  if (!db.models.School) {
    db.model<ISchool>('School', SchoolModel.schema);
  }
  if (!db.models.SuperAdminUser) {
    db.model('SuperAdminUser', SuperAdminUserModel.schema);
  }
}

export async function GET(request: Request) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
  if (!token || token.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const superAdminDb = await connectToSuperAdminDB();
    await ensureModelsRegistered(superAdminDb);
    const School = superAdminDb.models.School as mongoose.Model<ISchool>;
    
    const schools = await School.find({}).sort({ name: 1 }).lean();
    return NextResponse.json(schools);
  } catch (error: any) {
    console.error('Failed to fetch schools:', error);
    return NextResponse.json({ error: 'Failed to fetch schools', details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
  if (!token || token.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const superAdminDb = await connectToSuperAdminDB();
    await ensureModelsRegistered(superAdminDb);
    const School = superAdminDb.models.School as mongoose.Model<ISchool>;

    const body = await request.json();
    const { name, schoolCode, mongodbUri, contactInfo } = body;

    if (!name || !schoolCode || !mongodbUri) {
      return NextResponse.json({ error: 'Missing required fields: name, schoolCode, mongodbUri' }, { status: 400 });
    }

    // Basic validation for schoolCode format (alphanumeric, lowercase)
    if (!/^[a-z0-9]+$/.test(schoolCode)) {
        return NextResponse.json({ error: 'School code must be alphanumeric and lowercase.' }, { status: 400 });
    }
    
    // Check if school code already exists
    const existingSchool = await School.findOne({ schoolCode });
    if (existingSchool) {
        return NextResponse.json({ error: 'School code already exists.' }, { status: 409 });
    }

    const newSchool = new School({
      name,
      schoolCode: schoolCode.toLowerCase(), // Ensure lowercase
      mongodbUri,
      contactInfo,
      isActive: true,
    });

    await newSchool.save();
    return NextResponse.json(newSchool, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create school:', error);
    // Handle duplicate key error for schoolCode specifically if not caught by pre-check
    if (error.code === 11000 && error.keyPattern && error.keyPattern.schoolCode) {
        return NextResponse.json({ error: 'School code already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create school', details: error.message }, { status: 500 });
  }
}
