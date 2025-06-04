
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

// Helper function to check for time overlaps
function timesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  // Convert HH:mm to minutes from midnight for easier comparison
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
  periods: ITimetabledPeriod[],
  currentTimetableId: string,
  academicYearId: mongoose.Types.ObjectId,
  termId: mongoose.Types.ObjectId | null | undefined,
  classId: mongoose.Types.ObjectId,
  tenantDb: mongoose.Connection
): Promise<string | null> {
  const Timetable = tenantDb.models.Timetable as mongoose.Model<ITimetable>;
  const Class = tenantDb.models.Class as mongoose.Model<IClass>;
  const User = tenantDb.models.User as mongoose.Model<ITenantUser>;
  const Subject = tenantDb.models.Subject as mongoose.Model<ISubject>;

  // 1. Internal conflicts within the current timetable's proposed periods
  for (let i = 0; i < periods.length; i++) {
    for (let j = i + 1; j < periods.length; j++) {
      const p1 = periods[i];
      const p2 = periods[j];
      if (p1.dayOfWeek === p2.dayOfWeek && timesOverlap(p1.startTime, p1.endTime, p2.startTime, p2.endTime)) {
        const p1Subject = await Subject.findById(p1.subjectId).select('name').lean();
        const p2Subject = await Subject.findById(p2.subjectId).select('name').lean();
        return `Class conflict: Periods for ${p1Subject?.name} (${p1.startTime}-${p1.endTime}) and ${p2Subject?.name} (${p2.startTime}-${p2.endTime}) on ${p1.dayOfWeek} overlap.`;
      }
    }
  }

  // 2. External conflicts (Teacher and Location)
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
        { path: 'periods.teacherId', model: 'User', select: 'firstName lastName username' }
    ])
    .lean();

  for (const currentPeriod of periods) {
    for (const otherTT of otherActiveTimetables) {
      for (const otherPeriod of otherTT.periods) {
        if (currentPeriod.dayOfWeek === otherPeriod.dayOfWeek && timesOverlap(currentPeriod.startTime, currentPeriod.endTime, otherPeriod.startTime, otherPeriod.endTime)) {
          // Check Teacher Conflict
          if (currentPeriod.teacherId && otherPeriod.teacherId && currentPeriod.teacherId.toString() === (otherPeriod.teacherId as any)?._id.toString()) {
            const conflictTeacher = await User.findById(currentPeriod.teacherId).select('firstName lastName').lean();
            return `Teacher Conflict: ${conflictTeacher?.firstName} ${conflictTeacher?.lastName} is already scheduled for class ${(otherTT.classId as IClass).name} - subject ${(otherPeriod.subjectId as ISubject).name} on ${currentPeriod.dayOfWeek} from ${otherPeriod.startTime} to ${otherPeriod.endTime}.`;
          }
          // Check Location Conflict (if location is not empty or null)
          if (currentPeriod.location && otherPeriod.location && currentPeriod.location.trim() !== '' && currentPeriod.location.trim().toLowerCase() === otherPeriod.location.trim().toLowerCase()) {
            return `Location Conflict: Location "${currentPeriod.location}" is already booked for class ${(otherTT.classId as IClass).name} - subject ${(otherPeriod.subjectId as ISubject).name} on ${currentPeriod.dayOfWeek} from ${otherPeriod.startTime} to ${otherPeriod.endTime}.`;
          }
        }
      }
    }
  }
  return null; // No conflicts found
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
    return NextResponse.json({ error: 'Failed to fetch timetable', details: error.message }, { status: 500 });
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

    // Uniqueness check for timetable definition
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
    
    // Conflict detection for periods
    if (periods && periods.length > 0) {
        const conflictMessage = await checkConflicts(
            periods as ITimetabledPeriod[], 
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
    timetableToUpdate.periods = periods || [];
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
    return NextResponse.json({ error: 'Failed to update timetable', details: error.message }, { status: 500 });
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
    return NextResponse.json({ error: 'Failed to delete timetable', details: error.message }, { status: 500 });
  }
}

