
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
  { params }: { params: { schoolCode: string; bookId: string } }
) {
  const { schoolCode, bookId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin', 'librarian', 'teacher', 'student'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized role for viewing book details' }, { status: 403 });
  }
  if (token.schoolCode !== schoolCode && token.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    return NextResponse.json({ error: 'Invalid Book ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Book = tenantDb.models.Book as mongoose.Model<IBook>;

    const book = await Book.findById(bookId)
      .populate<{ addedById: ITenantUser }>('addedById', 'username firstName lastName')
      .lean();
      
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }
    return NextResponse.json(book);
  } catch (error: any) {
    console.error(`Error fetching book ${bookId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch book', details: String(error.message || 'Unknown server error') }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string; bookId: string } }
) {
  const { schoolCode, bookId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin', 'librarian'].includes(token.role as string)) {
     return NextResponse.json({ error: 'Unauthorized: Only admins or librarians can update books.' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    return NextResponse.json({ error: 'Invalid Book ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { title, author, isbn, publisher, publicationYear, genre, description, language, numberOfPages, coverImageUrl, totalCopies, availableCopies, locationInLibrary } = body;

    if (!title || !author || totalCopies === undefined) {
      return NextResponse.json({ error: 'Missing required fields: title, author, totalCopies' }, { status: 400 });
    }
    if (availableCopies !== undefined && Number(availableCopies) > Number(totalCopies)) {
        return NextResponse.json({ error: 'Available copies cannot exceed total copies.' }, { status: 400 });
    }


    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Book = tenantDb.models.Book as mongoose.Model<IBook>;

    const bookToUpdate = await Book.findById(bookId);
    if (!bookToUpdate) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    if (isbn && isbn !== bookToUpdate.isbn) {
      const existingBookByIsbn = await Book.findOne({ isbn, _id: { $ne: bookId } });
      if (existingBookByIsbn) {
        return NextResponse.json({ error: 'A book with this ISBN already exists.' }, { status: 409 });
      }
    }
    
    bookToUpdate.title = title;
    bookToUpdate.author = author;
    bookToUpdate.isbn = isbn || undefined;
    bookToUpdate.publisher = publisher || undefined;
    bookToUpdate.publicationYear = publicationYear || undefined;
    bookToUpdate.genre = Array.isArray(genre) ? genre.map(g => String(g).toLowerCase()) : (genre ? [String(genre).toLowerCase()] : []);
    bookToUpdate.description = description || undefined;
    bookToUpdate.language = language || bookToUpdate.language;
    bookToUpdate.numberOfPages = numberOfPages || undefined;
    bookToUpdate.coverImageUrl = coverImageUrl || undefined;
    bookToUpdate.totalCopies = Number(totalCopies);
    bookToUpdate.availableCopies = availableCopies !== undefined ? Number(availableCopies) : bookToUpdate.availableCopies;
    bookToUpdate.locationInLibrary = locationInLibrary || undefined;

    await bookToUpdate.save();
    const populatedBook = await Book.findById(bookToUpdate._id)
      .populate<{ addedById: ITenantUser }>('addedById', 'username firstName lastName')
      .lean();
    return NextResponse.json(populatedBook);
  } catch (error: any) {
    console.error(`Error updating book ${bookId} for ${schoolCode}:`, error);
    if (error.code === 11000 && error.keyPattern?.isbn) {
      return NextResponse.json({ error: 'A book with this ISBN already exists.' }, { status: 409 });
    }
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((e: any) => String(e.message || 'Validation error')).join(', ');
      return NextResponse.json({ error: 'Validation failed', details: messages || 'Please check your input.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update book', details: String(error.message || 'Unknown server error') }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { schoolCode: string; bookId: string } }
) {
  const { schoolCode, bookId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin', 'librarian'].includes(token.role as string)) {
     return NextResponse.json({ error: 'Unauthorized: Only admins or librarians can delete books.' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }
  
  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    return NextResponse.json({ error: 'Invalid Book ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Book = tenantDb.models.Book as mongoose.Model<IBook>;

    // Add check if book has active borrowings before deleting
    // For now, direct delete:
    const result = await Book.deleteOne({ _id: bookId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Book deleted successfully' });
  } catch (error: any) {
    console.error(`Error deleting book ${bookId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to delete book', details: String(error.message || 'Unknown server error') }, { status: 500 });
  }
}
