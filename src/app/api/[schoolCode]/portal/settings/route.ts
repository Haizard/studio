
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import WebsiteSettingsModel, { IWebsiteSettings } from '@/models/Tenant/WebsiteSettings';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.WebsiteSettings) {
    tenantDb.model<IWebsiteSettings>('WebsiteSettings', WebsiteSettingsModel.schema);
  }
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;

  if (!schoolCode || typeof schoolCode !== 'string' || schoolCode.trim() === '') {
    return NextResponse.json({ error: 'Valid School code is required in the URL path.' }, { status: 400 });
  }
  const trimmedSchoolCode = schoolCode.trim();

  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== trimmedSchoolCode)) {
    if (!(token?.role === 'superadmin' && trimmedSchoolCode)) {
      return NextResponse.json({ error: 'Unauthorized for this school or role' }, { status: 403 });
    }
  }

  try {
    const tenantDb = await getTenantConnection(trimmedSchoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Settings = tenantDb.models.WebsiteSettings as mongoose.Model<IWebsiteSettings>;

    let settings = await Settings.findOne().lean<IWebsiteSettings | null>();

    if (!settings) {
      // If no settings found, create a default one and return it
      const defaultSchoolName = `${trimmedSchoolCode.toUpperCase()} School`;
      try {
        const newSettingsDoc = await Settings.create({ schoolName: defaultSchoolName });
        // Ensure the created document is also a plain object if lean was used for findOne
        settings = newSettingsDoc.toObject() as IWebsiteSettings; 
      } catch (creationError: any) {
        console.error(`Error creating default settings for ${trimmedSchoolCode}:`, creationError);
        return NextResponse.json({ error: 'Failed to initialize school settings', details: creationError.message }, { status: 500 });
      }
    }
    return NextResponse.json(settings);
  } catch (error: any) {
    console.error(`Error fetching settings for ${trimmedSchoolCode}:`, error);
    if (error.message.includes('School not found') || error.message.includes('MongoDB URI not configured')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to fetch settings', details: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  
  if (!schoolCode || typeof schoolCode !== 'string' || schoolCode.trim() === '') {
    return NextResponse.json({ error: 'Valid School code is required in the URL path.' }, { status: 400 });
  }
  const trimmedSchoolCode = schoolCode.trim();

  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== trimmedSchoolCode)) {
    if (!(token?.role === 'superadmin' && trimmedSchoolCode)) {
      return NextResponse.json({ error: 'Unauthorized for this school or role' }, { status: 403 });
    }
  }

  try {
    const body = await request.json();
    const { _id, ...updateData } = body; // Exclude _id from updateData if present

    const tenantDb = await getTenantConnection(trimmedSchoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Settings = tenantDb.models.WebsiteSettings as mongoose.Model<IWebsiteSettings>;

    // Upsert: Update if exists, insert if not. 
    const updatedSettings = await Settings.findOneAndUpdate({}, updateData, {
      new: true, // Return the modified document
      upsert: true, // Create if it doesn't exist
      runValidators: true,
      setDefaultsOnInsert: true, // Ensure defaults are applied on insert (e.g. for schoolName if somehow creating here)
    }).lean();

    return NextResponse.json(updatedSettings);
  } catch (error: any) {
    console.error(`Error updating settings for ${trimmedSchoolCode}:`, error);
    if (error.message.includes('School not found') || error.message.includes('MongoDB URI not configured')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    // Handle Mongoose validation errors specifically if they occur
    if (error instanceof mongoose.Error.ValidationError) {
        return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update settings', details: error.message }, { status: 500 });
  }
}
    
