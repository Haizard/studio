
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import StudentModel, { IStudent } from '@/models/Tenant/Student';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import TermModel, { ITerm } from '@/models/Tenant/Term';
import ExamModel, { IExam } from '@/models/Tenant/Exam';
import AssessmentModel, { IAssessment } from '@/models/Tenant/Assessment';
import MarkModel, { IMark } from '@/models/Tenant/Mark';
import GradingScaleModel, { IGradingScale, IGradeDefinition, IDivisionConfig } from '@/models/Tenant/GradingScale';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import SubjectModel, { ISubject } from '@/models/Tenant/Subject';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Student) tenantDb.model<IStudent>('Student', StudentModel.schema);
  if (!tenantDb.models.AcademicYear) tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
  if (!tenantDb.models.Term) tenantDb.model<ITerm>('Term', TermModel.schema);
  if (!tenantDb.models.Exam) tenantDb.model<IExam>('Exam', ExamModel.schema);
  if (!tenantDb.models.Assessment) tenantDb.model<IAssessment>('Assessment', AssessmentModel.schema);
  if (!tenantDb.models.Mark) tenantDb.model<IMark>('Mark', MarkModel.schema);
  if (!tenantDb.models.GradingScale) tenantDb.model<IGradingScale>('GradingScale', GradingScaleModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
  if (!tenantDb.models.Subject) tenantDb.model<ISubject>('Subject', SubjectModel.schema);
}

interface ReportExamResult {
  examName: string;
  examId: string;
  examWeight?: number;
  assessments: {
    assessmentName: string;
    assessmentType: string;
    subjectName: string;
    marksObtained?: number;
    maxMarks: number;
    percentage?: number;
  }[];
  examTotalMarksObtained: number;
  examTotalMaxMarks: number;
  examPercentage?: number;
  weightedContribution?: number;
}

interface TermReportData {
  student: {
    name: string;
    studentIdNumber?: string;
  };
  classDetails?: {
    name: string;
    level?: string;
  };
  academicYear: { name: string };
  term: { name: string };
  examResults: ReportExamResult[];
  termTotalWeightedScore?: number;
  termOverallPercentage?: number;
  termGrade?: string;
  termRemarks?: string;
  chartData: { name: string; percentage?: number }[];
  gradingScaleUsed?: string;
}

function applyGradingScale(percentage: number | undefined | null, gradingScale: IGradingScale | null): { grade: string; remarks: string; points?: number } {
  if (percentage === undefined || percentage === null || isNaN(percentage) || !gradingScale || !gradingScale.grades || gradingScale.grades.length === 0) {
    return { grade: 'N/A', remarks: 'N/A - Grading scale not applied or score missing' };
  }
  for (const gradeDef of gradingScale.grades) {
    if (percentage >= gradeDef.minScore && percentage <= gradeDef.maxScore) {
      return {
        grade: gradeDef.grade,
        remarks: gradeDef.remarks || 'N/A',
        points: gradeDef.points,
      };
    }
  }
  return { grade: 'N/A', remarks: 'N/A - Score out of defined grade ranges' };
}

async function findGradingScale(tenantDb: mongoose.Connection, academicYearId: mongoose.Types.ObjectId, studentClassLevel: string | null | undefined): Promise<IGradingScale | null> {
  const GradingScale = tenantDb.models.GradingScale as mongoose.Model<IGradingScale>;
  const queries: any[] = [];

  if (studentClassLevel) {
    queries.push({ academicYearId, level: studentClassLevel, isDefault: true });
    queries.push({ academicYearId, level: studentClassLevel });
  }
  queries.push({ academicYearId, level: { $in: [null, ''] }, isDefault: true });
  queries.push({ academicYearId, level: { $in: [null, ''] } });
  if (studentClassLevel) {
    queries.push({ academicYearId: { $in: [null, undefined] }, level: studentClassLevel, isDefault: true });
    queries.push({ academicYearId: { $in: [null, undefined] }, level: studentClassLevel });
  }
  queries.push({ isDefault: true, academicYearId: { $in: [null, undefined] }, level: { $in: [null, ''] } });
  queries.push({ academicYearId: { $in: [null, undefined] }, level: { $in: [null, ''] } });

  for (const query of queries) {
    const scale = await GradingScale.findOne(query).sort({ createdAt: -1 }).lean<IGradingScale>();
    if (scale) return scale;
  }
  return null;
}


