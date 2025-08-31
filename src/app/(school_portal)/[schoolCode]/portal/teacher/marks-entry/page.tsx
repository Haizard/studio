
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Select, Card, Row, Col, message, Spin, Table, Empty, Space, Tooltip } from 'antd';
import { EditOutlined, ReadOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
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
  _id: string; // Ensure _id is a string after sanitization
  subjectName?: string;
  className?: string;
}

export default function MarksEntrySelectionPage({ params }: { params: { schoolCode: string } }) {
  const { schoolCode } = params;
  const router = useRouter();

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
  const EXAMS_API_BASE = `/api/${schoolCode}/portal/exams`;
  const ASSESSMENTS_API_BASE = `/api/${schoolCode}/portal/exams`;

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

  useEffect(() => {
    if (!selectedClass || teacherAssignments.length === 0) {
      setAssignedSubjects([]);
      setSelectedSubject(undefined);
      return;
    }
    const subjectsForClass = teacherAssignments
      .filter(assign => assign.classId._id === selectedClass && assign.academicYearId._id === selectedAcademicYear)
      .map(assign => assign.subjectId);
    
    const uniqueSubjects = Array.from(new Map(subjectsForClass.map(sub => [sub._id, sub])).values());
    setAssignedSubjects(uniqueSubjects as ISubject[]);
    setSelectedSubject(undefined);
  }, [selectedClass, teacherAssignments, selectedAcademicYear]);

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

  const fetchAssessments = useCallback(async () => {
    if (!selectedExam || !selectedClass || !selectedSubject) {
      setAssessments([]);
      return;
    }
    setLoadingAssessments(true);
    try {
      const res = await fetch(`${ASSESSMENTS_API_BASE}/${selectedExam}/assessments?classId=${selectedClass}&subjectId=${selectedSubject}`);
      if (!res.ok) throw new Error('Failed to fetch assessments for the selected criteria.');
      const data: any[] = await res.json(); // Data from API is already sanitized
      
      const detailedData = data.map(asm => {
          const subjectDetails = assignedSubjects.find(s => s._id === asm.subjectId);
          const classDetails = assignedClasses.find(c => c._id === asm.classId);
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
      render: (_: any, record: AssessmentWithDetails) => (
        <Tooltip title="Enter or View Marks">
          <Button icon={<EditOutlined />} type="primary">Enter/View Marks</Button>
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
              loading={loadingAssignments && !!selectedClass}
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
          onRow={(record) => ({
            onClick: () => {
              if (selectedExam && record._id) {
                // Ensure record._id is a string before encoding
                const assessmentIdString = typeof record._id === 'object' ? record._id.toString() : record._id;
                router.push(`/${encodeURIComponent(schoolCode)}/portal/teacher/marks-entry/${encodeURIComponent(selectedExam)}/${encodeURIComponent(assessmentIdString)}`);
              }
            },
            style: { cursor: 'pointer' },
          })}
          locale={{ emptyText: <Empty description="No assessments found for the selected criteria. Please ensure all filters (Academic Year, Exam, Class, Subject) are selected and have valid assignments." /> }}
        />
      )}
    </div>
  );
}
