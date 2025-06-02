
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import TeacherResourceModel, { ITeacherResource } from '@/models/Tenant/TeacherResource';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import SubjectModel, { ISubject } from '@/models/Tenant/Subject';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.TeacherResource) tenantDb.model<ITeacherResource>('TeacherResource', TeacherResourceModel.schema);
  if (!tenantDb.models.AcademicYear) tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
  if (!tenantDb.models.Subject) tenantDb.model<ISubject>('Subject', SubjectModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.role !== 'teacher' || token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const academicYearId = searchParams.get('academicYearId');

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const TeacherResource = tenantDb.models.TeacherResource as mongoose.Model<ITeacherResource>;
    
    let query: any = { teacherId: token.uid };
    if (academicYearId && mongoose.Types.ObjectId.isValid(academicYearId)) {
      query.academicYearId = academicYearId;
    }
    
    const resources = await TeacherResource.find(query)
      .populate<{ academicYearId: IAcademicYear }>('academicYearId', 'name')
      .populate<{ subjectId?: ISubject }>('subjectId', 'name')
      .sort({ createdAt: -1 })
      .lean(); 

    return NextResponse.json(resources);
  } catch (error: any) {
    console.error(`Error fetching teacher resources for ${schoolCode}, teacher ${token.uid}:`, error);
    return NextResponse.json({ error: 'Failed to fetch resources', details: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.role !== 'teacher' || token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  if (!schoolCode) {
    return NextResponse.json({ error: 'School code is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { title, description, fileUrl, fileType, subjectId, classLevel, academicYearId, isPublic } = body;

    if (!title || !fileUrl || !academicYearId) {
      return NextResponse.json({ error: 'Missing required fields: title, fileUrl, academicYearId' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(academicYearId) || (subjectId && !mongoose.Types.ObjectId.isValid(subjectId))) {
        return NextResponse.json({ error: 'Invalid ID format for academicYearId or subjectId.' }, { status: 400 });
    }

    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const TeacherResource = tenantDb.models.TeacherResource as mongoose.Model<ITeacherResource>;

    const newResource = new TeacherResource({
      title,
      description,
      fileUrl,
      fileType,
      subjectId: subjectId || undefined,
      classLevel,
      academicYearId,
      isPublic: isPublic !== undefined ? isPublic : false,
      teacherId: token.uid,
    });

    await newResource.save();
    const populatedResource = await TeacherResource.findById(newResource._id)
      .populate<{ academicYearId: IAcademicYear }>('academicYearId', 'name')
      .populate<{ subjectId?: ISubject }>('subjectId', 'name')
      .lean();
    return NextResponse.json(populatedResource, { status: 201 });

  } catch (error: any) {
    console.error(`Error creating teacher resource for ${schoolCode}:`, error);
    if (error instanceof mongoose.Error.ValidationError) {
        return NextResponse.json({ error: 'Validation Error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create resource', details: error.message }, { status: 500 });
  }
}
