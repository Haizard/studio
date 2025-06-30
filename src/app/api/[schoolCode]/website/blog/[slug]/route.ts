
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import BlogArticleModel, { IBlogArticle } from '@/models/Tenant/BlogArticle';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.BlogArticle) {
    tenantDb.model<IBlogArticle>('BlogArticle', BlogArticleModel.schema);
  }
  if (!tenantDb.models.User) {
    tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
  }
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string; slug: string } }
) {
  const { schoolCode, slug } = params;

  if (!slug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const BlogArticle = tenantDb.models.BlogArticle as mongoose.Model<IBlogArticle>;

    const article = await BlogArticle.findOne({ slug: slug.toLowerCase(), isActive: true })
      .populate<{ authorId: ITenantUser }>({
        path: 'authorId', 
        model: 'User',
        select: 'firstName lastName username'
      })
      .lean();
      
    if (!article) {
      return NextResponse.json({ error: 'Blog article not found or not active' }, { status: 404 });
    }
    return NextResponse.json(article);
  } catch (error: any) {
    console.error(`Error fetching blog article ${slug} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch blog article', details: error.message }, { status: 500 });
  }
}
