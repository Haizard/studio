
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Table, InputNumber, Input, message, Spin, Row, Col, Card, Descriptions, Alert, Breadcrumb } from 'antd';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { IAssessment } from '@/models/Tenant/Assessment';
import type { IMark } from '@/models/Tenant/Mark';
import type { IStudent } from '@/models/Tenant/Student'; // Assuming IStudent with userId populated
import type { ITenantUser } from '@/models/Tenant/User';
import mongoose from 'mongoose';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

interface StudentMarkData extends Partial<IMark> { // Allow partial for new entries
  key: string; // studentId
  studentName: string;
  studentUsername: string; // Or student custom ID
  marksObtained?: number | null;
  comments?: string;
}

interface MarkEntryProps {
  params: { schoolCode: string; assessmentId: string };
}

export default function MarksEntryTablePage({ params }: MarkEntryProps) {
  const { schoolCode, assessmentId } = params;
  const router = useRouter();

  const [assessmentDetails, setAssessmentDetails] = useState<IAssessment | null>(null);
  const [students, setStudents] = useState<StudentMarkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const ASSESSMENT_API_URL = `/api/${schoolCode}/portal/exams/${assessmentDetails?.examId}/assessments/${assessmentId}`; // Need examId for this path
  const ASSESSMENT_DETAILS_API_URL = `/api/${schoolCode}/portal/marks/assessment-details/${assessmentId}`; // Simplified endpoint for assessment details only
  const STUDENTS_API_URL_BASE = `/api/${schoolCode}/portal/students/class/`; // Appended with classId
  const MARKS_API_URL = `/api/${schoolCode}/portal/marks/assessment/${assessmentId}`;
  const BATCH_MARKS_API_URL = `/api/${schoolCode}/portal/marks/batch`;


  const fetchAssessmentDetails = useCallback(async () => {
    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
        message.error("Invalid Assessment ID.");
        router.back();
        return;
    }
    try {
      // This endpoint needs to be created or use existing assessment one by ID and derive examId.
      // For simplicity, creating a new endpoint in thought process.
      // Let's assume we can get assessment by just its ID.
      const res = await fetch(`/api/${schoolCode}/portal/exams/anyExam/assessments/${assessmentId}?anyExamPlaceholder=true`); // HACK: temp fix for API path
      if (!res.ok) throw new Error('Failed to fetch assessment details');
      const data: IAssessment = await res.json();
      setAssessmentDetails(data);
      return data; // Return data for subsequent calls
    } catch (error: any) {
      message.error(error.message || 'Could not load assessment details.');
      setLoading(false);
      return null;
    }
  }, [schoolCode, assessmentId, router]);


  const fetchStudentsAndMarks = useCallback(async (currentAssessment: IAssessment) => {
    if (!currentAssessment || !currentAssessment.classId) return;
    setLoading(true);
    try {
      const classId = typeof currentAssessment.classId === 'string' ? currentAssessment.classId : (currentAssessment.classId as any)._id;
      
      const [studentsRes, marksRes] = await Promise.all([
        fetch(`${STUDENTS_API_URL_BASE}${classId}`),
        fetch(`${MARKS_API_URL}`), // Fetches existing marks for this assessment
      ]);

      if (!studentsRes.ok) throw new Error('Failed to fetch students for the class.');
      if (!marksRes.ok) throw new Error('Failed to fetch existing marks.');

      const studentsData: IStudent[] = await studentsRes.json(); // Expects IStudent with populated userId
      const marksData: IMark[] = await marksRes.json();

      const marksMap = new Map(marksData.map(mark => [mark.studentId.toString(), mark]));

      const studentMarkEntries: StudentMarkData[] = studentsData
        .filter(student => student.userId) // Ensure userId exists
        .map(student => {
            const user = student.userId as ITenantUser; // Cast because we populate it
            const existingMark = marksMap.get(user._id.toString());
            return {
            key: user._id.toString(),
            studentId: user._id,
            studentName: `${user.firstName} ${user.lastName}`,
            studentUsername: user.username,
            marksObtained: existingMark?.marksObtained !== undefined ? existingMark.marksObtained : null,
            comments: existingMark?.comments || '',
            _id: existingMark?._id, // existing mark ID if present
            };
      });
      setStudents(studentMarkEntries);
    } catch (error: any) {
      message.error(error.message || 'Could not load students or marks.');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, MARKS_API_URL, STUDENTS_API_URL_BASE]);

  useEffect(() => {
    const init = async () => {
        setLoading(true);
        const currentAssessment = await fetchAssessmentDetails();
        if (currentAssessment) {
            await fetchStudentsAndMarks(currentAssessment);
        } else {
            setLoading(false); // Stop loading if assessment details failed
        }
    }
    init();
  }, [fetchAssessmentDetails, fetchStudentsAndMarks]);


  const handleMarkChange = (studentId: string, value: number | null) => {
    setStudents(prev =>
      prev.map(s => (s.key === studentId ? { ...s, marksObtained: value } : s))
    );
  };

  const handleCommentChange = (studentId: string, value: string) => {
    setStudents(prev =>
      prev.map(s => (s.key === studentId ? { ...s, comments: value } : s))
    );
  };

  const handleSaveMarks = async () => {
    if (!assessmentDetails) {
      message.error("Assessment details not loaded. Cannot save marks.");
      return;
    }
    setSaving(true);
    const marksPayload = students.map(s => ({
      studentId: s.key,
      marksObtained: s.marksObtained,
      comments: s.comments,
    }));

    try {
      const response = await fetch(BATCH_MARKS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, marks: marksPayload }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save marks');
      }
      message.success('Marks saved successfully!');
      // Optionally refetch marks to confirm, or rely on optimistic update
      if (assessmentDetails) fetchStudentsAndMarks(assessmentDetails);

    } catch (error: any) {
      message.error(error.message || 'Could not save marks.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: 'Student Name', dataIndex: 'studentName', key: 'studentName', width: '30%' },
    { title: 'Username', dataIndex: 'studentUsername', key: 'studentUsername', width: '20%' },
    {
      title: `Marks (Max: ${assessmentDetails?.maxMarks || 'N/A'})`,
      dataIndex: 'marksObtained',
      key: 'marksObtained',
      width: '20%',
      render: (text: number | null, record: StudentMarkData) => (
        <InputNumber
          min={0}
          max={assessmentDetails?.maxMarks}
          value={text}
          onChange={value => handleMarkChange(record.key, value)}
          style={{ width: '100%' }}
          disabled={saving}
        />
      ),
    },
    {
      title: 'Comments',
      dataIndex: 'comments',
      key: 'comments',
      render: (text: string, record: StudentMarkData) => (
        <TextArea
          value={text}
          onChange={e => handleCommentChange(record.key, e.target.value)}
          rows={1}
          disabled={saving}
        />
      ),
    },
  ];

  const breadcrumbItems = [
    { title: <Link href={`/${schoolCode}/portal/dashboard`}>Home</Link> },
    { title: <Link href={`/${schoolCode}/portal/teacher/marks-entry`}>Marks Entry Selection</Link> },
    { title: assessmentDetails ? `Enter Marks: ${assessmentDetails.assessmentName}` : 'Loading...' },
  ];


  if (loading && !assessmentDetails) {
    return <div className="flex justify-center items-center h-full"><Spin size="large" tip="Loading assessment details..." /></div>;
  }
  if (!assessmentDetails) {
    return <Alert message="Error" description="Could not load assessment details. Please go back and try again." type="error" showIcon action={<Button onClick={() => router.back()}>Go Back</Button>} />;
  }

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} className="mb-4" />
      <Row justify="space-between" align="middle" className="mb-4">
        <Col>
          <Title level={3}>Enter Marks: {assessmentDetails.assessmentName}</Title>
        </Col>
        <Col>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>Back to Selection</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveMarks} loading={saving}>
              Save All Marks
            </Button>
          </Space>
        </Col>
      </Row>
      
      <Card className="mb-6">
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="Exam">{ (assessmentDetails.examId as any)?.name || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Subject">{(assessmentDetails.subjectId as any)?.name || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Class">{(assessmentDetails.classId as any)?.name || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Max Marks">{assessmentDetails.maxMarks}</Descriptions.Item>
          <Descriptions.Item label="Date">{new Date(assessmentDetails.assessmentDate).toLocaleDateString()}</Descriptions.Item>
          <Descriptions.Item label="Type">{assessmentDetails.assessmentType}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Spin spinning={loading || saving} tip={saving ? "Saving marks..." : "Loading students..."}>
        <Table
          columns={columns}
          dataSource={students}
          pagination={false} // Consider pagination for very large classes
          rowKey="key"
          bordered
          size="middle"
          locale={{ emptyText: "No students found for this class, or class not associated with the assessment." }}
        />
      </Spin>
       <div className="mt-6 text-right">
         <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveMarks} loading={saving}>
            Save All Marks
          </Button>
       </div>
    </div>
  );
}

