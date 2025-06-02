
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
    if (token.role === 'student') {
        query.studentId = token.uid;
    }

    const marks = await Mark.find(query)
      .populate<{ studentId: ITenantUser }>({
        path: 'studentId', 
        model: 'User', // Explicit model name
        select: 'firstName lastName username'
      })
      .lean();
    
    if (token.role === 'student' && marks.length === 0) {
        // No specific message here, client can handle display of empty results
    }

    return NextResponse.json(marks);
  } catch (error: any) {
    console.error(`Error fetching marks for assessment ${assessmentId}, school ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch marks', details: error.message }, { status: 500 });
  }
}
