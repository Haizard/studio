
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
  
  const [exams, setExams] = useState<IExam[]>([]);
  const [selectedExam, setSelectedExam] = useState<string | undefined>();

  const [classes, setClasses] = useState<IClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | undefined>();
  
  const [subjects, setSubjects] = useState<ISubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>();
  
  const [assessments, setAssessments] = useState<AssessmentWithDetails[]>([]);
  
  const [loadingYears, setLoadingYears] = useState(true);
  const [loadingExams, setLoadingExams] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingAssessments, setLoadingAssessments] = useState(false);

  const ACADEMIC_YEARS_API = `/api/${schoolCode}/portal/academics/academic-years`;
  const EXAMS_API = `/api/${schoolCode}/portal/exams`;
  const CLASSES_API = `/api/${schoolCode}/portal/academics/classes`;
  const SUBJECTS_API = `/api/${schoolCode}/portal/academics/subjects`;
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
        // Auto-select active year if available
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
        const res = await fetch(`${EXAMS_API}?academicYearId=${selectedAcademicYear}`);
        if (!res.ok) throw new Error('Failed to fetch exams');
        const data: IExam[] = await res.json();
        setExams(data.filter(e => ['Scheduled', 'Ongoing', 'Grading'].includes(e.status))); // Filter for relevant statuses
      } catch (err: any) {
        message.error(err.message || 'Could not load exams.');
      } finally {
        setLoadingExams(false);
      }
    };
    fetchExams();
  }, [selectedAcademicYear, EXAMS_API]);

  // Fetch Classes when Academic Year changes (or could be exam, depending on logic)
   useEffect(() => {
    if (!selectedAcademicYear) {
      setClasses([]);
      setSelectedClass(undefined);
      return;
    }
    const fetchClasses = async () => {
      setLoadingClasses(true);
      try {
        // Assuming classes are tied to an academic year
        const res = await fetch(`${CLASSES_API}?academicYearId=${selectedAcademicYear}`);
        if (!res.ok) throw new Error('Failed to fetch classes');
        const data: IClass[] = await res.json();
        setClasses(data);
      } catch (err: any) {
        message.error(err.message || 'Could not load classes.');
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClasses();
  }, [selectedAcademicYear, CLASSES_API]);


  // Fetch Subjects - general list, could be filtered by class later
  useEffect(() => {
    const fetchSubjects = async () => {
      setLoadingSubjects(true);
      try {
        const res = await fetch(SUBJECTS_API);
        if (!res.ok) throw new Error('Failed to fetch subjects');
        const data: ISubject[] = await res.json();
        setSubjects(data);
      } catch (err: any) {
        message.error(err.message || 'Could not load subjects.');
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, [SUBJECTS_API]);


  // Fetch Assessments when Exam, Class, and Subject are selected
  const fetchAssessments = useCallback(async () => {
    if (!selectedExam || !selectedClass || !selectedSubject) {
      setAssessments([]);
      return;
    }
    setLoadingAssessments(true);
    try {
      const res = await fetch(`${ASSESSMENTS_API_BASE}/${selectedExam}/assessments?classId=${selectedClass}&subjectId=${selectedSubject}`);
      if (!res.ok) throw new Error('Failed to fetch assessments');
      const data: IAssessment[] = await res.json();

      // Add subject and class names for display
      const detailedData = data.map(asm => {
          const subject = subjects.find(s => s._id === (typeof asm.subjectId === 'string' ? asm.subjectId : (asm.subjectId as any)._id));
          const cls = classes.find(c => c._id === (typeof asm.classId === 'string' ? asm.classId : (asm.classId as any)._id));
          return {
              ...asm,
              subjectName: subject?.name || 'N/A',
              className: cls?.name || 'N/A',
          }
      });
      setAssessments(detailedData);

    } catch (err: any) {
      message.error(err.message || 'Could not load assessments.');
      setAssessments([]);
    } finally {
      setLoadingAssessments(false);
    }
  }, [selectedExam, selectedClass, selectedSubject, ASSESSMENTS_API_BASE, subjects, classes]);

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
              loading={loadingClasses}
              disabled={!selectedAcademicYear || loadingClasses}
            >
              {classes.map(cls => <Option key={cls._id} value={cls._id}>{cls.name} ({cls.level})</Option>)}
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
              loading={loadingSubjects}
              disabled={loadingSubjects || !selectedClass } // Subject selection enabled once class is chosen
            >
              {subjects.map(sub => <Option key={sub._id} value={sub._id}>{sub.name} {sub.code ? `(${sub.code})` : ''}</Option>)}
            </Select>
          </Card>
        </Col>
      </Row>

      <Title level={4} className="my-6">Available Assessments</Title>
      {loadingAssessments ? <Spin tip="Loading assessments..." /> : (
        <Table 
          columns={assessmentColumns} 
          dataSource={assessments} 
          rowKey="_id"
          locale={{ emptyText: <Empty description="No assessments found for the selected criteria, or not all criteria selected." /> }}
        />
      )}
    </div>
  );
}
