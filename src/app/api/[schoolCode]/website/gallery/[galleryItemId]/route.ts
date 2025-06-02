
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
  { params }: { params: { schoolCode: string; galleryItemId: string } }
) {
  const { schoolCode, galleryItemId } = params;
  const { searchParams } = new URL(request.url);
  const adminView = searchParams.get('adminView') === 'true';

  if (!mongoose.Types.ObjectId.isValid(galleryItemId)) {
    return NextResponse.json({ error: 'Invalid Gallery Item ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const GalleryItem = tenantDb.models.GalleryItem as mongoose.Model<IGalleryItem>;

    const query: any = { _id: galleryItemId };
    if (!adminView) {
      query.isActive = true;
    }

    const item = await GalleryItem.findOne(query)
      .populate<{ authorId: ITenantUser }>({
        path: 'authorId', 
        model: 'User', // Explicit model name
        select: 'firstName lastName username'
      })
      .lean();
      
    if (!item) {
      return NextResponse.json({ error: 'Gallery item not found or not active' }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (error: any) {
    console.error(`Error fetching gallery item ${galleryItemId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch gallery item', details: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string; galleryItemId: string } }
) {
  const { schoolCode, galleryItemId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
     if (!(token?.role === 'superadmin' && schoolCode)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(galleryItemId)) {
    return NextResponse.json({ error: 'Invalid Gallery Item ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { title, description, imageUrl, album, tags, isActive } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing required field: imageUrl' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const GalleryItem = tenantDb.models.GalleryItem as mongoose.Model<IGalleryItem>;

    const itemToUpdate = await GalleryItem.findById(galleryItemId);
    if (!itemToUpdate) {
      return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 });
    }
    
    itemToUpdate.title = title;
    itemToUpdate.description = description;
    itemToUpdate.imageUrl = imageUrl;
    itemToUpdate.album = album ? album.toLowerCase() : undefined;
    itemToUpdate.tags = Array.isArray(tags) ? tags.map(tag => (tag as string).toLowerCase()) : (tags ? (tags as string).split(',').map(tag => tag.trim().toLowerCase()) : []);
    itemToUpdate.isActive = isActive !== undefined ? isActive : itemToUpdate.isActive;
    itemToUpdate.authorId = token.uid; 

    await itemToUpdate.save();
    const populatedItem = await GalleryItem.findById(itemToUpdate._id)
        .populate<{ authorId: ITenantUser }>({
            path: 'authorId', 
            model: 'User', // Explicit model name
            select: 'firstName lastName username'
        })
        .lean();
    return NextResponse.json(populatedItem);
  } catch (error: any) {
    console.error(`Error updating gallery item ${galleryItemId} for ${schoolCode}:`, error);
     if (error instanceof mongoose.Error.ValidationError) {
        return NextResponse.json({ error: 'Validation Error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update gallery item', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { schoolCode: string; galleryItemId: string } }
) {
  const { schoolCode, galleryItemId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }
  
  if (!mongoose.Types.ObjectId.isValid(galleryItemId)) {
    return NextResponse.json({ error: 'Invalid Gallery Item ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const GalleryItem = tenantDb.models.GalleryItem as mongoose.Model<IGalleryItem>;

    const result = await GalleryItem.deleteOne({ _id: galleryItemId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Gallery item deleted successfully' });
  } catch (error: any) {
    console.error(`Error deleting gallery item ${galleryItemId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to delete gallery item', details: error.message }, { status: 500 });
  }
}
