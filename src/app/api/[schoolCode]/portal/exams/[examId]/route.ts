
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import ExamModel, { IExam } from '@/models/Tenant/Exam';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import TermModel, { ITerm } from '@/models/Tenant/Term';
// Import AssessmentModel if needed for deletion checks
// import AssessmentModel, { IAssessment } from '@/models/Tenant/Assessment';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Exam) {
    tenantDb.model<IExam>('Exam', ExamModel.schema);
  }
  if (!tenantDb.models.AcademicYear) {
    tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
  }
  if (!tenantDb.models.Term) {
    tenantDb.model<ITerm>('Term', TermModel.schema);
  }
  // if (!tenantDb.models.Assessment) { // For deletion checks
  //   tenantDb.model<IAssessment>('Assessment', AssessmentModel.schema);
  // }
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string; examId: string } }
) {
  const { schoolCode, examId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized for this school or role' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(examId)) {
    return NextResponse.json({ error: 'Invalid Exam ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Exam = tenantDb.models.Exam as mongoose.Model<IExam>;

    const exam = await Exam.findById(examId)
        .populate('academicYearId', 'name')
        .populate('termId', 'name')
        .lean();
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }
    return NextResponse.json(exam);
  } catch (error: any) {
    console.error(`Error fetching exam ${examId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch exam', details: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string; examId: string } }
) {
  const { schoolCode, examId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
     if (!(token?.role === 'superadmin' && schoolCode)) {
        return NextResponse.json({ error: 'Unauthorized for this school or role' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(examId)) {
    return NextResponse.json({ error: 'Invalid Exam ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, academicYearId, termId, startDate, endDate, description, status, weight } = body;

    if (!name || !academicYearId || !startDate || !endDate || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
     if (!mongoose.Types.ObjectId.isValid(academicYearId)) {
        return NextResponse.json({ error: 'Invalid Academic Year ID' }, { status: 400 });
    }
    if (termId && !mongoose.Types.ObjectId.isValid(termId)) {
        return NextResponse.json({ error: 'Invalid Term ID' }, { status: 400 });
    }
    if (weight !== undefined && (typeof weight !== 'number' || weight < 0 || weight > 100)) {
        return NextResponse.json({ error: 'Weight must be a number between 0 and 100.' }, { status: 400 });
    }


    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Exam = tenantDb.models.Exam as mongoose.Model<IExam>;

    const examToUpdate = await Exam.findById(examId);
    if (!examToUpdate) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    const existingCheckQuery: any = { 
        name, 
        academicYearId,
        _id: { $ne: examId } 
    };
    if (termId) existingCheckQuery.termId = termId;
    else existingCheckQuery.termId = null;


    if (name !== examToUpdate.name || 
        academicYearId.toString() !== examToUpdate.academicYearId.toString() ||
        (termId?.toString() || null) !== (examToUpdate.termId?.toString() || null)
    ) {
        const existingExam = await Exam.findOne(existingCheckQuery);
        if (existingExam) {
          return NextResponse.json({ error: 'Another exam with this name already exists for the selected academic year and term.' }, { status: 409 });
        }
    }
    
    examToUpdate.name = name;
    examToUpdate.academicYearId = academicYearId;
    examToUpdate.termId = termId || undefined;
    examToUpdate.startDate = new Date(startDate);
    examToUpdate.endDate = new Date(endDate);
    examToUpdate.description = description;
    examToUpdate.status = status;
    examToUpdate.weight = weight !== undefined ? weight : examToUpdate.weight;


    await examToUpdate.save();
    const populatedExam = await Exam.findById(examToUpdate._id)
        .populate('academicYearId', 'name')
        .populate('termId', 'name')
        .lean();
    return NextResponse.json(populatedExam);
  } catch (error: any) {
    console.error(`Error updating exam ${examId} for ${schoolCode}:`, error);
    if (error.code === 11000) {
        return NextResponse.json({ error: 'Exam name might already exist for the selected academic year and term.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update exam', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { schoolCode: string; examId: string } }
) {
  const { schoolCode, examId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
        return NextResponse.json({ error: 'Unauthorized for this school or role' }, { status: 403 });
    }
  }
  
  if (!mongoose.Types.ObjectId.isValid(examId)) {
    return NextResponse.json({ error: 'Invalid Exam ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Exam = tenantDb.models.Exam as mongoose.Model<IExam>;
    // const Assessment = tenantDb.models.Assessment as mongoose.Model<IAssessment>;

    // Check if there are any assessments linked to this exam
    // const relatedAssessments = await Assessment.countDocuments({ examId });
    // if (relatedAssessments > 0) {
    //   return NextResponse.json({ error: 'Cannot delete exam. It has associated assessments.' }, { status: 400 });
    // }

    const result = await Exam.deleteOne({ _id: examId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Exam deleted successfully' });
  } catch (error: any) {
    console.error(`Error deleting exam ${examId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to delete exam', details: error.message }, { status: 500 });
  }
}
