
// Example Tenant-Specific API Route
// File: src/app/api/[schoolCode]/portal/sample/route.ts
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User'; 
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
    
    const UserOnTenantDB = tenantDb.models.User || tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);

    const users = await UserOnTenantDB.find({}).limit(10).lean(); 

    return NextResponse.json({
      message: `Data from ${schoolCode} tenant database`,
      schoolCode,
      users,
    });
  } catch (error: any) {
    console.error(`Error accessing tenant DB for ${schoolCode}:`, error);
    if (error.message.includes('School not found') || error.message.includes('MongoDB URI not configured')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to connect to tenant database or query data', details: error.message }, { status: 500 });
  }
}
