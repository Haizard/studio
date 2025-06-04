
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
  if (percentage === undefined || percentage === null || isNaN(percentage) || !gradingScale) {
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
  return { grade: 'N/A', remarks: 'N/A - Out of range' };
}

function determineOverallDivision(totalPoints: number, gradingScale: IGradingScale | null): { division: string, description?: string } {
    if (!gradingScale || gradingScale.scaleType !== 'O-Level Division Points' || !gradingScale.divisionConfigs || totalPoints === undefined || isNaN(totalPoints)) {
        return { division: 'N/A' };
    }
    for (const config of gradingScale.divisionConfigs) {
        if (totalPoints >= config.minPoints && totalPoints <= config.maxPoints) {
            return { division: config.division, description: config.description };
        }
    }
    return { division: 'N/A', description: 'Points out of division range' };
}


export async function GET(
  request: Request,
  { params: routeParams }: { params: { schoolCode: string; studentProfileId: string } }
) {
  const { schoolCode, studentProfileId } = routeParams;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  const { searchParams } = new URL(request.url);
  const academicYearId = searchParams.get('academicYearId');
  const termId = searchParams.get('termId');

  if (!mongoose.Types.ObjectId.isValid(studentProfileId) || !academicYearId || !mongoose.Types.ObjectId.isValid(academicYearId) || !termId || !mongoose.Types.ObjectId.isValid(termId)) {
    return NextResponse.json({ error: 'Invalid or missing Student ID, Academic Year ID, or Term ID.' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);

    const Student = tenantDb.models.Student as mongoose.Model<IStudent>;
    const AcademicYear = tenantDb.models.AcademicYear as mongoose.Model<IAcademicYear>;
    const Term = tenantDb.models.Term as mongoose.Model<ITerm>;
    const Exam = tenantDb.models.Exam as mongoose.Model<IExam>;
    const Assessment = tenantDb.models.Assessment as mongoose.Model<IAssessment>;
    const Mark = tenantDb.models.Mark as mongoose.Model<IMark>;
    const GradingScale = tenantDb.models.GradingScale as mongoose.Model<IGradingScale>;

    const [studentProfile, academicYear, term] = await Promise.all([
      Student.findById(studentProfileId).populate<{ userId: ITenantUser }>('userId', 'firstName lastName').populate<{ currentClassId?: IClass }>('currentClassId', 'name level').lean(),
      AcademicYear.findById(academicYearId).lean(),
      Term.findById(termId).lean(),
    ]);

    if (!studentProfile || !studentProfile.userId) return NextResponse.json({ error: 'Student profile not found.' }, { status: 404 });
    if (!academicYear) return NextResponse.json({ error: 'Academic year not found.' }, { status: 404 });
    if (!term) return NextResponse.json({ error: 'Term not found.' }, { status: 404 });

    const studentExams = await Exam.find({ academicYearId, termId, status: 'Published' }).lean();
    const examIds = studentExams.map(e => e._id);

    const studentAssessments = await Assessment.find({ examId: { $in: examIds } })
      .populate<{ subjectId: ISubject }>('subjectId', 'name code').lean();
    const assessmentIds = studentAssessments.map(a => a._id);

    const studentMarks = await Mark.find({
      studentId: studentProfile.userId._id, // Assuming Mark.studentId links to User._id
      assessmentId: { $in: assessmentIds },
    }).lean();

    const marksMap = new Map(studentMarks.map(mark => [mark.assessmentId.toString(), mark]));

    // Try to find a default grading scale for the academic year, or a general default.
    let gradingScale: IGradingScale | null = await GradingScale.findOne({
      academicYearId,
      isDefault: true,
      // Optionally add level filter if studentProfile.currentClassId.level is available
    }).lean();
    if (!gradingScale) {
      gradingScale = await GradingScale.findOne({ isDefault: true, academicYearId: { $exists: false }, level: { $exists: false } }).lean();
    }


    let totalTermWeightedScore = 0;
    let totalPossibleTermWeight = 0;
    const examResults: ReportExamResult[] = [];
    const chartData: { name: string; percentage?: number }[] = [];

    for (const exam of studentExams) {
      let examTotalMarksObtained = 0;
      let examTotalMaxMarks = 0;
      const assessmentsForThisExam: ReportExamResult['assessments'] = [];

      const assessmentsInExam = studentAssessments.filter(a => a.examId.toString() === exam._id.toString());
      for (const assessment of assessmentsInExam) {
        const mark = marksMap.get(assessment._id.toString());
        const marksObtained = mark?.marksObtained;
        
        if (marksObtained !== undefined && marksObtained !== null) examTotalMarksObtained += marksObtained;
        examTotalMaxMarks += assessment.maxMarks;
        
        const subject = assessment.subjectId as ISubject | undefined;
        assessmentsForThisExam.push({
          assessmentName: assessment.assessmentName,
          assessmentType: assessment.assessmentType,
          subjectName: subject?.name || 'N/A',
          marksObtained: marksObtained === null ? undefined : marksObtained,
          maxMarks: assessment.maxMarks,
          percentage: (marksObtained !== undefined && marksObtained !== null && assessment.maxMarks > 0) ? (marksObtained / assessment.maxMarks) * 100 : undefined,
        });
      }

      const examPercentage = examTotalMaxMarks > 0 ? (examTotalMarksObtained / examTotalMaxMarks) * 100 : undefined;
      let weightedContribution: number | undefined = undefined;
      if (exam.weight !== undefined && exam.weight !== null && examPercentage !== undefined) {
        weightedContribution = (examPercentage * exam.weight) / 100;
        totalTermWeightedScore += weightedContribution;
        totalPossibleTermWeight += exam.weight;
      }

      examResults.push({
        examName: exam.name,
        examId: exam._id.toString(),
        examWeight: exam.weight,
        assessments: assessmentsForThisExam,
        examTotalMarksObtained,
        examTotalMaxMarks,
        examPercentage,
        weightedContribution,
      });
      chartData.push({ name: exam.name, percentage: examPercentage });
    }

    let termOverallPercentage: number | undefined;
    if (totalPossibleTermWeight > 0) {
        termOverallPercentage = (totalTermWeightedScore / totalPossibleTermWeight) * 100; // Normalize if weights don't sum to 100
    } else if (examResults.length > 0) { // Fallback to simple average if no weights
        const validExamPercentages = examResults.map(er => er.examPercentage).filter(p => p !== undefined) as number[];
        if (validExamPercentages.length > 0) {
            termOverallPercentage = validExamPercentages.reduce((sum, p) => sum + p, 0) / validExamPercentages.length;
        }
    }
    
    const { grade: termGrade, remarks: termRemarks } = applyGradingScale(termOverallPercentage, gradingScale);

    // Handle O-Level Division if applicable
    if (gradingScale && gradingScale.scaleType === 'O-Level Division Points' && termOverallPercentage !== undefined) {
        // This part is tricky. O-Level division is usually sum of points from best N subjects.
        // The current `termOverallPercentage` is an average of percentages, not sum of points.
        // This section needs a dedicated logic path for O-Level point calculation if required.
        // For now, termGrade and termRemarks are based on the overall percentage.
        // If specific division logic is required, this would need to be revisited.
    }

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
      gradingScaleUsed: gradingScale?.name || 'N/A (Default or not found)',
    };

    return NextResponse.json(reportData);

  } catch (error: any) {
    console.error(`Error generating term report for student ${studentProfileId}, school ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to generate student term report', details: String(error.message || 'Unknown server error') }, { status: 500 });
  }
}
