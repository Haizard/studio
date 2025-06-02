
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import GalleryItemModel, { IGalleryItem } from '@/models/Tenant/GalleryItem';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.GalleryItem) {
    tenantDb.model<IGalleryItem>('GalleryItem', GalleryItemModel.schema);
  }
  if (!tenantDb.models.User) {
    tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
  }
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const { searchParams } = new URL(request.url);
  const adminView = searchParams.get('adminView') === 'true';
  const album = searchParams.get('album');

  if (!schoolCode) {
    console.error("[API Gallery GET] School code is required");
    return NextResponse.json({ error: 'School code is required' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    
    const GalleryItem = tenantDb.models.GalleryItem as mongoose.Model<IGalleryItem>;
    
    const query: any = {};
    if (!adminView) {
      query.isActive = true;
    }
    if (album) {
      query.album = album.toLowerCase();
    }

    const items = await GalleryItem.find(query)
      .populate<{ authorId: ITenantUser }>({
        path: 'authorId', 
        model: 'User', // Explicit model name
        select: 'firstName lastName username'
      })
      .sort({ uploadDate: -1 })
      .lean(); 

    return NextResponse.json(items);
  } catch (error: any) {
    console.error(`[API Gallery GET] Error fetching gallery items for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch gallery items', details: error.message, stack: error.stack }, { status: 500 });
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
        console.error("[API Gallery POST] Unauthorized attempt.", { role: token?.role, tokenSchoolCode: token?.schoolCode, targetSchoolCode: schoolCode });
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }
  
  if (!schoolCode) {
    console.error("[API Gallery POST] School code is required");
    return NextResponse.json({ error: 'School code is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { title, description, imageUrl, album, tags, isActive } = body;

    if (!imageUrl) {
      console.error("[API Gallery POST] Missing required field: imageUrl");
      return NextResponse.json({ error: 'Missing required field: imageUrl' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const GalleryItem = tenantDb.models.GalleryItem as mongoose.Model<IGalleryItem>;

    const newItem = new GalleryItem({
      title,
      description,
      imageUrl,
      album: album ? album.toLowerCase() : undefined,
      tags: Array.isArray(tags) ? tags.map(tag => (tag as string).toLowerCase()) : (tags ? (tags as string).split(',').map(tag => tag.trim().toLowerCase()) : []),
      isActive: isActive !== undefined ? isActive : true,
      authorId: token.uid,
      uploadDate: new Date(), 
    });

    await newItem.save();
    const populatedItem = await GalleryItem.findById(newItem._id)
      .populate<{ authorId: ITenantUser }>({
        path: 'authorId', 
        model: 'User', // Explicit model name
        select: 'firstName lastName username'
      })
      .lean();
    return NextResponse.json(populatedItem, { status: 201 });

  } catch (error: any) {
    console.error(`[API Gallery POST] Error creating gallery item for ${schoolCode}:`, error);
    if (error instanceof mongoose.Error.ValidationError) {
        return NextResponse.json({ error: 'Validation Error', details: error.errors, stack: error.stack }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create gallery item', details: error.message, stack: error.stack }, { status: 500 });
  }
}
