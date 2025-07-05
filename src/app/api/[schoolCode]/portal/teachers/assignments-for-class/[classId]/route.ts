
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import TeacherModel, { ITeacher } from '@/models/Tenant/Teacher';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';
import SubjectModel, { ISubject } from '@/models/Tenant/Subject';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Teacher) tenantDb.model<ITeacher>('Teacher', TeacherModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
  if (!tenantDb.models.Subject) tenantDb.model<ISubject>('Subject', SubjectModel.schema);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
  if (!tenantDb.models.AcademicYear) tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string; classId: string } }
) {
  const { schoolCode, classId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
  
  // This endpoint is internal for AI, so we secure it for admins who can generate timetables.
  if (!token || !['admin', 'superadmin'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
  }

  if (!mongoose.Types.ObjectId.isValid(classId)) {
    return NextResponse.json({ error: 'Invalid Class ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Teacher = tenantDb.models.Teacher as mongoose.Model<ITeacher>;

    const assignments = await Teacher.aggregate([
      // Unwind the array to process each assignment individually
      { $unwind: '$assignedClassesAndSubjects' },
      // Match documents where the classId in the assignment matches the requested classId
      { $match: { 'assignedClassesAndSubjects.classId': new mongoose.Types.ObjectId(classId) } },
      // Lookup user details for the teacher
      { 
        $lookup: { 
          from: 'users', 
          localField: 'userId', 
          foreignField: '_id', 
          as: 'userDetails' 
        } 
      },
      // Deconstruct the userDetails array
      { $unwind: '$userDetails' },
       // Lookup subject details
      {
        $lookup: {
            from: 'subjects',
            localField: 'assignedClassesAndSubjects.subjectId',
            foreignField: '_id',
            as: 'subjectDetails'
        }
      },
      // Deconstruct the subjectDetails array
      { $unwind: { path: '$subjectDetails', preserveNullAndEmptyArrays: true } },
      // Project the final desired structure
      {
        $project: {
          _id: 0, // Exclude the default _id
          subject: {
            _id: '$assignedClassesAndSubjects.subjectId',
            name: '$subjectDetails.name',
            code: '$subjectDetails.code'
          },
          teacher: {
            _id: '$userId',
            name: { $concat: ['$userDetails.firstName', ' ', '$userDetails.lastName'] }
          },
          academicYearId: '$assignedClassesAndSubjects.academicYearId'
        }
      }
    ]);
    
    return NextResponse.json(assignments);

  } catch (error: any) {
    console.error(`Error fetching assignments for class ${classId}, school ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch assignments for class', details: error.message }, { status: 500 });
  }
}
