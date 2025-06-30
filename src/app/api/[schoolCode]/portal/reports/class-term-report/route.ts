import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import StudentModel, { IStudent } from '@/models/Tenant/Student';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import ExamModel, { IExam } from '@/models/Tenant/Exam';
import MarkModel, { IMark } from '@/models/Tenant/Mark';
import GradingScaleModel, { IGradingScale } from '@/models/Tenant/GradingScale';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Student) tenantDb.model<IStudent>('Student', StudentModel.schema);
  if (!tenantDb.models.AcademicYear) tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
  if (!tenantDb.models.Exam) tenantDb.model<IExam>('Exam', ExamModel.schema);
  if (!tenantDb.models.Mark) tenantDb.model<IMark>('Mark', MarkModel.schema);
  if (!tenantDb.models.GradingScale) tenantDb.model<IGradingScale>('GradingScale', GradingScaleModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
}

interface ClassTermResult {
  studentId: string;
  studentName: string;
  totalMarksObtained: number;
  totalMaxMarks: number;
  averagePercentage?: number;
  grade?: string;
  remarks?: string;
}

function applyGradingScale(percentage: number | undefined | null, gradingScale: IGradingScale | null): { grade: string; remarks: string } {
  if (percentage === undefined || percentage === null || isNaN(percentage) || !gradingScale || !gradingScale.grades || gradingScale.grades.length === 0) {
    return { grade: 'N/A', remarks: 'N/A' };
  }
  for (const gradeDef of gradingScale.grades) {
    if (percentage >= gradeDef.minScore && percentage <= gradeDef.maxScore) {
      return { grade: gradeDef.grade, remarks: gradeDef.remarks || 'N/A' };
    }
  }
  return { grade: 'N/A', remarks: 'Out of Range' };
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  const { searchParams } = new URL(request.url);
  const academicYearIdParam = searchParams.get('academicYearId');
  const classIdParam = searchParams.get('classId');

  if (!academicYearIdParam || !classIdParam) {
    return NextResponse.json({ error: 'Academic Year ID and Class ID are required.' }, { status: 400 });
  }

  const academicYearId = new mongoose.Types.ObjectId(academicYearIdParam);
  const classId = new mongoose.Types.ObjectId(classIdParam);

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Student = tenantDb.models.Student as mongoose.Model<IStudent>;
    const Class = tenantDb.models.Class as mongoose.Model<IClass>;
    const Mark = tenantDb.models.Mark as mongoose.Model<IMark>;
    const GradingScale = tenantDb.models.GradingScale as mongoose.Model<IGradingScale>;
    
    const targetClass = await Class.findById(classId).lean();
    if (!targetClass) return NextResponse.json({ error: "Class not found." }, { status: 404 });

    const studentsInClass = await Student.find({ currentClassId: classId, currentAcademicYearId: academicYearId, isActive: true })
        .populate<{userId: ITenantUser}>('userId', 'firstName lastName')
        .lean();
    
    if (studentsInClass.length === 0) return NextResponse.json([]);
    
    const gradingScale = await GradingScale.findOne({ isDefault: true, academicYearId }).lean<IGradingScale>() || 
                         await GradingScale.findOne({ isDefault: true, academicYearId: null }).lean<IGradingScale>();

    const studentUserIds = studentsInClass.map(s => s.userId._id);

    const marksAggregation = await Mark.aggregate([
      { $match: { studentId: { $in: studentUserIds }, academicYearId } },
      {
        $lookup: {
          from: 'assessments',
          localField: 'assessmentId',
          foreignField: '_id',
          as: 'assessment'
        }
      },
      { $unwind: '$assessment' },
      {
        $group: {
          _id: '$studentId',
          totalMarksObtained: { $sum: '$marksObtained' },
          totalMaxMarks: { $sum: '$assessment.maxMarks' }
        }
      },
      {
          $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'studentDetails'
          }
      },
      { $unwind: '$studentDetails'},
      {
          $project: {
              _id: 0,
              studentId: '$_id',
              studentName: { $concat: ['$studentDetails.firstName', ' ', '$studentDetails.lastName'] },
              totalMarksObtained: 1,
              totalMaxMarks: 1
          }
      }
    ]);
    
    const resultsMap = new Map(marksAggregation.map(item => [item.studentId.toString(), item]));
    const finalResults: ClassTermResult[] = studentsInClass.map(student => {
        const studentResult = resultsMap.get(student.userId._id.toString());
        const averagePercentage = studentResult && studentResult.totalMaxMarks > 0 ? (studentResult.totalMarksObtained / studentResult.totalMaxMarks) * 100 : 0;
        const { grade, remarks } = applyGradingScale(averagePercentage, gradingScale);

        return {
            studentId: student._id.toString(),
            studentName: `${student.userId.firstName} ${student.userId.lastName}`,
            totalMarksObtained: studentResult?.totalMarksObtained || 0,
            totalMaxMarks: studentResult?.totalMaxMarks || 0,
            averagePercentage: averagePercentage,
            grade,
            remarks,
        };
    });

    return NextResponse.json(finalResults);

  } catch (error: any) {
    console.error(`Error generating class term report for class ${classIdParam}, school ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to generate class term report', details: String(error.message || 'Unknown server error') }, { status: 500 });
  }
}
