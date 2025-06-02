
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import MarkModel, { IMark } from '@/models/Tenant/Mark';
import AssessmentModel, { IAssessment } from '@/models/Tenant/Assessment';
import ExamModel, { IExam } from '@/models/Tenant/Exam'; // To get academicYearId/termId
import TenantUserModel, { ITenantUser } from '@/models/Tenant/User'; // To validate studentId
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

interface MarkEntry {
  studentId: string;
  marksObtained?: number | null; // Allow null to clear marks
  comments?: string;
}

interface BatchMarksPayload {
  assessmentId: string;
  marks: MarkEntry[];
}

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Mark) tenantDb.model<IMark>('Mark', MarkModel.schema);
  if (!tenantDb.models.Assessment) tenantDb.model<IAssessment>('Assessment', AssessmentModel.schema);
  if (!tenantDb.models.Exam) tenantDb.model<IExam>('Exam', ExamModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserModel.schema);
}

export async function POST(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'teacher' && token.role !== 'admin' && token.role !== 'superadmin')) {
    return NextResponse.json({ error: 'Unauthorized: Only teachers, admins, or superadmins can submit marks.' }, { status: 403 });
  }
  if ((token.role === 'teacher' || token.role === 'admin') && token.schoolCode !== schoolCode) {
      return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }


  try {
    const body: BatchMarksPayload = await request.json();
    const { assessmentId, marks } = body;

    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      return NextResponse.json({ error: 'Invalid Assessment ID' }, { status: 400 });
    }
    if (!Array.isArray(marks) || marks.length === 0) {
      return NextResponse.json({ error: 'Marks data is required and must be an array' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Mark = tenantDb.models.Mark as mongoose.Model<IMark>;
    const Assessment = tenantDb.models.Assessment as mongoose.Model<IAssessment>;
    const Exam = tenantDb.models.Exam as mongoose.Model<IExam>;
    const User = tenantDb.models.User as mongoose.Model<ITenantUser>;

    const assessment = await Assessment.findById(assessmentId).populate<{examId: IExam}>('examId').lean();
    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    if (!assessment.examId || !(assessment.examId as IExam).academicYearId) {
        return NextResponse.json({ error: 'Assessment is not properly linked to an exam with an academic year.' }, { status: 400 });
    }

    const academicYearId = (assessment.examId as IExam).academicYearId;
    const termId = (assessment.examId as IExam).termId;


    const operations = marks.map(async (entry) => {
      if (!mongoose.Types.ObjectId.isValid(entry.studentId)) {
        console.warn(`Invalid Student ID skipped: ${entry.studentId}`);
        return null; // Skip invalid student IDs
      }
      // Validate student exists and is a student
      const studentUser = await User.findOne({_id: entry.studentId, role: 'student'}).lean();
      if (!studentUser) {
        console.warn(`Student with ID ${entry.studentId} not found or is not a student. Skipped.`);
        return null;
      }


      const marksObtained = (entry.marksObtained === null || entry.marksObtained === undefined || isNaN(Number(entry.marksObtained))) 
        ? undefined 
        : Number(entry.marksObtained);

      if (marksObtained !== undefined && (marksObtained < 0 || marksObtained > assessment.maxMarks)) {
         console.warn(`Marks for student ${entry.studentId} (${marksObtained}) out of range (0-${assessment.maxMarks}). Skipped.`);
         // Or, alternatively, cap the marks:
         // marksObtained = Math.max(0, Math.min(assessment.maxMarks, marksObtained));
         return null; // Or throw an error for the batch
      }
      

      return Mark.updateOne(
        { assessmentId, studentId: entry.studentId },
        {
          $set: {
            marksObtained: marksObtained, // Allows clearing marks if null/undefined is passed
            comments: entry.comments || '',
            recordedById: token.uid,
            academicYearId: academicYearId,
            termId: termId || undefined,
          },
          $setOnInsert: { // these fields are set only on insert
            assessmentId,
            studentId: entry.studentId,
          }
        },
        { upsert: true }
      );
    });

    await Promise.all(operations.filter(op => op !== null));

    return NextResponse.json({ message: 'Marks processed successfully' });

  } catch (error: any) {
    console.error(`Error processing batch marks for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to process marks', details: error.message }, { status: 500 });
  }
}
