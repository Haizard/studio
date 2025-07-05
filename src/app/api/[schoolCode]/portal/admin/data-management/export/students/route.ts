
import { NextResponse } from 'next/server';
import { getTenantConnection } from '@/lib/db';
import StudentModel, { IStudent } from '@/models/Tenant/Student';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';
import moment from 'moment';

async function ensureTenantModelsRegistered(tenantDb: mongoose.Connection) {
  if (!tenantDb.models.Student) tenantDb.model<IStudent>('Student', StudentModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
  if (!tenantDb.models.AcademicYear) tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
}

// Helper function to format data into CSV, handling quotes and commas
function convertToCSV(data: any[]) {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  const escapeCSV = (field: any): string => {
    if (field === null || field === undefined) return '';
    const str = String(field);
    // If the field contains a comma, a quote, or a newline, wrap it in double quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      // Escape double quotes by doubling them
      const escapedStr = str.replace(/"/g, '""');
      return `"${escapedStr}"`;
    }
    return str;
  };

  for (const row of data) {
    const values = headers.map(header => escapeCSV(row[header]));
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
}

export async function GET(
  request: Request,
  { params }: { params: { schoolCode: string } }
) {
  const { schoolCode } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || (token.role !== 'admin' && token.role !== 'superadmin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Student = tenantDb.models.Student as mongoose.Model<IStudent>;

    const students = await Student.find({})
      .populate<{ userId: ITenantUser }>('userId', 'firstName lastName username email isActive')
      .populate<{ currentClassId?: IClass }>('currentClassId', 'name')
      .populate<{ currentAcademicYearId?: IAcademicYear }>('currentAcademicYearId', 'name')
      .lean();

    const formattedData = students.map(s => ({
      student_id_number: s.studentIdNumber,
      first_name: s.userId?.firstName || '',
      last_name: s.userId?.lastName || '',
      username: s.userId?.username || '',
      email: s.userId?.email || '',
      gender: s.gender,
      date_of_birth: s.dateOfBirth ? moment(s.dateOfBirth).format('YYYY-MM-DD') : '',
      admission_date: s.admissionDate ? moment(s.admissionDate).format('YYYY-MM-DD') : '',
      academic_year: s.currentAcademicYearId?.name || '',
      class: s.currentClassId?.name || '',
      status: s.isActive ? 'Active' : 'Inactive'
    }));

    const csv = convertToCSV(formattedData);
    
    const headers = new Headers();
    headers.set('Content-Type', 'text/csv; charset=utf-8');
    headers.set('Content-Disposition', `attachment; filename="students-${schoolCode}-${new Date().toISOString().split('T')[0]}.csv"`);

    return new NextResponse(csv, { headers });

  } catch (error: any) {
    console.error(`Error exporting students for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to export students', details: error.message }, { status: 500 });
  }
}
