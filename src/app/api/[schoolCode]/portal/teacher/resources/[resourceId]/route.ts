
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
  { params }: { params: { schoolCode: string; resourceId: string } }
) {
  const { schoolCode, resourceId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.role !== 'teacher' || token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(resourceId)) {
    return NextResponse.json({ error: 'Invalid Resource ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const TeacherResource = tenantDb.models.TeacherResource as mongoose.Model<ITeacherResource>;

    const resource = await TeacherResource.findOne({ _id: resourceId, teacherId: token.uid })
      .populate<{ academicYearId: IAcademicYear }>('academicYearId', 'name')
      .populate<{ subjectId?: ISubject }>('subjectId', 'name')
      .lean();
      
    if (!resource) {
      return NextResponse.json({ error: 'Resource not found or you do not have permission to access it' }, { status: 404 });
    }
    return NextResponse.json(resource);
  } catch (error: any) {
    console.error(`Error fetching resource ${resourceId} for ${schoolCode}, teacher ${token.uid}:`, error);
    return NextResponse.json({ error: 'Failed to fetch resource', details: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { schoolCode: string; resourceId: string } }
) {
  const { schoolCode, resourceId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.role !== 'teacher' || token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(resourceId)) {
    return NextResponse.json({ error: 'Invalid Resource ID' }, { status: 400 });
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

    const resourceToUpdate = await TeacherResource.findOne({ _id: resourceId, teacherId: token.uid });
    if (!resourceToUpdate) {
      return NextResponse.json({ error: 'Resource not found or you do not have permission to update it' }, { status: 404 });
    }
    
    resourceToUpdate.title = title;
    resourceToUpdate.description = description;
    resourceToUpdate.fileUrl = fileUrl;
    resourceToUpdate.fileType = fileType;
    resourceToUpdate.subjectId = subjectId || undefined;
    resourceToUpdate.classLevel = classLevel;
    resourceToUpdate.academicYearId = academicYearId;
    resourceToUpdate.isPublic = isPublic !== undefined ? isPublic : resourceToUpdate.isPublic;

    await resourceToUpdate.save();
    const populatedResource = await TeacherResource.findById(resourceToUpdate._id)
      .populate<{ academicYearId: IAcademicYear }>('academicYearId', 'name')
      .populate<{ subjectId?: ISubject }>('subjectId', 'name')
      .lean();
    return NextResponse.json(populatedResource);
  } catch (error: any) {
    console.error(`Error updating resource ${resourceId} for ${schoolCode}:`, error);
     if (error instanceof mongoose.Error.ValidationError) {
        return NextResponse.json({ error: 'Validation Error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update resource', details: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { schoolCode: string; resourceId: string } }
) {
  const { schoolCode, resourceId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || token.role !== 'teacher' || token.schoolCode !== schoolCode) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  if (!mongoose.Types.ObjectId.isValid(resourceId)) {
    return NextResponse.json({ error: 'Invalid Resource ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const TeacherResource = tenantDb.models.TeacherResource as mongoose.Model<ITeacherResource>;

    const result = await TeacherResource.deleteOne({ _id: resourceId, teacherId: token.uid });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Resource not found or you do not have permission to delete it' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Resource deleted successfully' });
  } catch (error: any) {
    console.error(`Error deleting resource ${resourceId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to delete resource', details: error.message }, { status: 500 });
  }
}