export async function GET(
  request: Request,
  { params: routeParams }: { params: { schoolCode: string; studentProfileId: string } }
) {
  const { schoolCode, studentProfileId: studentProfileIdParam } = routeParams;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  const { searchParams } = new URL(request.url);
  const academicYearIdParam = searchParams.get('academicYearId');
  const termIdParam = searchParams.get('termId');

  if (!mongoose.Types.ObjectId.isValid(studentProfileIdParam) || !academicYearIdParam || !mongoose.Types.ObjectId.isValid(academicYearIdParam) || !termIdParam || !mongoose.Types.ObjectId.isValid(termIdParam)) {
    return NextResponse.json({ error: 'Invalid or missing Student ID, Academic Year ID, or Term ID.' }, { status: 400 });
  }

  const academicYearObjectId = new mongoose.Types.ObjectId(academicYearIdParam);
  const termObjectId = new mongoose.Types.ObjectId(termIdParam);
  const studentProfileObjectId = new mongoose.Types.ObjectId(studentProfileIdParam);

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);

    const Student = tenantDb.models.Student as mongoose.Model<IStudent>;
    const AcademicYear = tenantDb.models.AcademicYear as mongoose.Model<IAcademicYear>;
    const Term = tenantDb.models.Term as mongoose.Model<ITerm>;
    const Exam = tenantDb.models.Exam as mongoose.Model<IExam>;

    const [studentProfile, academicYear, term] = await Promise.all([
      Student.findById(studentProfileObjectId).populate<{ userId: ITenantUser }>('userId', 'firstName lastName _id').populate<{ currentClassId?: IClass }>('currentClassId', 'name level').lean(),
      AcademicYear.findById(academicYearObjectId).lean(),
      Term.findById(termObjectId).lean(),
    ]);

    if (!studentProfile || !studentProfile.userId) return NextResponse.json({ error: 'Student profile or linked user not found.' }, { status: 404 });
    if (!academicYear) return NextResponse.json({ error: 'Academic year not found.' }, { status: 404 });
    if (!term) return NextResponse.json({ error: 'Term not found.' }, { status: 404 });

    const studentUserId = studentProfile.userId._id;
    const studentClassLevel = studentProfile.currentClassId?.level || null;
    const gradingScale = await findGradingScale(tenantDb, academicYearObjectId, studentClassLevel);

    const aggregatedExamData = await Exam.aggregate([
      {
        $match: {
          academicYearId: academicYearObjectId,
          termId: termObjectId,
          status: 'Published',
        },
      },
      {
        $lookup: {
          from: 'assessments', // Mongoose default collection name for Assessment model
          localField: '_id',
          foreignField: 'examId',
          as: 'assessmentsArr',
        },
      },
      { $unwind: '$assessmentsArr' },
      {
        $lookup: {
          from: 'subjects', // Mongoose default collection name for Subject model
          localField: 'assessmentsArr.subjectId',
          foreignField: '_id',
          as: 'assessmentsArr.subjectDetails',
        },
      },
      { $unwind: { path: '$assessmentsArr.subjectDetails', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'marks', // Mongoose default collection name for Mark model
          let: { assessment_id: '$assessmentsArr._id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$assessmentId', '$$assessment_id'] },
                    { $eq: ['$studentId', studentUserId] },
                  ],
                },
              },
            },
            { $project: { marksObtained: 1, comments: 1, _id: 0 } },
          ],
          as: 'assessmentsArr.markEntry',
        },
      },
      { $unwind: { path: '$assessmentsArr.markEntry', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$_id',
          examName: { $first: '$name' },
          examWeight: { $first: '$weight' },
          assessments: {
            $push: {
              _id: '$assessmentsArr._id',
              assessmentName: '$assessmentsArr.assessmentName',
              assessmentType: '$assessmentsArr.assessmentType',
              maxMarks: '$assessmentsArr.maxMarks',
              subjectId: '$assessmentsArr.subjectId',
              subjectName: '$assessmentsArr.subjectDetails.name',
              subjectCode: '$assessmentsArr.subjectDetails.code',
              marksObtained: '$assessmentsArr.markEntry.marksObtained',
              comments: '$assessmentsArr.markEntry.comments',
            },
          },
        },
      },
      {
        $project: {
          examId: '$_id',
          examName: 1,
          examWeight: 1,
          assessments: 1,
          _id: 0,
        },
      },
    ]);

    let totalTermWeightedScore = 0;
    let totalPossibleTermWeight = 0;
    const examResults: ReportExamResult[] = [];
    const chartData: { name: string; percentage?: number }[] = [];

    for (const exam of aggregatedExamData) {
      let examTotalMarksObtained = 0;
      let examTotalMaxMarks = 0;
      const assessmentsForThisExam: ReportExamResult['assessments'] = [];

      for (const assessment of exam.assessments) {
        const marksObtained = assessment.marksObtained;
        
        if (marksObtained !== undefined && marksObtained !== null && !isNaN(marksObtained)) {
          examTotalMarksObtained += marksObtained;
        }
        if (assessment.maxMarks && !isNaN(assessment.maxMarks)) {
          examTotalMaxMarks += assessment.maxMarks;
        }
        
        assessmentsForThisExam.push({
          assessmentName: assessment.assessmentName,
          assessmentType: assessment.assessmentType,
          subjectName: assessment.subjectName || 'N/A',
          marksObtained: (marksObtained === null || marksObtained === undefined) ? undefined : marksObtained,
          maxMarks: assessment.maxMarks || 0,
          percentage: (marksObtained !== undefined && marksObtained !== null && assessment.maxMarks && assessment.maxMarks > 0) ? (marksObtained / assessment.maxMarks) * 100 : undefined,
        });
      }

      const examPercentage = examTotalMaxMarks > 0 ? (examTotalMarksObtained / examTotalMaxMarks) * 100 : undefined;
      let weightedContribution: number | undefined = undefined;
      if (exam.examWeight !== undefined && exam.examWeight !== null && examPercentage !== undefined) {
        weightedContribution = (examPercentage * exam.examWeight) / 100;
        totalTermWeightedScore += weightedContribution;
        totalPossibleTermWeight += exam.examWeight;
      }

      examResults.push({
        examName: exam.examName,
        examId: exam.examId.toString(),
        examWeight: exam.examWeight,
        assessments: assessmentsForThisExam,
        examTotalMarksObtained,
        examTotalMaxMarks,
        examPercentage,
        weightedContribution,
      });
      chartData.push({ name: exam.examName, percentage: examPercentage });
    }

    let termOverallPercentage: number | undefined;
    if (totalPossibleTermWeight > 0) {
        termOverallPercentage = (totalTermWeightedScore / totalPossibleTermWeight) * 100;
    } else if (examResults.length > 0) {
        const validExamPercentages = examResults.map(er => er.examPercentage).filter(p => p !== undefined && !isNaN(p)) as number[];
        if (validExamPercentages.length > 0) {
            termOverallPercentage = validExamPercentages.reduce((sum, p) => sum + p, 0) / validExamPercentages.length;
        }
    }
    
    const { grade: termGrade, remarks: termRemarks } = applyGradingScale(termOverallPercentage, gradingScale);

    const reportData: TermReportData = {
      student: {
        name: `${(studentProfile.userId as ITenantUser).firstName} ${(studentProfile.userId as ITenantUser).lastName}`,
        studentIdNumber: studentProfile.studentIdNumber,
      },
      classDetails: studentProfile.currentClassId ? {
        name: (studentProfile.currentClassId as IClass).name,
        level: (studentProfile.currentClassId as IClass).level,
      } : undefined,
      academicYear: { name: academicYear.name },
      term: { name: term.name },
      examResults,
      termTotalWeightedScore: totalPossibleTermWeight > 0 ? totalTermWeightedScore : undefined,
      termOverallPercentage,
      termGrade,
      termRemarks,
      chartData,
      gradingScaleUsed: gradingScale?.name || 'N/A (Default or general scale not found)',
    };

    return NextResponse.json(reportData);

  } catch (error: any) {
    console.error(`Error generating term report for student ${studentProfileIdParam}, school ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to generate student term report', details: String(error.message || 'Unknown server error') }, { status: 500 });
  }
}
