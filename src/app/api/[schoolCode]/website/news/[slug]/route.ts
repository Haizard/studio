
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import NewsArticleModel, { INewsArticle } from '@/models/Tenant/NewsArticle'; 
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User'; 
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.NewsArticle) {
    tenantDb.model<INewsArticle>('NewsArticle', NewsArticleModel.schema);
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
    const NewsArticle = tenantDb.models.NewsArticle as mongoose.Model<INewsArticle>;

    const article = await NewsArticle.findOne({ slug: slug.toLowerCase(), isActive: true })
      .populate<{ authorId: ITenantUser }>({
        path: 'authorId', 
        model: 'User', // Explicit model name
        select: 'firstName lastName username'
      })
      .lean();
      
    if (!article) {
      return NextResponse.json({ error: 'News article not found or not active' }, { status: 404 });
    }
    return NextResponse.json(article);
  } catch (error: any) {
    console.error(`Error fetching news article ${slug} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch news article', details: error.message }, { status: 500 });
  }
}


export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string; slug: string } }
) {
  const { schoolCode, slug } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin')) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, content, summary, featuredImageUrl, tags, category, publishedDate, isActive } = body;
    
    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required fields' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const NewsArticleOnTenantDB = tenantDb.models.NewsArticle as mongoose.Model<INewsArticle>;

    const articleToUpdate = await NewsArticleOnTenantDB.findOne({ slug: slug.toLowerCase() });
    if (!articleToUpdate) {
        return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    articleToUpdate.title = title;
    articleToUpdate.content = content;
    articleToUpdate.summary = summary;
    articleToUpdate.featuredImageUrl = featuredImageUrl;
    articleToUpdate.tags = Array.isArray(tags) ? tags : (tags ? (tags as string).split(',').map(tag => tag.trim()) : []);
    articleToUpdate.category = category;
    articleToUpdate.publishedDate = publishedDate ? new Date(publishedDate) : articleToUpdate.publishedDate;
    articleToUpdate.isActive = isActive !== undefined ? isActive : articleToUpdate.isActive;
    articleToUpdate.authorId = token.uid;

    await articleToUpdate.save();
    const populatedArticle = await NewsArticleOnTenantDB.findById(articleToUpdate._id)
      .populate<{ authorId: ITenantUser }>({
          path: 'authorId', 
          model: 'User',
          select: 'firstName lastName'
      }) 
      .lean();
    return NextResponse.json(populatedArticle);
  } catch (error: any) {
    console.error(`Error updating news article ${slug} for ${schoolCode}:`, error);
     if (error instanceof mongoose.Error.ValidationError) {
        return NextResponse.json({ error: 'Validation Error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update news article', details: error.message }, { status: 500 });
  }
}
