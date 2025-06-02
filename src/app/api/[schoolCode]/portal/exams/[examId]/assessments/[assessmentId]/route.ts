
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
  { params }: { params: { schoolCode: string; examId: string; assessmentId: string } }
) {
  const { schoolCode, examId, assessmentId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
     if (!(token?.role === 'superadmin' && schoolCode)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(examId) || !mongoose.Types.ObjectId.isValid(assessmentId)) {
    return NextResponse.json({ error: 'Invalid Exam or Assessment ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Assessment = tenantDb.models.Assessment as mongoose.Model<IAssessment>;

    const assessment = await Assessment.findOne({ _id: assessmentId, examId })
        .populate('subjectId', 'name code')
        .populate('classId', 'name level')
        .populate('invigilatorId', 'firstName lastName username')
        .lean();
        
    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found or does not belong to this exam' }, { status: 404 });
    }
    return NextResponse.json(assessment);
  } catch (error: any) {
    console.error(`Error fetching assessment ${assessmentId} for exam ${examId}, school ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch assessment', details: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string; examId: string; assessmentId: string } }
) {
  const { schoolCode, examId, assessmentId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

 if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(examId) || !mongoose.Types.ObjectId.isValid(assessmentId)) {
    return NextResponse.json({ error: 'Invalid Exam or Assessment ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { subjectId, classId, assessmentType, assessmentName, maxMarks, assessmentDate, assessmentTime, invigilatorId, isGraded } = body;

    if (!subjectId || !classId || !assessmentType || !assessmentName || !maxMarks || !assessmentDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(subjectId) || !mongoose.Types.ObjectId.isValid(classId) || (invigilatorId && !mongoose.Types.ObjectId.isValid(invigilatorId))) {
        return NextResponse.json({ error: 'Invalid ID for subject, class, or invigilator' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Assessment = tenantDb.models.Assessment as mongoose.Model<IAssessment>;

    const assessmentToUpdate = await Assessment.findOne({ _id: assessmentId, examId });
    if (!assessmentToUpdate) {
      return NextResponse.json({ error: 'Assessment not found or does not belong to this exam' }, { status: 404 });
    }

    // Check for uniqueness if relevant fields change
     if (assessmentName !== assessmentToUpdate.assessmentName || 
        subjectId.toString() !== assessmentToUpdate.subjectId.toString() ||
        classId.toString() !== assessmentToUpdate.classId.toString()
    ) {
        const existingAssessment = await Assessment.findOne({ 
            examId, 
            classId, 
            subjectId, 
            assessmentName, 
            _id: { $ne: assessmentId } 
        });
        if (existingAssessment) {
          return NextResponse.json({ error: 'Another assessment with this name already exists for this subject and class within the exam.' }, { status: 409 });
        }
    }

    assessmentToUpdate.subjectId = subjectId;
    assessmentToUpdate.classId = classId;
    assessmentToUpdate.assessmentType = assessmentType;
    assessmentToUpdate.assessmentName = assessmentName;
    assessmentToUpdate.maxMarks = maxMarks;
    assessmentToUpdate.assessmentDate = new Date(assessmentDate);
    assessmentToUpdate.assessmentTime = assessmentTime;
    assessmentToUpdate.invigilatorId = invigilatorId || undefined;
    assessmentToUpdate.isGraded = isGraded !== undefined ? isGraded : assessmentToUpdate.isGraded;

    await assessmentToUpdate.save();
    const populatedAssessment = await Assessment.findById(assessmentToUpdate._id)
      .populate('subjectId', 'name code')
      .populate('classId', 'name level')
      .populate('invigilatorId', 'firstName lastName username')
      .lean();
    return NextResponse.json(populatedAssessment);
  } catch (error: any) {
    console.error(`Error updating assessment ${assessmentId} for ${schoolCode}:`, error);
    if (error.code === 11000) {
       return NextResponse.json({ error: 'This assessment might already exist (check name, subject, class combination for this exam).' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update assessment', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { schoolCode: string; examId: string; assessmentId: string } }
) {
  const { schoolCode, examId, assessmentId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin') || (token.role === 'admin' && token.schoolCode !== schoolCode)) {
    if (!(token?.role === 'superadmin' && schoolCode)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  if (!mongoose.Types.ObjectId.isValid(examId) || !mongoose.Types.ObjectId.isValid(assessmentId)) {
    return NextResponse.json({ error: 'Invalid Exam or Assessment ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Assessment = tenantDb.models.Assessment as mongoose.Model<IAssessment>;

    // TODO: Add check if assessment has marks entered before deleting
    const result = await Assessment.deleteOne({ _id: assessmentId, examId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Assessment not found or does not belong to this exam' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Assessment deleted successfully' });
  } catch (error: any) {
    console.error(`Error deleting assessment ${assessmentId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to delete assessment', details: error.message }, { status: 500 });
  }
}
