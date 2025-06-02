
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Select, Card, Row, Col, message, Spin, Table, Empty, Space, Tooltip } from 'antd';
import { EditOutlined, ReadOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import type { IExam } from '@/models/Tenant/Exam';
import type { IClass } from '@/models/Tenant/Class';
import type { ISubject } from '@/models/Tenant/Subject';
import type { IAssessment } from '@/models/Tenant/Assessment';

const { Title, Paragraph } = Typography;
const { Option } = Select;

interface TeacherAssignment {
  classId: { _id: string; name: string; level?: string; stream?: string };
  subjectId: { _id: string; name: string; code?: string };
  academicYearId: { _id: string; name: string };
}

interface AssessmentWithDetails extends IAssessment {
  subjectName?: string;
  className?: string;
}

export default function MarksEntrySelectionPage() {
  const params = useParams();
  const router = useRouter();
  const schoolCode = params.schoolCode as string;

  const [academicYears, setAcademicYears] = useState<IAcademicYear[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | undefined>();
  
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<IClass[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<ISubject[]>([]);

  const [exams, setExams] = useState<IExam[]>([]);
  const [selectedExam, setSelectedExam] = useState<string | undefined>();

  const [selectedClass, setSelectedClass] = useState<string | undefined>();
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>();
  
  const [assessments, setAssessments] = useState<AssessmentWithDetails[]>([]);
  
  const [loadingYears, setLoadingYears] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingExams, setLoadingExams] = useState(false);
  const [loadingAssessments, setLoadingAssessments] = useState(false);

  const ACADEMIC_YEARS_API = `/api/${schoolCode}/portal/academics/academic-years`;
  const TEACHER_ASSIGNMENTS_API = `/api/${schoolCode}/portal/teachers/my-assignments`;
  const EXAMS_API_BASE = `/api/${schoolCode}/portal/exams`; // Query by academicYearId
  const ASSESSMENTS_API_BASE = `/api/${schoolCode}/portal/exams`; // /:examId/assessments

  // Fetch Academic Years
  useEffect(() => {
    const fetchYears = async () => {
      setLoadingYears(true);
      try {
        const res = await fetch(ACADEMIC_YEARS_API);
        if (!res.ok) throw new Error('Failed to fetch academic years');
        const data: IAcademicYear[] = await res.json();
        setAcademicYears(data);
        const activeYear = data.find(y => y.isActive);
        if (activeYear) setSelectedAcademicYear(activeYear._id);
      } catch (err: any) {
        message.error(err.message || 'Could not load academic years.');
      } finally {
        setLoadingYears(false);
      }
    };
    fetchYears();
  }, [schoolCode, ACADEMIC_YEARS_API]);

  // Fetch Teacher Assignments when Academic Year changes
  useEffect(() => {
    if (!selectedAcademicYear) {
      setTeacherAssignments([]);
      setAssignedClasses([]);
      setAssignedSubjects([]);
      setSelectedClass(undefined);
      setSelectedSubject(undefined);
      return;
    }
    const fetchAssignments = async () => {
      setLoadingAssignments(true);
      try {
        const res = await fetch(`${TEACHER_ASSIGNMENTS_API}?academicYearId=${selectedAcademicYear}`);
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch teacher assignments');
        const data: TeacherAssignment[] = await res.json();
        setTeacherAssignments(data);

        // Populate unique classes
        const uniqueClasses = Array.from(new Map(data.map(item => [item.classId._id, item.classId])).values());
        setAssignedClasses(uniqueClasses as IClass[]);

      } catch (err: any) {
        message.error(err.message || 'Could not load teacher assignments.');
        setTeacherAssignments([]);
        setAssignedClasses([]);
      } finally {
        setLoadingAssignments(false);
      }
    };
    fetchAssignments();
  }, [selectedAcademicYear, schoolCode, TEACHER_ASSIGNMENTS_API]);

  // Update assigned subjects when class changes
  useEffect(() => {
    if (!selectedClass || teacherAssignments.length === 0) {
      setAssignedSubjects([]);
      setSelectedSubject(undefined);
      return;
    }
    const subjectsForClass = teacherAssignments
      .filter(assign => assign.classId._id === selectedClass)
      .map(assign => assign.subjectId);
    setAssignedSubjects(subjectsForClass as ISubject[]);
    setSelectedSubject(undefined); // Reset subject selection
  }, [selectedClass, teacherAssignments]);


  // Fetch Exams when Academic Year changes
  useEffect(() => {
    if (!selectedAcademicYear) {
      setExams([]);
      setSelectedExam(undefined);
      return;
    }
    const fetchExams = async () => {
      setLoadingExams(true);
      try {
        const res = await fetch(`${EXAMS_API_BASE}?academicYearId=${selectedAcademicYear}`);
        if (!res.ok) throw new Error('Failed to fetch exams');
        const data: IExam[] = await res.json();
        setExams(data.filter(e => ['Scheduled', 'Ongoing', 'Grading'].includes(e.status)));
      } catch (err: any) {
        message.error(err.message || 'Could not load exams.');
      } finally {
        setLoadingExams(false);
      }
    };
    fetchExams();
  }, [selectedAcademicYear, EXAMS_API_BASE]);


  // Fetch Assessments when Exam, Class, and Subject are selected
  const fetchAssessments = useCallback(async () => {
    if (!selectedExam || !selectedClass || !selectedSubject) {
      setAssessments([]);
      return;
    }
    setLoadingAssessments(true);
    try {
      const res = await fetch(`${ASSESSMENTS_API_BASE}/${selectedExam}/assessments?classId=${selectedClass}&subjectId=${selectedSubject}`);
      if (!res.ok) throw new Error('Failed to fetch assessments for the selected criteria.');
      const data: IAssessment[] = await res.json();

      const detailedData = data.map(asm => {
          const subjectDetails = assignedSubjects.find(s => s._id === (typeof asm.subjectId === 'string' ? asm.subjectId : (asm.subjectId as any)._id));
          const classDetails = assignedClasses.find(c => c._id === (typeof asm.classId === 'string' ? asm.classId : (asm.classId as any)._id));
          return {
              ...asm,
              subjectName: subjectDetails?.name || 'N/A',
              className: classDetails?.name || 'N/A',
          }
      });
      setAssessments(detailedData);

    } catch (err: any) {
      message.error(err.message || 'Could not load assessments.');
      setAssessments([]);
    } finally {
      setLoadingAssessments(false);
    }
  }, [selectedExam, selectedClass, selectedSubject, ASSESSMENTS_API_BASE, assignedSubjects, assignedClasses]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);


  const assessmentColumns = [
    { title: 'Assessment Name', dataIndex: 'assessmentName', key: 'assessmentName' },
    { title: 'Subject', dataIndex: 'subjectName', key: 'subjectName' },
    { title: 'Class', dataIndex: 'className', key: 'className' },
    { title: 'Type', dataIndex: 'assessmentType', key: 'assessmentType' },
    { title: 'Max Marks', dataIndex: 'maxMarks', key: 'maxMarks' },
    { title: 'Date', dataIndex: 'assessmentDate', key: 'assessmentDate', render: (date: string) => new Date(date).toLocaleDateString() },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: IAssessment) => (
        <Tooltip title="Enter or View Marks">
          <Link href={`/${schoolCode}/portal/teacher/marks-entry/${record._id}`}>
            <Button icon={<EditOutlined />} type="primary">Enter/View Marks</Button>
          </Link>
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <Title level={2} className="mb-6"><ReadOutlined className="mr-2" />Marks Entry Portal</Title>
      <Paragraph>Select the criteria to find the assessment for which you want to enter marks.</Paragraph>

      <Row gutter={[16, 24]} className="mb-6">
        <Col xs={24} sm={12} md={6}>
          <Card title="1. Academic Year" size="small">
            <Select
              style={{ width: '100%' }}
              placeholder="Select Academic Year"
              value={selectedAcademicYear}
              onChange={setSelectedAcademicYear}
              loading={loadingYears}
              disabled={loadingYears}
            >
              {academicYears.map(year => <Option key={year._id} value={year._id}>{year.name}</Option>)}
            </Select>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card title="2. Examination" size="small">
            <Select
              style={{ width: '100%' }}
              placeholder="Select Exam"
              value={selectedExam}
              onChange={setSelectedExam}
              loading={loadingExams}
              disabled={!selectedAcademicYear || loadingExams}
            >
              {exams.map(exam => <Option key={exam._id} value={exam._id}>{exam.name}</Option>)}
            </Select>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card title="3. Class" size="small">
             <Select
              style={{ width: '100%' }}
              placeholder="Select Class"
              value={selectedClass}
              onChange={setSelectedClass}
              loading={loadingAssignments}
              disabled={!selectedAcademicYear || loadingAssignments || assignedClasses.length === 0}
              notFoundContent={loadingAssignments ? <Spin size="small" /> : "No classes assigned for this year, or select academic year."}
            >
              {assignedClasses.map(cls => <Option key={cls._id} value={cls._id}>{cls.name} {cls.level ? `(${cls.level})` : ''}</Option>)}
            </Select>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card title="4. Subject" size="small">
            <Select
              style={{ width: '100%' }}
              placeholder="Select Subject"
              value={selectedSubject}
              onChange={setSelectedSubject}
              loading={loadingAssignments && !!selectedClass} // only show loading if class is selected and still processing assignments
              disabled={!selectedClass || loadingAssignments || assignedSubjects.length === 0}
              notFoundContent={loadingAssignments && !!selectedClass ? <Spin size="small" /> : "No subjects assigned for this class, or select class."}
            >
              {assignedSubjects.map(sub => <Option key={sub._id} value={sub._id}>{sub.name} {sub.code ? `(${sub.code})` : ''}</Option>)}
            </Select>
          </Card>
        </Col>
      </Row>

      <Title level={4} className="my-6">Available Assessments for Selected Criteria</Title>
      {loadingAssessments ? <div className="text-center p-4"><Spin tip="Loading assessments..." /></div> : (
        <Table 
          columns={assessmentColumns} 
          dataSource={assessments} 
          rowKey="_id"
          locale={{ emptyText: <Empty description="No assessments found for the selected criteria. Please ensure all filters (Academic Year, Exam, Class, Subject) are selected and have valid assignments." /> }}
        />
      )}
    </div>
  );
}
