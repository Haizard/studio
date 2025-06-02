
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

    // Find IDs of exams that are 'Published' and match the academic year/term criteria
    const examQuery: any = { 
        academicYearId,
        status: 'Published' 
    };
    if (termId) {
        examQuery.termId = termId;
    }
    const publishedExams = await Exam.find(examQuery).select('_id').lean();
    const publishedExamIds = publishedExams.map(exam => exam._id);

    if (publishedExamIds.length === 0) {
        return NextResponse.json([]); // No published exams for this criteria
    }

    // Find assessments belonging to these published exams
    const relevantAssessments = await Assessment.find({ examId: { $in: publishedExamIds } }).select('_id').lean();
    const relevantAssessmentIds = relevantAssessments.map(assessment => assessment._id);

    if (relevantAssessmentIds.length === 0) {
        return NextResponse.json([]); // No assessments for these published exams
    }

    // Fetch marks for the student for these relevant assessments
    const marksQuery: any = {
      studentId: token.uid,
      assessmentId: { $in: relevantAssessmentIds },
      academicYearId, // Ensure marks belong to the selected academic year
    };
    if (termId) {
      marksQuery.termId = termId;
    }
    
    const studentMarks = await Mark.find(marksQuery)
      .populate<{ assessmentId: IAssessment }>({
        path: 'assessmentId',
        select: 'assessmentName maxMarks assessmentDate assessmentType subjectId examId',
        populate: [
          { path: 'subjectId', model: 'Subject', select: 'name code' },
          { path: 'examId', model: 'Exam', select: 'name' }
        ]
      })
      .populate<{ academicYearId: IAcademicYear }>('academicYearId', 'name')
      .populate<{ termId: ITerm }>('termId', 'name')
      .sort({ 'assessmentId.examId.name': 1, 'assessmentId.subjectId.name': 1, 'assessmentId.assessmentDate': 1 })
      .lean();

    return NextResponse.json(studentMarks);

  } catch (error: any) {
    console.error(`Error fetching marks for student ${token.uid}, school ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch student marks', details: error.message }, { status: 500 });
  }
}
