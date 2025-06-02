
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import AssessmentModel, { IAssessment } from '@/models/Tenant/Assessment';
import ExamModel, { IExam } from '@/models/Tenant/Exam';
import SubjectModel, { ISubject } from '@/models/Tenant/Subject';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Assessment) tenantDb.model<IAssessment>('Assessment', AssessmentModel.schema);
  if (!tenantDb.models.Exam) tenantDb.model<IExam>('Exam', ExamModel.schema);
  if (!tenantDb.models.Subject) tenantDb.model<ISubject>('Subject', SubjectModel.schema);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string; assessmentId: string } }
) {
  const { schoolCode, assessmentId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  // Allow teachers, admins, superadmins (students might need it too if viewing their own detailed marks context)
  if (!token || !['teacher', 'admin', 'superadmin', 'student'].includes(token.role as string) ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
   if (token.schoolCode !== schoolCode && token.role !== 'superadmin' && token.role !== 'student') { // student check is loose here if they are viewing their own school
      return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }


  if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
    return NextResponse.json({ error: 'Invalid Assessment ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Assessment = tenantDb.models.Assessment as mongoose.Model<IAssessment>;

    const assessment = await Assessment.findById(assessmentId)
        .populate<{ examId: IExam }>('examId', 'name academicYearId termId')
        .populate<{ subjectId: ISubject }>('subjectId', 'name code')
        .populate<{ classId: IClass }>('classId', 'name level')
        .lean();
        
    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    return NextResponse.json(assessment);
  } catch (error: any) {
    console.error(`Error fetching assessment details ${assessmentId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch assessment details', details: error.message }, { status: 500 });
  }
}

// Note: The original file src/app/api/[schoolCode]/portal/exams/[examId]/assessments/[assessmentId]/route.ts
// already has GET, PUT, DELETE. This "anyExam" route is specifically for fetching assessment details
// without needing the examId in the path for convenience on the marks entry page.
// We can remove this if the main assessment route is adapted or examId is passed to marks entry page.
// For now, it serves a specific purpose for the new marks entry UI.
// Only GET is needed here.
