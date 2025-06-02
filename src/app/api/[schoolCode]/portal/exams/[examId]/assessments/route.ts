
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import AssessmentModel, { IAssessment } from '@/models/Tenant/Assessment';
import ExamModel, { IExam } from '@/models/Tenant/Exam';
import SubjectModel, { ISubject } from '@/models/Tenant/Subject';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Assessment) tenantDb.model<IAssessment>('Assessment', AssessmentModel.schema);
  if (!tenantDb.models.Exam) tenantDb.model<IExam>('Exam', ExamModel.schema);
  if (!tenantDb.models.Subject) tenantDb.model<ISubject>('Subject', SubjectModel.schema);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string; examId: string } }
) {
  const { schoolCode, examId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['admin', 'superadmin', 'teacher'].includes(token.role as string) ) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (token.schoolCode !== schoolCode && token.role !== 'superadmin'){
     return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(examId)) {
    return NextResponse.json({ error: 'Invalid Exam ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Assessment = tenantDb.models.Assessment as mongoose.Model<IAssessment>;
    
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');

    let query: any = { examId };
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      query.classId = classId;
    }
    if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
      query.subjectId = subjectId;
    }
    
    const assessments = await Assessment.find(query)
      .populate<{ subjectId: ISubject }>({ path: 'subjectId', model: 'Subject', select: 'name code' })
      .populate<{ classId: IClass }>({ path: 'classId', model: 'Class', select: 'name level' })
      .populate<{ invigilatorId: ITenantUser }>({ path: 'invigilatorId', model: 'User', select: 'firstName lastName username' })
      .sort({ assessmentDate: 1, 'subjectId.name': 1 })
      .lean(); 

    return NextResponse.json(assessments);
  } catch (error: any) {
    console.error(`Error fetching assessments for exam ${examId}, school ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch assessments', details: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { schoolCode: string; examId: string } }
) {
  const { schoolCode, examId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

   if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
     if (!(token?.role === 'superadmin' && schoolCode)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }
  
  if (!mongoose.Types.ObjectId.isValid(examId)) {
    return NextResponse.json({ error: 'Invalid Exam ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { subjectId, classId, assessmentType, assessmentName, maxMarks, assessmentDate, assessmentTime, invigilatorId } = body;

    if (!subjectId || !classId || !assessmentType || !assessmentName || !maxMarks || !assessmentDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(subjectId) || !mongoose.Types.ObjectId.isValid(classId) || (invigilatorId && !mongoose.Types.ObjectId.isValid(invigilatorId))) {
        return NextResponse.json({ error: 'Invalid ID for subject, class, or invigilator' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Assessment = tenantDb.models.Assessment as mongoose.Model<IAssessment>;

    const existingAssessment = await Assessment.findOne({ examId, classId, subjectId, assessmentName });
    if (existingAssessment) {
      return NextResponse.json({ error: 'An assessment with this name already exists for this subject and class within the exam.' }, { status: 409 });
    }

    const newAssessment = new Assessment({
      examId,
      subjectId,
      classId,
      assessmentType,
      assessmentName,
      maxMarks,
      assessmentDate: new Date(assessmentDate),
      assessmentTime,
      invigilatorId: invigilatorId || undefined,
      isGraded: false,
    });

    await newAssessment.save();
    const populatedAssessment = await Assessment.findById(newAssessment._id)
        .populate<{ subjectId: ISubject }>({ path: 'subjectId', model: 'Subject', select: 'name code' })
        .populate<{ classId: IClass }>({ path: 'classId', model: 'Class', select: 'name level' })
        .populate<{ invigilatorId: ITenantUser }>({ path: 'invigilatorId', model: 'User', select: 'firstName lastName username' })
        .lean();
    return NextResponse.json(populatedAssessment, { status: 201 });
  } catch (error: any) {
    console.error(`Error creating assessment for exam ${examId}, school ${schoolCode}:`, error);
     if (error.code === 11000) {
        return NextResponse.json({ error: 'This assessment might already exist (check name, subject, class combination for this exam).' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create assessment', details: error.message }, { status: 500 });
  }
}