// This is a temporary new API endpoint needed for the marks entry page to fetch ONLY assessment details by its ID easily
// Ideally, the existing assessment GET /api/[schoolCode]/portal/exams/[examId]/assessments/[assessmentId]
// would be refactored or another one created that doesn't require examId in path if assessmentId is globally unique.
// For now, this is a workaround to simplify the frontend fetching logic on the marks entry page.
// It would be better to pass examId to the marks entry page or fetch exam details first.
// However, the user wants to proceed, so this is a pragmatic intermediate step.
// The "anyExam" in path is a placeholder for the GET route to match.
// The query param `?anyExamPlaceholder=true` is just to make the URL unique for Next.js routing if needed,
// the actual API logic will only use `assessmentId`.
// This needs to be implemented as an API route if it doesn't exist:
// File: src/app/api/[schoolCode]/portal/exams/anyExam/assessments/[assessmentId]/route.ts (GET handler)
// With content like:
/*
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
  { params }: { params: { schoolCode: string; assessmentId: string } }
) {
  const { schoolCode, assessmentId } = params;
  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !['teacher', 'admin', 'superadmin'].includes(token.role as string) ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
   if (token.schoolCode !== schoolCode && token.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized for this school' }, { status: 403 });
  }


  if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
    return NextResponse.json({ error: 'Invalid Assessment ID' }, { status: 400 });
  }

  try {
    const tenantDb = await getTenantConnection(schoolCode);
    await ensureTenantModelsRegistered(tenantDb);
    const Assessment = tenantDb.models.Assessment as mongoose.Model<IAssessment>;

    const assessment = await Assessment.findById(assessmentId)
        .populate<{ examId: IExam }>('examId', 'name academicYearId termId')
        .populate<{ subjectId: ISubject }>('subjectId', 'name code')
        .populate<{ classId: IClass }>('classId', 'name level')
        .lean();
        
    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    return NextResponse.json(assessment);
  } catch (error: any) {
    console.error(`Error fetching assessment ${assessmentId} for ${schoolCode}:`, error);
    return NextResponse.json({ error: 'Failed to fetch assessment', details: error.message }, { status: 500 });
  }
}
*/

