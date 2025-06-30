
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User'; 
import { getToken } from 'next-auth/jwt';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { logAudit } from '@/lib/audit';

// Helper to ensure models are registered on the tenant connection
async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.User) {
    tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
  }
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (token?.role === 'superadmin' && token?.schoolCode && token.schoolCode !== schoolCode) {
        // Allow superadmin to specify a schoolCode different from their token's schoolCode
    } else if (token?.schoolCode !== schoolCode) {
        return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
    } else if (token?.role !== 'admin' && token?.role !== 'superadmin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }
  
  if (!schoolCode) {
    return NextResponse.json({ error: 'School code is required' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const UserOnTenantDB = tenantDb.models.User as mongoose.Model<ITenantUser>;
    
    const users = await UserOnTenantDB.find({}).select('-passwordHash').lean(); 

    return NextResponse.json(users);
  } catch (error: any) {
    console.error(`Error accessing users for ${schoolCode}:`, error);
    if (error.message.includes('School not found') || error.message.includes('MongoDB URI not configured')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to fetch users', details: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
     if (token?.role === 'superadmin' && token?.schoolCode && token.schoolCode !== schoolCode) {
        // Allow superadmin for this operation if they are targeting a specific school
    } else if (token?.schoolCode !== schoolCode) {
        return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
    } else if (token?.role !== 'admin' && token?.role !== 'superadmin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  if (!schoolCode) {
    return NextResponse.json({ error: 'School code is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { username, password, role, email, firstName, lastName, isActive } = body;

    if (!username || !password || !role || !email || !firstName || !lastName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const UserOnTenantDB = tenantDb.models.User as mongoose.Model<ITenantUser>;

    // Check if username or email already exists
    const existingUser = await UserOnTenantDB.findOne({ $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }] });
    if (existingUser) {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = new UserOnTenantDB({
      username: username.toLowerCase(),
      passwordHash,
      role,
      email: email.toLowerCase(),
      firstName,
      lastName,
      isActive: isActive !== undefined ? isActive : true, // Default to true if not provided
    });

    await newUser.save();
    const userResponse = newUser.toObject();
    // @ts-ignore
    delete userResponse.passwordHash; // Don't send hash back
    
    await logAudit(schoolCode, {
      userId: token.uid,
      username: token.email,
      action: 'CREATE',
      entity: 'User',
      entityId: newUser._id.toString(),
      details: `Created new user: ${newUser.username} with role ${newUser.role}`,
      newValues: userResponse,
      req: request as any,
    });


    return NextResponse.json(userResponse, { status: 201 });
  } catch (error: any) {
    console.error(`Error creating user for ${schoolCode}:`, error);
    if (error.code === 11000) { // Mongoose duplicate key error
        return NextResponse.json({ error: 'Username or email already exists.' }, { status: 409 });
    }
    if (error.message.includes('School not found') || error.message.includes('MongoDB URI not configured')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to create user', details: error.message }, { status: 500 });
  }
}
