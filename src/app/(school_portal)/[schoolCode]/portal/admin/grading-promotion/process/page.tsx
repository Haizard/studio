'use client';
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Button, Typography, Select, Card, Row, Col, message, Spin, Table, Empty, Alert, Breadcrumb, Tag, Tooltip } from 'antd';
import { RocketOutlined, SearchOutlined, CalendarOutlined, TeamOutlined, QuestionCircleOutlined, CheckOutlined } from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import type { IClass } from '@/models/Tenant/Class';
import Link from 'next/link';
import moment from 'moment';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

// Interface for the data structure returned by the API
interface ClassTermResult {
  studentId: string;
  studentName: string;
  totalMarksObtained: number;
  totalMaxMarks: number;
  averagePercentage?: number;
  grade?: string;
  remarks?: string;
}

function ProcessPromotionsPageCore() {
  const params = useParams();
  const router = useRouter();
  const schoolCode = params.schoolCode as string;

  const [academicYears, setAcademicYears] = useState<IAcademicYear[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | undefined>();
  
  const [classes, setClasses] = useState<IClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | undefined>();
  
  const [classResults, setClassResults] = useState<ClassTermResult[]>([]);
  
  const [loadingYears, setLoadingYears] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);

  const ACADEMIC_YEARS_API = `/api/${schoolCode}/portal/academics/academic-years`;
  const CLASSES_API_BASE = `/api/${schoolCode}/portal/academics/classes`;
  const REPORT_API_BASE = `/api/${schoolCode}/portal/reports/class-term-report`;


  useEffect(() => {
    const fetchYears = async () => {
      setLoadingYears(true);
      try {
        const res = await fetch(ACADEMIC_YEARS_API);
        if (!res.ok) throw new Error((await res.json()).error ||'Failed to fetch academic years');
        const data: IAcademicYear[] = await res.json();
        setAcademicYears(data.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
        const activeYear = data.find(y => y.isActive);
        if (activeYear) setSelectedAcademicYear(activeYear._id);
        else if (data.length > 0) setSelectedAcademicYear(data[0]._id)
      } catch (err: any) { message.error(err.message || 'Could not load academic years.'); }
      finally { setLoadingYears(false); }
    };
    fetchYears();
  }, [schoolCode, ACADEMIC_YEARS_API]);

  useEffect(() => {
    if (!selectedAcademicYear) {
      setClasses([]);
      setSelectedClass(undefined);
      return;
    }
    const fetchClasses = async () => {
      setLoadingClasses(true);
      try {
        const res = await fetch(`${CLASSES_API_BASE}?academicYearId=${selectedAcademicYear}`);
        if (!res.ok) throw new Error((await res.json()).error ||'Failed to fetch classes');
        setClasses((await res.json()).sort((a: IClass, b: IClass) => a.name.localeCompare(b.name)));
        setSelectedClass(undefined);
      } catch (err: any) { message.error(err.message || 'Could not load classes.'); }
      finally { setLoadingClasses(false); }
    };
    fetchClasses();
  }, [selectedAcademicYear, schoolCode, CLASSES_API_BASE]);


  const handleFetchResults = useCallback(async () => {
    if (!selectedAcademicYear || !selectedClass) {
      message.info('Please select an Academic Year and a Class.');
      setClassResults([]);
      return;
    }
    setLoadingResults(true);
    try {
      const res = await fetch(`${REPORT_API_BASE}?academicYearId=${selectedAcademicYear}&classId=${selectedClass}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to generate class report');
      const data: ClassTermResult[] = await res.json();
      setClassResults(data);
    } catch (err: any) {
      message.error(err.message || 'Could not load report data.');
      setClassResults([]);
    } finally {
      setLoadingResults(false);
    }
  }, [selectedAcademicYear, selectedClass, schoolCode, REPORT_API_BASE]);

  const PROMOTION_THRESHOLD = 50; // Example threshold

  const columns = [
    { title: 'Student Name', dataIndex: 'studentName', key: 'studentName', sorter: (a: ClassTermResult, b: ClassTermResult) => a.studentName.localeCompare(b.studentName) },
    { title: 'Total Marks', dataIndex: 'totalMarksObtained', key: 'totalMarks', render: (val: number, record: ClassTermResult) => `${val.toFixed(1)} / ${record.totalMaxMarks.toFixed(1)}`},
    { title: 'Average', dataIndex: 'averagePercentage', key: 'average', render: (val?: number) => val !== undefined ? `${val.toFixed(1)}%` : 'N/A', sorter: (a: ClassTermResult, b: ClassTermResult) => (a.averagePercentage || 0) - (b.averagePercentage || 0)},
    { title: 'Grade', dataIndex: 'grade', key: 'grade', render: (grade?: string) => grade || 'N/A' },
    { title: 'Remarks', dataIndex: 'remarks', key: 'remarks', render: (remarks?: string) => remarks || 'N/A' },
    {
        title: 'Suggested Action',
        key: 'action',
        render: (_:any, record: ClassTermResult) => {
            if (record.averagePercentage === undefined) return <Tag>Review</Tag>;
            return record.averagePercentage >= PROMOTION_THRESHOLD
                ? <Tag color="success">Promote</Tag>
                : <Tag color="error">Repeat</Tag>
        }
    }
  ];
  
  const breadcrumbItems = [
    { title: <Link href={`/${schoolCode}/portal/dashboard`}>Dashboard</Link> },
    { title: <Link href={`/${schoolCode}/portal/admin/grading-promotion`}>Grading & Promotion</Link> },
    { title: 'Process Promotions' },
  ];

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} className="mb-4" />
      <Title level={2} className="mb-6"><RocketOutlined className="mr-2" />Process Student Promotions</Title>
      <Paragraph>Select a class and academic year to analyze student performance and prepare for promotion to the next class.</Paragraph>
      <Card title="Select Class for Promotion Analysis" className="mb-6">
        <Row gutter={[16, 16]} align="bottom">
          <Col xs={24} sm={12}>
            <Text>Academic Year</Text>
            <Select style={{ width: '100%' }} placeholder="Select Academic Year" value={selectedAcademicYear} onChange={setSelectedAcademicYear} loading={loadingYears} suffixIcon={<CalendarOutlined />}>
              {academicYears.map(year => <Option key={year._id} value={year._id}>{year.name}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12}>
            <Text>Class</Text>
            <Select style={{ width: '100%' }} placeholder="Select Class" value={selectedClass} onChange={setSelectedClass} loading={loadingClasses} disabled={!selectedAcademicYear || loadingClasses} suffixIcon={<TeamOutlined />}>
              {classes.map(cls => <Option key={cls._id} value={cls._id}>{cls.name}</Option>)}
            </Select>
          </Col>
        </Row>
        <Row justify="end" className="mt-4">
            <Col><Button type="primary" icon={<SearchOutlined />} onClick={handleFetchResults} loading={loadingResults} disabled={!selectedAcademicYear || !selectedClass}>Analyze Results</Button></Col>
        </Row>
      </Card>
      
      {loadingResults ? (
        <div className="text-center p-8"><Spin tip="Analyzing class results..." /></div>
      ) : classResults.length > 0 ? (
        <>
            <Title level={4}>Promotion Analysis for {classes.find(c=>c._id === selectedClass)?.name}</Title>
            <Alert
                message="Review Suggestions"
                description={`Based on a threshold of ${PROMOTION_THRESHOLD}%, the system has suggested an action for each student. Please review these suggestions carefully before confirming promotions. The final action to promote students is not yet enabled.`}
                type="info"
                showIcon
                className="mb-4"
            />
            <Table columns={columns} dataSource={classResults} rowKey="studentId" bordered size="middle" />
            <div className="text-right mt-6">
                <Tooltip title="This functionality to update student records will be enabled in a future step.">
                    <Button type="primary" size="large" icon={<CheckOutlined/>} disabled>Confirm & Promote Students</Button>
                </Tooltip>
            </div>
        </>
      ) : (
        <Empty description="Select a class and click 'Analyze Results' to see promotion suggestions." />
      )}
    </div>
  );
}


export default function ProcessPromotionsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Spin size="large" tip="Loading page..." /></div>}>
            <ProcessPromotionsPageCore />
        </Suspense>
    );
}
