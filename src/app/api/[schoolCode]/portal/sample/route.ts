
// Example Tenant-Specific API Route
// File: src/app/api/[schoolCode]/portal/sample/route.ts
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import TenantUserModel, { ITenantUser } from '@/models/Tenant/User'; // Import your tenant user model
import mongoose from 'mongoose';

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;

  if (!schoolCode) {
    return NextResponse.json({ error: 'School code is required' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    
    // Register model if not already registered on this connection
    // Note: Mongoose's default behavior for `mongoose.model()` is to use the default connection.
    // When using multiple connections, you must explicitly use the connection object to register and retrieve models.
    const UserOnTenantDB = tenantDb.models.User || tenantDb.model<ITenantUser>('User', TenantUserModel.schema);

    // Example: Fetch all users from this tenant's database
    const users = await UserOnTenantDB.find({}).limit(10).lean(); // .lean() for plain JS objects

    return NextResponse.json({
      message: `Data from ${schoolCode} tenant database`,
      schoolCode,
      users,
    });
  } catch (error: any) {
    console.error(`Error accessing tenant DB for ${schoolCode}:`, error);
    // Distinguish between connection errors and other errors if possible
    if (error.message.includes('School not found') || error.message.includes('MongoDB URI not configured')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to connect to tenant database or query data', details: error.message }, { status: 500 });
  }
}
