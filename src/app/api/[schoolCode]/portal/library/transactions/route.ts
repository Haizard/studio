
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import BookModel, { IBook } from '@/models/Tenant/Book';
import BookTransactionModel, { IBookTransaction } from '@/models/Tenant/BookTransaction';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Book) tenantDb.model<IBook>('Book', BookModel.schema);
  if (!tenantDb.models.BookTransaction) tenantDb.model<IBookTransaction>('BookTransaction', BookTransactionModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
}

interface BorrowRequestBody {
  action: 'borrow';
  bookId: string;
  memberId: string;
  dueDate: string; // ISO Date string
  notes?: string;
}

interface ReturnRequestBody {
  action: 'return';
  bookTransactionId: string; // The ID of the original borrow transaction
  notes?: string;
}

type RequestBody = BorrowRequestBody | ReturnRequestBody;

export async function POST(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin', 'librarian'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized: Only admins or librarians can manage book transactions.' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  const body: RequestBody = await request.json();

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Book = tenantDb.models.Book as mongoose.Model<IBook>;
    const BookTransaction = tenantDb.models.BookTransaction as mongoose.Model<IBookTransaction>;
    const User = tenantDb.models.User as mongoose.Model<ITenantUser>;

    if (body.action === 'borrow') {
      const { bookId, memberId, dueDate, notes } = body;
      if (!mongoose.Types.ObjectId.isValid(bookId) || !mongoose.Types.ObjectId.isValid(memberId)) {
        return NextResponse.json({ error: 'Invalid Book ID or Member ID' }, { status: 400 });
      }
      
      const book = await Book.findById(bookId);
      if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 });
      if (book.availableCopies <= 0) return NextResponse.json({ error: 'Book not available for borrowing' }, { status: 400 });

      const member = await User.findById(memberId).lean();
      if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

      const existingActiveBorrow = await BookTransaction.findOne({ bookId, memberId, isReturned: false });
      if (existingActiveBorrow) {
        return NextResponse.json({ error: 'This member has already borrowed this book and not returned it.' }, { status: 400 });
      }

      book.availableCopies -= 1;
      await book.save();

      const newTransaction = new BookTransaction({
        bookId,
        memberId,
        borrowDate: new Date(),
        dueDate: new Date(dueDate),
        isReturned: false,
        notes,
      });
      await newTransaction.save();
      
      const populatedTransaction = await BookTransaction.findById(newTransaction._id)
        .populate('bookId', 'title')
        .populate('memberId', 'firstName lastName username')
        .lean();
      return NextResponse.json(populatedTransaction, { status: 201 });

    } else if (body.action === 'return') {
      const { bookTransactionId, notes } = body;
      if (!mongoose.Types.ObjectId.isValid(bookTransactionId)) {
        return NextResponse.json({ error: 'Invalid Book Transaction ID' }, { status: 400 });
      }

      const transaction = await BookTransaction.findById(bookTransactionId);
      if (!transaction) return NextResponse.json({ error: 'Borrow transaction not found' }, { status: 404 });
      if (transaction.isReturned) return NextResponse.json({ error: 'This book has already been returned' }, { status: 400 });

      const book = await Book.findById(transaction.bookId);
      if (!book) {
        console.error(`Book with ID ${transaction.bookId} not found during return for transaction ${transaction._id}`);
        return NextResponse.json({ error: 'Associated book not found. Data inconsistency.' }, { status: 500 });
      }

      transaction.isReturned = true;
      transaction.returnDate = new Date();
      if (notes) transaction.notes = `${transaction.notes || ''}\nReturn Note: ${notes}`.trim();
      await transaction.save();

      book.availableCopies += 1;
      await book.save();
      
      const populatedTransaction = await BookTransaction.findById(transaction._id)
        .populate('bookId', 'title')
        .populate('memberId', 'firstName lastName username')
        .lean();
      return NextResponse.json(populatedTransaction);

    } else {
      return NextResponse.json({ error: 'Invalid action specified in request body' }, { status: 400 });
    }

  } catch (error: any) {
    console.error(`Error processing book transaction for ${schoolCode}:`, error);
    
    let errorDetailString = 'Unknown server error';
    if (error instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(error.errors).map((e: any) => String(e.message || 'Validation error')).join(', ');
      return NextResponse.json({ error: 'Validation failed', details: messages || 'Please check your input.' }, { status: 400 });
    } else if (error && typeof error.message === 'string') {
        errorDetailString = error.message;
    } else if (typeof error === 'string') {
        errorDetailString = error;
    } else if (error && typeof error.toString === 'function') {
        // Fallback to toString() if message is not available or not a string
        const errStr = error.toString();
        errorDetailString = errStr === '[object Object]' ? 'An unexpected error object was thrown.' : errStr;
    }

    return NextResponse.json({ error: 'Failed to process book transaction', details: errorDetailString }, { status: 500 });
  }
}


export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin', 'librarian'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('memberId');
  const bookId = searchParams.get('bookId');
  const isReturned = searchParams.get('isReturned'); 

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const BookTransaction = tenantDb.models.BookTransaction as mongoose.Model<IBookTransaction>;

    const query: any = {};
    if (memberId && mongoose.Types.ObjectId.isValid(memberId)) query.memberId = memberId;
    if (bookId && mongoose.Types.ObjectId.isValid(bookId)) query.bookId = bookId;
    if (isReturned === 'true') query.isReturned = true;
    if (isReturned === 'false') query.isReturned = false;

    const transactions = await BookTransaction.find(query)
      .populate('bookId', 'title isbn')
      .populate('memberId', 'firstName lastName username')
      .sort({ borrowDate: -1 })
      .lean();

    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error(`Error fetching book transactions for ${schoolCode}:`, error);
    let errorDetailString = 'Unknown server error';
    if (error && typeof error.message === 'string') {
        errorDetailString = error.message;
    } else if (typeof error === 'string') {
        errorDetailString = error;
    } else if (error && typeof error.toString === 'function') {
        const errStr = error.toString();
        errorDetailString = errStr === '[object Object]' ? 'An unexpected error object was thrown.' : errStr;
    }
    return NextResponse.json({ error: 'Failed to fetch book transactions', details: errorDetailString }, { status: 500 });
  }
}
