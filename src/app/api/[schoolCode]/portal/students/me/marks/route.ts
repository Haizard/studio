
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import MarkModel, { IMark } from '@/models/Tenant/Mark';
import AssessmentModel, { IAssessment } from '@/models/Tenant/Assessment';
import ExamModel, { IExam } from '@/models/Tenant/Exam';
import SubjectModel, { ISubject } from '@/models/Tenant/Subject';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import TermModel, { ITerm } from '@/models/Tenant/Term';
import TenantUserModel, { ITenantUser } from '@/models/Tenant/User';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Mark) tenantDb.model<IMark>('Mark', MarkModel.schema);
  if (!tenantDb.models.Assessment) tenantDb.model<IAssessment>('Assessment', AssessmentModel.schema);
  if (!tenantDb.models.Exam) tenantDb.model<IExam>('Exam', ExamModel.schema);
  if (!tenantDb.models.Subject) tenantDb.model<ISubject>('Subject', SubjectModel.schema);
  if (!tenantDb.models.AcademicYear) tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
  if (!tenantDb.models.Term) tenantDb.model<ITerm>('Term', TermModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserModel.schema);
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.role !== 'student' || token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const academicYearId = searchParams.get('academicYearId');
  const termId = searchParams.get('termId'); // Optional

  if (!academicYearId || !mongoose.Types.ObjectId.isValid(academicYearId)) {
    return NextResponse.json({ error: 'Valid Academic Year ID is required' }, { status: 400 });
  }
  if (termId && !mongoose.Types.ObjectId.isValid(termId)) {
    return NextResponse.json({ error: 'Invalid Term ID provided' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    
    const Mark = tenantDb.models.Mark as mongoose.Model<IMark>;
    const Assessment = tenantDb.models.Assessment as mongoose.Model<IAssessment>;
    const Exam = tenantDb.models.Exam as mongoose.Model<IExam>;

    // 1. Find IDs of exams that are 'Published' and match the academic year/term criteria
    const examQuery: any = { 
        academicYearId: new mongoose.Types.ObjectId(academicYearId), // Ensure it's ObjectId
        status: 'Published' 
    };
    if (termId) {
        examQuery.termId = new mongoose.Types.ObjectId(termId); // Ensure it's ObjectId
    } else {
        // If no termId is provided, we might want to fetch exams that either have no termId or match null
        // For simplicity, let's assume if termId is not given, we don't filter by it.
        // Or, if your exams always have terms unless they are year-long, adjust as needed.
        // This might fetch exams that have a termId if one isn't provided, which might be okay.
        // To explicitly fetch exams with no termId: examQuery.termId = null;
    }
    const publishedExams = await Exam.find(examQuery).select('_id').lean();
    const publishedExamIds = publishedExams.map(exam => exam._id);

    if (publishedExamIds.length === 0) {
        return NextResponse.json([]); // No published exams for this criteria
    }

    // 2. Find assessments belonging to these published exams
    const relevantAssessments = await Assessment.find({ examId: { $in: publishedExamIds } }).select('_id').lean();
    const relevantAssessmentIds = relevantAssessments.map(assessment => assessment._id);

    if (relevantAssessmentIds.length === 0) {
        return NextResponse.json([]); // No assessments for these published exams
    }

    // 3. Fetch marks for the student for these relevant assessments
    const marksQuery: any = {
      studentId: new mongoose.Types.ObjectId(token.uid as string), // Ensure it's ObjectId
      assessmentId: { $in: relevantAssessmentIds },
      academicYearId: new mongoose.Types.ObjectId(academicYearId), // Ensure it's ObjectId
    };
    if (termId) {
      marksQuery.termId = new mongoose.Types.ObjectId(termId); // Ensure it's ObjectId
    }
    
    const studentMarks = await Mark.find(marksQuery)
      .populate<{ assessmentId: IAssessment }>({
        path: 'assessmentId',
        select: 'assessmentName maxMarks assessmentDate assessmentType subjectId examId',
        populate: [
          { path: 'subjectId', model: 'Subject', select: 'name code' },
          { path: 'examId', model: 'Exam', select: 'name' } // examId on assessment is already ObjectId
        ]
      })
      .populate<{ academicYearId: IAcademicYear }>('academicYearId', 'name')
      .populate<{ termId?: ITerm }>('termId', 'name') // termId on Mark model is optional
      .sort({ 'assessmentId.examId.name': 1, 'assessmentId.subjectId.name': 1, 'assessmentId.assessmentDate': 1 })
      .lean();

    return NextResponse.json(studentMarks);

  } catch (error: any) {
    console.error(`Error fetching marks for student ${token.uid}, school ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch student marks', details: error.message, stack: error.stack }, { status: 500 });
  }
}
