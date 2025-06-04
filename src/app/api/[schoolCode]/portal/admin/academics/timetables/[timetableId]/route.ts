
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import TimetableModel, { ITimetable, ITimetabledPeriod } from '@/models/Tenant/Timetable';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import TermModel, { ITerm } from '@/models/Tenant/Term';
import SubjectModel, { ISubject } from '@/models/Tenant/Subject'; // For populating periods
import TenantUserModel, { ITenantUser } from '@/models/Tenant/User'; // For populating periods
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Timetable) tenantDb.model<ITimetable>('Timetable', TimetableModel.schema);
  if (!tenantDb.models.AcademicYear) tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
  if (!tenantDb.models.Term) tenantDb.model<ITerm>('Term', TermModel.schema);
  if (!tenantDb.models.Subject) tenantDb.model<ISubject>('Subject', SubjectModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserModel.schema);
}

function timesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };
  const startAMin = parseTime(startA);
  const endAMin = parseTime(endA);
  const startBMin = parseTime(startB);
  const endBMin = parseTime(endB);

  return startAMin < endBMin && endAMin > startBMin;
}

async function checkConflicts(
  periods: ITimetabledPeriod[], // Periods from request body (subjectId, teacherId might be strings)
  currentTimetableId: string,
  academicYearId: mongoose.Types.ObjectId,
  termId: mongoose.Types.ObjectId | null | undefined,
  classId: mongoose.Types.ObjectId, // classId of the timetable being checked
  tenantDb: mongoose.Connection
): Promise<string | null> {
  const Timetable = tenantDb.models.Timetable as mongoose.Model<ITimetable>;
  const User = tenantDb.models.User as mongoose.Model<ITenantUser>;
  const Subject = tenantDb.models.Subject as mongoose.Model<ISubject>;

  // Validate incoming periods ensure string IDs are valid ObjectIds before use
  for (const p of periods) {
    if (!mongoose.Types.ObjectId.isValid(p.subjectId.toString())) return `Invalid Subject ID format: ${p.subjectId}`;
    if (!mongoose.Types.ObjectId.isValid(p.teacherId.toString())) return `Invalid Teacher ID format: ${p.teacherId}`;
  }


  for (let i = 0; i < periods.length; i++) {
    for (let j = i + 1; j < periods.length; j++) {
      const p1 = periods[i];
      const p2 = periods[j];
      if (p1.dayOfWeek === p2.dayOfWeek && timesOverlap(p1.startTime, p1.endTime, p2.startTime, p2.endTime)) {
        const p1Subject = await Subject.findById(p1.subjectId.toString()).select('name').lean();
        const p2Subject = await Subject.findById(p2.subjectId.toString()).select('name').lean();
        return `Class conflict: Periods for ${p1Subject?.name || 'Unknown Subject'} (${p1.startTime}-${p1.endTime}) and ${p2Subject?.name || 'Unknown Subject'} (${p2.startTime}-${p2.endTime}) on ${p1.dayOfWeek} overlap within this timetable.`;
      }
    }
  }

  const otherActiveTimetablesQuery: any = {
    _id: { $ne: new mongoose.Types.ObjectId(currentTimetableId) },
    academicYearId: academicYearId,
    isActive: true,
  };
  if (termId) {
    otherActiveTimetablesQuery.termId = termId;
  } else {
    otherActiveTimetablesQuery.termId = { $exists: false };
  }

  const otherActiveTimetables = await Timetable.find(otherActiveTimetablesQuery)
    .populate<{ classId: IClass }>('classId', 'name')
    .populate<{ periods: { subjectId: ISubject, teacherId: ITenantUser}[] }>([
        { path: 'periods.subjectId', model: 'Subject', select: 'name' },
        { path: 'periods.teacherId', model: 'User', select: 'firstName lastName username _id' } // Ensure _id is selected
    ])
    .lean();

  for (const currentPeriod of periods) {
    for (const otherTT of otherActiveTimetables) {
      for (const otherPeriod of otherTT.periods) {
        if (currentPeriod.dayOfWeek === otherPeriod.dayOfWeek && timesOverlap(currentPeriod.startTime, currentPeriod.endTime, otherPeriod.startTime, otherPeriod.endTime)) {
          if (currentPeriod.teacherId && (otherPeriod.teacherId as any)?._id && currentPeriod.teacherId.toString() === (otherPeriod.teacherId as any)?._id.toString()) {
            const conflictTeacher = otherPeriod.teacherId as ITenantUser; // Now this is the populated user object
            return `Teacher Conflict: ${conflictTeacher?.firstName} ${conflictTeacher?.lastName} is already scheduled for class ${(otherTT.classId as IClass).name} - subject ${(otherPeriod.subjectId as ISubject).name} on ${currentPeriod.dayOfWeek} from ${otherPeriod.startTime} to ${otherPeriod.endTime}.`;
          }
          if (currentPeriod.location && otherPeriod.location && currentPeriod.location.trim() !== '' && currentPeriod.location.trim().toLowerCase() === otherPeriod.location.trim().toLowerCase()) {
            return `Location Conflict: Location "${currentPeriod.location}" is already booked for class ${(otherTT.classId as IClass).name} - subject ${(otherPeriod.subjectId as ISubject).name} on ${currentPeriod.dayOfWeek} from ${otherPeriod.startTime} to ${otherPeriod.endTime}.`;
          }
        }
      }
    }
  }
  return null; 
}


