
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import bcrypt from 'bcryptjs';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';
import { logAudit, safeObject } from '@/lib/audit';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.User) {
    tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
  }
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string; userId: string } }
) {
  const { schoolCode, userId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: 'Invalid User ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const User = tenantDb.models.User as mongoose.Model<ITenantUser>;

    const user = await User.findById(userId).select('-passwordHash').lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error: any) {
    console.error(`Error fetching user ${userId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch user', details: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string; userId: string } }
) {
  const { schoolCode, userId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
     if (!(token?.role === 'superadmin' && schoolCode)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: 'Invalid User ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { firstName, lastName, role, password, isActive } = body;

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const User = tenantDb.models.User as mongoose.Model<ITenantUser>;

    const userToUpdate = await User.findById(userId);
    if (!userToUpdate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const originalUser = userToUpdate.toObject();

    if (firstName) userToUpdate.firstName = firstName;
    if (lastName) userToUpdate.lastName = lastName;
    if (role) userToUpdate.role = role;
    if (isActive !== undefined) userToUpdate.isActive = isActive;

    if (password) {
      userToUpdate.passwordHash = await bcrypt.hash(password, 10);
    }

    await userToUpdate.save();

    const updatedUser = userToUpdate.toObject();
    
    await logAudit(schoolCode, {
      userId: token.uid,
      username: token.email,
      action: 'UPDATE',
      entity: 'User',
      entityId: userToUpdate._id.toString(),
      details: `Updated user: ${userToUpdate.username}`,
      originalValues: safeObject(originalUser),
      newValues: safeObject(updatedUser),
      req: request as any,
    });


    // @ts-ignore
    delete updatedUser.passwordHash;
    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error(`Error updating user ${userId} for ${schoolCode}:`, error);
    if (error.code === 11000) {
        return NextResponse.json({ error: 'Username or email already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update user', details: error.message }, { status: 500 });
  }
}

// DELETE is not implemented to prevent accidental hard deletions. Deactivation should be handled via PUT.
