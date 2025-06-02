
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import NewsArticleModel, { INewsArticle } from '@/models/Tenant/NewsArticle'; // Adjust path as needed
import { getToken } from 'next-auth/jwt';

// Helper to ensure models are registered on the tenant connection
async function ensureTenantModelsRegistered(tenantDb: any) {
  if (!tenantDb.models.NewsArticle) {
    tenantDb.model<INewsArticle>('NewsArticle', NewsArticleModel.schema);
  }
  // Register other tenant models as they are used in this route or related services
}

// GET all news articles for the public website (can be public or restricted)
// For now, making it public for website display.
// For management, a separate authenticated GET might be needed or use this with admin checks.
export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug'); // For fetching a single article by slug

  if (!schoolCode) {
    return NextResponse.json({ error: 'School code is required' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const NewsArticleOnTenantDB = tenantDb.models.NewsArticle as mongoose.Model<INewsArticle>;
    
    let articles;
    if (slug) {
      articles = await NewsArticleOnTenantDB.findOne({ slug, isActive: true }).lean();
      if (!articles) {
        return NextResponse.json({ error: 'News article not found' }, { status: 404 });
      }
    } else {
      // Fetch all active news, sorted by newest first. Add pagination if needed.
      articles = await NewsArticleOnTenantDB.find({ isActive: true })
        .sort({ publishedDate: -1 })
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

// POST for creating a new news article (requires authentication, e.g., admin)
export async function POST(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  // Protect this route: only admin or superadmin can post news
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
    const { title, content, summary, slug, featuredImageUrl, tags, category, publishedDate, isActive } = body;

    if (!title || !content || !slug) {
      return NextResponse.json({ error: 'Missing required fields: title, content, slug' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const NewsArticleOnTenantDB = tenantDb.models.NewsArticle as mongoose.Model<INewsArticle>;

    const existingArticle = await NewsArticleOnTenantDB.findOne({ slug });
    if (existingArticle) {
        return NextResponse.json({ error: 'Article with this slug already exists.' }, { status: 409 });
    }

    const newArticle = new NewsArticleOnTenantDB({
      title,
      content,
      slug,
      summary,
      featuredImageUrl,
      tags,
      category,
      authorId: token.uid, // Assuming token.uid stores the logged-in user's ID
      publishedDate: publishedDate || new Date(),
      isActive: isActive !== undefined ? isActive : true,
    });

    await newArticle.save();
    return NextResponse.json(newArticle, { status: 201 });

  } catch (error: any) {
    console.error(`Error creating news article for ${schoolCode}:`, error);
     if (error.code === 11000) { // Mongoose duplicate key error for slug
        return NextResponse.json({ error: 'Article with this slug already exists.' }, { status: 409 });
    }
    if (error.message.includes('School not found') || error.message.includes('MongoDB URI not configured')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to create news article', details: error.message }, { status: 500 });
  }
}
