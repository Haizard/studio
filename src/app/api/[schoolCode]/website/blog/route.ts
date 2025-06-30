
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import BlogArticleModel, { IBlogArticle } from '@/models/Tenant/BlogArticle';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User'; 
import { getToken } from 'next-auth/jwt';
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
    const BlogArticleOnTenantDB = tenantDb.models.BlogArticle as mongoose.Model<IBlogArticle>;
    
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
      articles = await BlogArticleOnTenantDB.findOne(query)
        .populate<{ authorId: ITenantUser }>({
            path: 'authorId', 
            model: 'User',
            select: 'firstName lastName'
        }) 
        .lean();
      if (!articles) {
        return NextResponse.json({ error: 'Blog article not found or not active' }, { status: 404 });
      }
    } else {
      articles = await BlogArticleOnTenantDB.find(query)
        .populate<{ authorId: ITenantUser }>({
            path: 'authorId', 
            model: 'User',
            select: 'firstName lastName'
        }) 
        .sort(sortOrder)
        .lean();
    }
    
    return NextResponse.json(articles);
  } catch (error: any) {
    console.error(`Error fetching blog for ${schoolCode}:`, error);
    if (error.message.includes('School not found') || error.message.includes('MongoDB URI not configured')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to fetch blog articles', details: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin')) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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
    const BlogArticleOnTenantDB = tenantDb.models.BlogArticle as mongoose.Model<IBlogArticle>;

    const existingArticle = await BlogArticleOnTenantDB.findOne({ slug: slug.toLowerCase() });
    if (existingArticle) {
        return NextResponse.json({ error: 'Article with this slug already exists.' }, { status: 409 });
    }

    const newArticle = new BlogArticleOnTenantDB({
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
    const populatedArticle = await BlogArticleOnTenantDB.findById(newArticle._id)
        .populate<{ authorId: ITenantUser }>({
            path: 'authorId', 
            model: 'User',
            select: 'firstName lastName'
        }) 
        .lean();
    return NextResponse.json(populatedArticle, { status: 201 });

  } catch (error: any) {
    console.error(`Error creating blog article for ${schoolCode}:`, error);
    if (error.code === 11000) {
        return NextResponse.json({ error: 'Article with this slug already exists.' }, { status: 409 });
    }
    if (error.message.includes('School not found') || error.message.includes('MongoDB URI not configured')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to create blog article', details: error.message }, { status: 500 });
  }
}
