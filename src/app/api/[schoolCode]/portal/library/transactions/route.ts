import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import BookModel, { IBook } from '@/models/Tenant/Book';
import BookTransactionModel, { IBookTransaction, FineStatus } from '@/models/Tenant/BookTransaction';
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

interface UpdateFineRequestBody {
    action: 'update_fine_status';
    bookTransactionId: string;
    fineAmount?: number;
    fineStatus?: FineStatus;
    finePaidDate?: string;
    fineNotes?: string;
}


type RequestBody = BorrowRequestBody | ReturnRequestBody | UpdateFineRequestBody;

export async function POST(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin', 'librarian'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized: Only admins or librarians can manage book transactions.', details: 'User role not permitted for this action.' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school', details: 'User not authorized for the specified school.' }, { status: 403 });
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
        return NextResponse.json({ error: 'Invalid Book ID or Member ID', details: 'The provided Book ID or Member ID is not a valid format.' }, { status: 400 });
      }
      
      const book = await Book.findById(bookId);
      if (!book) return NextResponse.json({ error: 'Book not found', details: `Book with ID ${bookId} could not be found.` }, { status: 404 });
      if (book.availableCopies <= 0) return NextResponse.json({ error: 'Book not available for borrowing', details: 'There are no available copies of this book.' }, { status: 400 });

      const member = await User.findById(memberId).lean();
      if (!member) return NextResponse.json({ error: 'Member not found', details: `Member with ID ${memberId} could not be found.` }, { status: 404 });

      const existingActiveBorrow = await BookTransaction.findOne({ bookId, memberId, isReturned: false });
      if (existingActiveBorrow) {
        return NextResponse.json({ error: 'This member has already borrowed this book and not returned it.', details: 'An active borrowing record already exists for this member and book.' }, { status: 400 });
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
        return NextResponse.json({ error: 'Invalid Book Transaction ID', details: 'The provided Book Transaction ID is not a valid format.' }, { status: 400 });
      }

      const transaction = await BookTransaction.findById(bookTransactionId);
      if (!transaction) return NextResponse.json({ error: 'Borrow transaction not found', details: `Transaction with ID ${bookTransactionId} not found.` }, { status: 404 });
      if (transaction.isReturned) return NextResponse.json({ error: 'This book has already been returned', details: 'The selected transaction indicates the book was already returned.' }, { status: 400 });

      const book = await Book.findById(transaction.bookId);
      if (!book) {
        console.error(`Book with ID ${transaction.bookId} not found during return for transaction ${transaction._id}`);
        return NextResponse.json({ error: 'Associated book not found. Data inconsistency.', details: `Book ID ${transaction.bookId} from transaction ${transaction._id} could not be found.` }, { status: 500 });
      }

      transaction.isReturned = true;
      transaction.returnDate = new Date();
      if (notes) transaction.notes = `${transaction.notes || ''}\nReturn Note: ${notes}`.trim();
      
      // Fine calculation logic
      const dueDate = new Date(transaction.dueDate);
      const returnDate = new Date(transaction.returnDate);
      if (returnDate > dueDate) {
        // Example: Simple fine logic, 100 units per day overdue.
        // This should be configurable in a real application.
        const diffTime = Math.abs(returnDate.getTime() - dueDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        transaction.fineAmount = diffDays * 100; // Placeholder fine amount
        transaction.fineStatus = 'Pending';
      }

      await transaction.save();

      book.availableCopies += 1;
      await book.save();
      
      const populatedTransaction = await BookTransaction.findById(transaction._id)
        .populate('bookId', 'title')
        .populate('memberId', 'firstName lastName username')
        .lean();
      return NextResponse.json(populatedTransaction);

    } else if (body.action === 'update_fine_status') {
      const { bookTransactionId, fineAmount, fineStatus, finePaidDate, fineNotes } = body;
      if (!mongoose.Types.ObjectId.isValid(bookTransactionId)) {
        return NextResponse.json({ error: 'Invalid Book Transaction ID' }, { status: 400 });
      }
      const transaction = await BookTransaction.findById(bookTransactionId);
      if (!transaction) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

      if(fineAmount !== undefined) transaction.fineAmount = fineAmount;
      if(fineStatus) transaction.fineStatus = fineStatus;
      if(finePaidDate) transaction.finePaidDate = new Date(finePaidDate); else if (fineStatus === 'Paid') transaction.finePaidDate = new Date(); // Default to now if paid
      if(fineNotes) transaction.fineNotes = fineNotes;

      await transaction.save();
      return NextResponse.json({ message: 'Fine status updated successfully.', transaction });
    }
     else {
      return NextResponse.json({ error: 'Invalid action specified in request body', details: "The 'action' field must be 'borrow', 'return', or 'update_fine_status'." }, { status: 400 });
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
        const errStr = error.toString();
        errorDetailString = errStr === '[object Object]' ? 'An unexpected error object was thrown.' : errStr;
    }

    return NextResponse.json({ error: 'Failed to process book transaction', details: String(errorDetailString) }, { status: 500 });
  }
}


export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin', 'librarian'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized', details: 'User role not permitted for this action.' }, { status: 403 });
  }
  if (token.role !== 'superadmin' && token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized for this school', details: 'User not authorized for the specified school.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('memberId');
  const bookId = searchParams.get('bookId');
  const status = searchParams.get('status');
  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const BookTransaction = tenantDb.models.BookTransaction as mongoose.Model<IBookTransaction>;

    const query: any = {};
    if (memberId && mongoose.Types.ObjectId.isValid(memberId)) query.memberId = new mongoose.Types.ObjectId(memberId);
    if (bookId && mongoose.Types.ObjectId.isValid(bookId)) query.bookId = new mongoose.Types.ObjectId(bookId);
    if (startDateStr && endDateStr) {
      const startDate = new Date(startDateStr);
      startDate.setUTCHours(0,0,0,0);
      const endDate = new Date(endDateStr);
      endDate.setUTCHours(23,59,59,999);
      query.borrowDate = { $gte: startDate, $lte: endDate };
    }

    switch(status) {
        case 'borrowed':
            query.isReturned = false;
            break;
        case 'returned':
            query.isReturned = true;
            break;
        case 'overdue':
            query.isReturned = false;
            query.dueDate = { $lt: new Date() };
            break;
        case 'fine_pending':
            query.fineStatus = 'Pending';
            query.fineAmount = { $gt: 0 };
            break;
        case 'fine_paid':
            query.fineStatus = { $in: ['Paid', 'Waived'] };
            break;
        case 'all':
        default:
            // No additional status filter
            break;
    }


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
    return NextResponse.json({ error: 'Failed to fetch book transactions', details: String(errorDetailString) }, { status: 500 });
  }
}