export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string; timetableId: string } }
) {
  const { schoolCode, timetableId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
     if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(timetableId)) {
    return NextResponse.json({ error: 'Invalid Timetable ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Timetable = tenantDb.models.Timetable as mongoose.Model<ITimetable>;

    const timetable = await Timetable.findById(timetableId)
      .populate('academicYearId', 'name')
      .populate('classId', 'name level')
      .populate('termId', 'name')
      .populate({ path: 'periods.subjectId', model: 'Subject', select: 'name code' })
      .populate({ path: 'periods.teacherId', model: 'User', select: 'firstName lastName username' })
      .lean();

    if (!timetable) {
      return NextResponse.json({ error: 'Timetable not found' }, { status: 404 });
    }
    return NextResponse.json(timetable);
  } catch (error: any) {
    console.error(`Error fetching timetable ${timetableId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch timetable', details: String(error.message || 'Unknown error') }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string; timetableId: string } }
) {
  const { schoolCode, timetableId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(timetableId)) {
    return NextResponse.json({ error: 'Invalid Timetable ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, academicYearId, classId, termId, periods, description, isActive } = body;

    if (!name || !academicYearId || !classId) {
      return NextResponse.json({ error: 'Missing required fields: name, academicYearId, classId' }, { status: 400 });
    }
    
    if (!mongoose.Types.ObjectId.isValid(academicYearId) || 
        !mongoose.Types.ObjectId.isValid(classId) ||
        (termId && !mongoose.Types.ObjectId.isValid(termId))) {
        return NextResponse.json({ error: 'Invalid ID format for academicYearId, classId, or termId' }, { status: 400 });
    }
    
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Timetable = tenantDb.models.Timetable as mongoose.Model<ITimetable>;

    const timetableToUpdate = await Timetable.findById(timetableId);
    if (!timetableToUpdate) {
      return NextResponse.json({ error: 'Timetable not found' }, { status: 404 });
    }

    if (name !== timetableToUpdate.name || 
        academicYearId.toString() !== timetableToUpdate.academicYearId.toString() ||
        classId.toString() !== timetableToUpdate.classId.toString() ||
        (termId?.toString() || null) !== (timetableToUpdate.termId?.toString() || null)
    ) {
      const existingTimetable = await Timetable.findOne({ 
          name, academicYearId, classId, termId: termId || null, _id: { $ne: timetableId } 
      });
      if (existingTimetable) {
        return NextResponse.json({ error: 'Another timetable with this name already exists for the selected class, academic year, and term.' }, { status: 409 });
      }
    }
    
    const validPeriods = (periods || []).map((p: any) => ({
      ...p,
      _id: p._id ? new mongoose.Types.ObjectId(p._id.toString()) : new mongoose.Types.ObjectId(), // Ensure _id is ObjectId
      subjectId: new mongoose.Types.ObjectId(p.subjectId.toString()),
      teacherId: new mongoose.Types.ObjectId(p.teacherId.toString()),
    }));


    if (validPeriods && validPeriods.length > 0) {
        const conflictMessage = await checkConflicts(
            validPeriods as ITimetabledPeriod[], 
            timetableId, 
            new mongoose.Types.ObjectId(academicYearId),
            termId ? new mongoose.Types.ObjectId(termId) : null,
            new mongoose.Types.ObjectId(classId),
            tenantDb
        );
        if (conflictMessage) {
            return NextResponse.json({ error: `Conflict detected: ${conflictMessage}` }, { status: 409 });
        }
    }


    if (isActive && !timetableToUpdate.isActive) {
        await Timetable.updateMany(
            { classId: timetableToUpdate.classId, academicYearId: timetableToUpdate.academicYearId, termId: timetableToUpdate.termId || null, isActive: true, _id: { $ne: timetableId } },
            { $set: { isActive: false } }
        );
    }

    timetableToUpdate.name = name;
    timetableToUpdate.academicYearId = academicYearId;
    timetableToUpdate.classId = classId;
    timetableToUpdate.termId = termId || undefined;
    timetableToUpdate.periods = validPeriods;
    timetableToUpdate.description = description;
    timetableToUpdate.isActive = isActive !== undefined ? isActive : timetableToUpdate.isActive;
    timetableToUpdate.version = (timetableToUpdate.version || 0) + 1; 

    await timetableToUpdate.save();
    const populatedTimetable = await Timetable.findById(timetableToUpdate._id)
      .populate('academicYearId', 'name')
      .populate('classId', 'name level')
      .populate('termId', 'name')
      .populate({ path: 'periods.subjectId', model: 'Subject', select: 'name code' })
      .populate({ path: 'periods.teacherId', model: 'User', select: 'firstName lastName username' })
      .lean();
    return NextResponse.json(populatedTimetable);
  } catch (error: any) {
    console.error(`Error updating timetable ${timetableId} for ${schoolCode}:`, error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Timetable name, class, academic year, and term combination must be unique.' }, { status: 409 });
    }
    if (error instanceof mongoose.Error.ValidationError) {
        const messages = Object.values(error.errors).map((e: any) => e.message).join(', ');
        return NextResponse.json({ error: 'Validation failed', details: messages || 'Please check your input.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update timetable', details: String(error.message || 'Unknown error') }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { schoolCode: string; timetableId: string } }
) {
  const { schoolCode, timetableId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

 if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(timetableId)) {
    return NextResponse.json({ error: 'Invalid Timetable ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Timetable = tenantDb.models.Timetable as mongoose.Model<ITimetable>;

    const result = await Timetable.deleteOne({ _id: timetableId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Timetable not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Timetable deleted successfully' });
  } catch (error: any) {
    console.error(`Error deleting timetable ${timetableId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to delete timetable', details: String(error.message || 'Unknown error') }, { status: 500 });
  }
}
