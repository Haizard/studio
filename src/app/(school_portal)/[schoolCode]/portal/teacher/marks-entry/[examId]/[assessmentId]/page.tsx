
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Table, InputNumber, Input, message, Spin, Row, Col, Card, Descriptions, Alert, Breadcrumb } from 'antd';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { IAssessment } from '@/models/Tenant/Assessment';
import type { IMark } from '@/models/Tenant/Mark';
import type { IStudent } from '@/models/Tenant/Student'; 
import type { ITenantUser } from '@/models/Tenant/User';
import mongoose from 'mongoose';

const { Title } = Typography;
const { TextArea } = Input;

interface StudentMarkData extends Partial<IMark> { 
  key: string; 
  studentName: string;
  studentUsername: string; 
  marksObtained?: number | null;
  comments?: string;
}

interface MarkEntryProps {
  params: { schoolCode: string; examId: string; assessmentId: string };
}

export default function MarksEntryTablePage({ params: routeParams }: MarkEntryProps) {
  const { schoolCode, examId, assessmentId } = routeParams;
  const router = useRouter();

  const [assessmentDetails, setAssessmentDetails] = useState<IAssessment | null>(null);
  const [students, setStudents] = useState<StudentMarkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const ASSESSMENT_DETAILS_API_URL = `/api/${schoolCode}/portal/exams/${examId}/assessments/${assessmentId}`;
  const STUDENTS_API_URL_BASE = `/api/${schoolCode}/portal/students/class/`; 
  const MARKS_API_URL = `/api/${schoolCode}/portal/marks/assessment/${assessmentId}`;
  const BATCH_MARKS_API_URL = `/api/${schoolCode}/portal/marks/batch`;


  const fetchAssessmentDetails = useCallback(async () => {
    if (!mongoose.Types.ObjectId.isValid(assessmentId) || !mongoose.Types.ObjectId.isValid(examId)) {
        message.error("Invalid Exam or Assessment ID.");
        router.back();
        return null;
    }
    try {
      const res = await fetch(ASSESSMENT_DETAILS_API_URL); 
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch assessment details');
      const data: IAssessment = await res.json();
      setAssessmentDetails(data);
      return data; 
    } catch (error: any) {
      message.error(error.message || 'Could not load assessment details.');
      setLoading(false);
      return null;
    }
  }, [schoolCode, examId, assessmentId, router, ASSESSMENT_DETAILS_API_URL]);


  const fetchStudentsAndMarks = useCallback(async (currentAssessment: IAssessment) => {
    if (!currentAssessment || !currentAssessment.classId) return;
    setLoading(true);
    try {
      const classId = typeof currentAssessment.classId === 'string' ? currentAssessment.classId : (currentAssessment.classId as any)._id;
      
      const [studentsRes, marksRes] = await Promise.all([
        fetch(`${STUDENTS_API_URL_BASE}${classId}`),
        fetch(`${MARKS_API_URL}`), 
      ]);

      if (!studentsRes.ok) throw new Error((await studentsRes.json()).error || 'Failed to fetch students for the class.');
      if (!marksRes.ok) throw new Error((await marksRes.json()).error || 'Failed to fetch existing marks.');

      const studentsData: IStudent[] = await studentsRes.json(); 
      const marksData: IMark[] = await marksRes.json();

      const marksMap = new Map(marksData.map(mark => [mark.studentId.toString(), mark]));

      const studentMarkEntries: StudentMarkData[] = studentsData
        .filter(student => student.userId) 
        .map(student => {
            const user = student.userId as ITenantUser; 
            const existingMark = marksMap.get(user._id.toString());
            return {
            key: user._id.toString(),
            studentId: user._id,
            studentName: `${user.firstName} ${user.lastName}`,
            studentUsername: user.username,
            marksObtained: existingMark?.marksObtained !== undefined ? existingMark.marksObtained : null,
            comments: existingMark?.comments || '',
            _id: existingMark?._id, 
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
            setLoading(false); 
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
    { title: `Exam: ${assessmentDetails?.examId && typeof assessmentDetails.examId === 'object' ? (assessmentDetails.examId as any).name : 'Details'}` },
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
          rowKey="key"
          bordered
          size="middle"
          pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'] }}
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
