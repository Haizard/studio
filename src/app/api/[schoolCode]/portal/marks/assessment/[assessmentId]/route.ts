
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import MarkModel, { IMark } from '@/models/Tenant/Mark';
import AssessmentModel, { IAssessment } from '@/models/Tenant/Assessment';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Mark) tenantDb.model<IMark>('Mark', MarkModel.schema);
  if (!tenantDb.models.Assessment) tenantDb.model<IAssessment>('Assessment', AssessmentModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string; assessmentId: string } }
) {
  const { schoolCode, assessmentId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['teacher', 'admin', 'superadmin', 'student'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if ((token.role === 'teacher' || token.role === 'admin' || token.role === 'student') && token.schoolCode !== schoolCode) {
      return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
    return NextResponse.json({ error: 'Invalid Assessment ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Mark = tenantDb.models.Mark as mongoose.Model<IMark>;
    const Assessment = tenantDb.models.Assessment as mongoose.Model<IAssessment>;

    const assessment = await Assessment.findById(assessmentId).lean();
    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    let query: any = { assessmentId };
    // For teachers, admins, superadmins, fetch all marks for the assessment.
    // For students, filter by their own ID.
    if (token.role === 'student') {
        // Assuming token.uid holds the User's _id for the student.
        // We need to find the Student profile linked to this User ID to get the Student document _id.
        // However, Mark.studentId refers to User._id if students are also users.
        // If Mark.studentId refers to Student._id, then we need to adjust.
        // Assuming Mark.studentId = User._id for now.
        // The BATCH MARKS API uses studentId which is the User ID from the `students` array, 
        // where key is user._id.
        // The StudentMarkData interface uses studentId, which comes from student._id (profile id).
        // The BATCH MARKS API needs to consistently use one or the other, or we need to resolve.
        // Let's assume `Mark.studentId` is the actual `Student Profile ID` or the `User ID` consistently.
        // Given current Mark model: `studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },`
        // This means `Mark.studentId` IS `User._id`.
        query.studentId = token.uid; 
    }

    const marks = await Mark.find(query)
      .populate<{ studentId: ITenantUser }>({
        path: 'studentId', 
        model: 'User', // Explicit model name
        select: 'firstName lastName username' // Only select what's needed for display of mark owner
      })
      .lean();
    
    return NextResponse.json(marks);
  } catch (error: any) {
    console.error(`Error fetching marks for assessment ${assessmentId}, school ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch marks', details: error.message }, { status: 500 });
  }
}

    