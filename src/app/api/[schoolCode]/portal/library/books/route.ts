
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import BookModel, { IBook } from '@/models/Tenant/Book';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Book) tenantDb.model<IBook>('Book', BookModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  // Allow admin, superadmin, or librarian (if role defined later)
  if (!token || !['admin', 'superadmin', 'librarian', 'teacher', 'student'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized role for viewing books' }, { status: 403 });
  }
  if (token.schoolCode !== schoolCode && token.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('search');
  const genre = searchParams.get('genre');
  const author = searchParams.get('author');

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Book = tenantDb.models.Book as mongoose.Model<IBook>;

    const query: any = {};
    if (searchTerm) {
      query.$text = { $search: searchTerm };
    }
    if (genre) {
      query.genre = { $in: [genre.toLowerCase()] }; // Case-insensitive search on genre
    }
    if (author) {
        // Basic author search, can be enhanced with regex
        query.author = { $regex: new RegExp(author, 'i') };
    }

    const books = await Book.find(query)
      .populate<{ addedById: ITenantUser }>('addedById', 'username firstName lastName')
      .sort({ title: 1 })
      .lean();

    return NextResponse.json(books);
  } catch (error: any) {
    console.error(`Error fetching books for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch books', details: String(error.message || 'Unknown server error') }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin', 'librarian'].includes(token.role as string)) {
     return NextResponse.json({ error: 'Unauthorized: Only admins or librarians can add books.' }, { status: 403 });
  }
   if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }


  try {
    const body = await request.json();
    const { title, author, isbn, publisher, publicationYear, genre, description, language, numberOfPages, coverImageUrl, totalCopies, locationInLibrary } = body;

    if (!title || !author || totalCopies === undefined) {
      return NextResponse.json({ error: 'Missing required fields: title, author, totalCopies' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Book = tenantDb.models.Book as mongoose.Model<IBook>;

    if (isbn) {
      const existingBookByIsbn = await Book.findOne({ isbn });
      if (existingBookByIsbn) {
        return NextResponse.json({ error: 'A book with this ISBN already exists.' }, { status: 409 });
      }
    }

    const newBook = new Book({
      title,
      author,
      isbn,
      publisher,
      publicationYear,
      genre: Array.isArray(genre) ? genre.map(g => String(g).toLowerCase()) : (genre ? [String(genre).toLowerCase()] : []),
      description,
      language,
      numberOfPages,
      coverImageUrl,
      totalCopies: Number(totalCopies),
      availableCopies: Number(totalCopies), // Initially, all copies are available
      locationInLibrary,
      addedById: token.uid,
    });

    await newBook.save();
    const populatedBook = await Book.findById(newBook._id)
      .populate<{ addedById: ITenantUser }>('addedById', 'username firstName lastName')
      .lean();
    return NextResponse.json(populatedBook, { status: 201 });
  } catch (error: any) {
    console.error(`Error creating book for ${schoolCode}:`, error);
    if (error.code === 11000 && error.keyPattern?.isbn) {
      return NextResponse.json({ error: 'A book with this ISBN already exists.' }, { status: 409 });
    }
     if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((e: any) => String(e.message || 'Validation error')).join(', ');
      return NextResponse.json({ error: 'Validation failed', details: messages || 'Please check your input.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create book', details: String(error.message || 'Unknown server error') }, { status: 500 });
  }
}
