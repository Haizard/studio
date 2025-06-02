
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
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const adminView = searchParams.get('adminView') === 'true'; 

  if (!schoolCode) {
    return NextResponse.json({ error: 'School code is required' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const NewsArticleOnTenantDB = tenantDb.models.NewsArticle as mongoose.Model<INewsArticle>;
    
    let query: any = {};
    
    if (slug) {
      query.slug = slug.toLowerCase(); 
      if (!adminView) { 
        query.isActive = true;
      }
    } else { 
      if (!adminView) { 
        query.isActive = true;
      }
    }

    let articles;
    const sortOrder = adminView ? { createdAt: -1 } : { publishedDate: -1 };

    if (slug) {
      articles = await NewsArticleOnTenantDB.findOne(query)
        .populate<{ authorId: ITenantUser }>({
            path: 'authorId', 
            model: 'User', // Explicit model name
            select: 'firstName lastName'
        }) 
        .lean();
      if (!articles) {
        return NextResponse.json({ error: 'News article not found or not active' }, { status: 404 });
      }
    } else {
      articles = await NewsArticleOnTenantDB.find(query)
        .populate<{ authorId: ITenantUser }>({
            path: 'authorId', 
            model: 'User', // Explicit model name
            select: 'firstName lastName'
        }) 
        .sort(sortOrder)
        .lean();
    }
    
    return NextResponse.json(articles);
  } catch (error: any) {
    console.error(`Error fetching news for ${schoolCode}:`, error);
    if (error.message.includes('School not found') || error.message.includes('MongoDB URI not configured')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to fetch news', details: error.message }, { status: 500 });
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
    const { title, content, summary, slug, featuredImageUrl, tags, category, publishedDate, isActive } = body;

    if (!title || !content || !slug) {
      return NextResponse.json({ error: 'Missing required fields: title, content, slug' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const NewsArticleOnTenantDB = tenantDb.models.NewsArticle as mongoose.Model<INewsArticle>;

    const existingArticle = await NewsArticleOnTenantDB.findOne({ slug: slug.toLowerCase() });
    if (existingArticle) {
        return NextResponse.json({ error: 'Article with this slug already exists.' }, { status: 409 });
    }

    const newArticle = new NewsArticleOnTenantDB({
      title,
      content,
      slug: slug.toLowerCase(),
      summary,
      featuredImageUrl,
      tags: Array.isArray(tags) ? tags : (tags ? (tags as string).split(',').map(tag => tag.trim()) : []),
      category,
      authorId: token.uid, 
      publishedDate: publishedDate ? new Date(publishedDate) : new Date(),
      isActive: isActive !== undefined ? isActive : true,
    });

    await newArticle.save();
    const populatedArticle = await NewsArticleOnTenantDB.findById(newArticle._id)
        .populate<{ authorId: ITenantUser }>({
            path: 'authorId', 
            model: 'User', // Explicit model name
            select: 'firstName lastName'
        }) 
        .lean();
    return NextResponse.json(populatedArticle, { status: 201 });

  } catch (error: any) {
    console.error(`Error creating news article for ${schoolCode}:`, error);
    if (error.code === 11000) {
        return NextResponse.json({ error: 'Article with this slug already exists.' }, { status: 409 });
    }
    if (error instanceof mongoose.Error.ValidationError) {
        return NextResponse.json({ error: 'Validation Error', details: error.errors }, { status: 400 });
    }
    if (error.message.includes('School not found') || error.message.includes('MongoDB URI not configured')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to create news article', details: error.message }, { status: 500 });
  }
}
