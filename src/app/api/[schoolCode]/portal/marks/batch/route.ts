
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import MarkModel, { IMark } from '@/models/Tenant/Mark';
import AssessmentModel, { IAssessment } from '@/models/Tenant/Assessment';
import ExamModel, { IExam } from '@/models/Tenant/Exam';
import TenantUserModel, { ITenantUser } from '@/models/Tenant/User';
import TeacherModel, { ITeacher } from '@/models/Tenant/Teacher'; // Import Teacher model
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

interface MarkEntry {
  studentId: string;
  marksObtained?: number | null;
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
  if (!tenantDb.models.Teacher) tenantDb.model<ITeacher>('Teacher', TeacherModel.schema); // Ensure Teacher model is registered
}

export async function POST(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.role !== 'teacher') { // Stricter: only teachers can submit marks via this route
    return NextResponse.json({ error: 'Unauthorized: Only teachers can submit marks.' }, { status: 403 });
  }
  if (token.schoolCode !== schoolCode) {
      return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  try {
    const body: BatchMarksPayload = await request.json();
    const { assessmentId, marks } = body;

    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      return NextResponse.json({ error: 'Invalid Assessment ID' }, { status: 400 });
    }
    if (!Array.isArray(marks)) { // Allow empty marks array for clearing, but must be an array
      return NextResponse.json({ error: 'Marks data must be an array' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Mark = tenantDb.models.Mark as mongoose.Model<IMark>;
    const Assessment = tenantDb.models.Assessment as mongoose.Model<IAssessment>;
    const Teacher = tenantDb.models.Teacher as mongoose.Model<ITeacher>;
    const User = tenantDb.models.User as mongoose.Model<ITenantUser>;

    const assessment = await Assessment.findById(assessmentId)
      .populate<{ examId: IExam }>('examId', 'academicYearId termId')
      .lean();
      
    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    if (!assessment.examId || !(assessment.examId as IExam).academicYearId) {
        return NextResponse.json({ error: 'Assessment is not properly linked to an exam with an academic year.' }, { status: 400 });
    }

    // Authorization Check: Verify teacher is assigned to this class & subject for this academic year
    const teacherProfile = await Teacher.findOne({ userId: token.uid }).lean();
    if (!teacherProfile) {
        return NextResponse.json({ error: "Teacher profile not found for submitting user." }, { status: 403 });
    }

    const assessmentAcademicYearId = (assessment.examId as IExam).academicYearId.toString();
    const assessmentClassId = assessment.classId.toString();
    const assessmentSubjectId = assessment.subjectId.toString();

    const isAuthorized = (teacherProfile.assignedClassesAndSubjects || []).some(
        (assignment: any) =>
            assignment.classId.toString() === assessmentClassId &&
            assignment.subjectId.toString() === assessmentSubjectId &&
            assignment.academicYearId.toString() === assessmentAcademicYearId
    );

    if (!isAuthorized) {
        return NextResponse.json({ error: "Unauthorized: You are not assigned to teach this subject to this class for the relevant academic year." }, { status: 403 });
    }
    // End Authorization Check

    const academicYearId = (assessment.examId as IExam).academicYearId;
    const termId = (assessment.examId as IExam).termId;

    const operations = marks.map(async (entry) => {
      if (!mongoose.Types.ObjectId.isValid(entry.studentId)) {
        console.warn(`Invalid Student ID skipped: ${entry.studentId}`);
        return null;
      }
      const studentUser = await User.findOne({_id: entry.studentId, role: 'student'}).lean();
      if (!studentUser) {
        console.warn(`Student with ID ${entry.studentId} not found or is not a student. Skipped.`);
        return null;
      }

      const marksObtained = (entry.marksObtained === null || entry.marksObtained === undefined || isNaN(Number(entry.marksObtained))) 
        ? undefined 
        : Number(entry.marksObtained);

      if (marksObtained !== undefined && (marksObtained < 0 || marksObtained > assessment.maxMarks)) {
         console.warn(`Marks for student ${entry.studentId} (${marksObtained}) out of range (0-${assessment.maxMarks}). Value will be capped or ignored depending on strictness.`);
         // Cap the marks or return an error. For now, let's cap it.
         // entry.marksObtained = Math.max(0, Math.min(assessment.maxMarks, marksObtained));
         // Or, to be stricter and prevent saving out-of-range marks:
         // throw new Error(`Marks for student ${studentUser.username} are out of range.`);
         // For now, we'll allow undefined to clear, but valid numbers must be in range.
         // This specific warning allows it to proceed, but it's better to reject or cap.
         // Let's make it stricter: if defined, must be in range.
         if (marksObtained < 0 || marksObtained > assessment.maxMarks) {
            console.error(`Marks for student ${entry.studentId} (${marksObtained}) are out of range (0-${assessment.maxMarks}). This entry will be skipped.`);
            return null; // Skip this invalid entry
         }
      }
      
      return Mark.updateOne(
        { assessmentId, studentId: entry.studentId },
        {
          $set: {
            marksObtained: marksObtained,
            comments: entry.comments || '',
            recordedById: token.uid, // Logged-in teacher's user ID
            academicYearId: academicYearId,
            termId: termId || undefined,
          },
          $setOnInsert: { 
            assessmentId,
            studentId: entry.studentId,
          }
        },
        { upsert: true }
      );
    });

    const results = await Promise.all(operations.filter(op => op !== null));
    const successfulOps = results.filter(r => r && (r.modifiedCount > 0 || r.upsertedCount > 0)).length;


    return NextResponse.json({ message: `Marks processed. ${successfulOps} records updated/inserted.`, results });

  } catch (error: any) {
    console.error(`Error processing batch marks for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to process marks', details: error.message }, { status: 500 });
  }
}
