
'use client';
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Button, Typography, Select, Card, Row, Col, message, Spin, Table, Empty, Alert, Breadcrumb, Tag, Tooltip, Modal } from 'antd';
import { RocketOutlined, SearchOutlined, CalendarOutlined, TeamOutlined, QuestionCircleOutlined, CheckOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
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

  const [fromAcademicYears, setFromAcademicYears] = useState<IAcademicYear[]>([]);
  const [selectedFromYear, setSelectedFromYear] = useState<string | undefined>();
  const [fromClasses, setFromClasses] = useState<IClass[]>([]);
  const [selectedFromClass, setSelectedFromClass] = useState<string | undefined>();
  
  const [allAcademicYears, setAllAcademicYears] = useState<IAcademicYear[]>([]);
  const [targetAcademicYear, setTargetAcademicYear] = useState<string | undefined>();
  const [allClasses, setAllClasses] = useState<IClass[]>([]);
  const [targetClasses, setTargetClasses] = useState<IClass[]>([]);
  const [targetClass, setTargetClass] = useState<string | undefined>();

  const [classResults, setClassResults] = useState<ClassTermResult[]>([]);
  
  const [loadingYears, setLoadingYears] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [saving, setSaving] = useState(false);

  const ACADEMIC_YEARS_API = `/api/${schoolCode}/portal/academics/academic-years`;
  const CLASSES_API_BASE = `/api/${schoolCode}/portal/academics/classes`;
  const REPORT_API_BASE = `/api/${schoolCode}/portal/reports/class-term-report`;
  const PROCESS_API = `/api/${schoolCode}/portal/admin/grading-promotion/process`;

  // Fetch all years for both 'from' and 'target' dropdowns
  useEffect(() => {
    const fetchYears = async () => {
      setLoadingYears(true);
      try {
        const res = await fetch(ACADEMIC_YEARS_API);
        if (!res.ok) throw new Error((await res.json()).error ||'Failed to fetch academic years');
        const data: IAcademicYear[] = await res.json();
        const sortedData = data.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        setFromAcademicYears(sortedData);
        setAllAcademicYears(sortedData);
        const activeYear = sortedData.find(y => y.isActive);
        if (activeYear) setSelectedFromYear(activeYear._id);
        else if (sortedData.length > 0) setSelectedFromYear(sortedData[0]._id)
      } catch (err: any) { message.error(err.message || 'Could not load academic years.'); }
      finally { setLoadingYears(false); }
    };
    fetchYears();
  }, [schoolCode, ACADEMIC_YEARS_API]);

  // Fetch all classes once
  useEffect(() => {
      const fetchAllClasses = async () => {
          setLoadingClasses(true);
          try {
              const res = await fetch(CLASSES_API_BASE);
              if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch all classes');
              setAllClasses(await res.json());
          } catch(err: any) { message.error(err.message || 'Could not load classes.'); }
          finally { setLoadingClasses(false); }
      };
      fetchAllClasses();
  }, [schoolCode, CLASSES_API_BASE]);

  // Filter 'from' classes when 'from' year changes
  useEffect(() => {
    if (selectedFromYear) {
      setFromClasses(allClasses.filter(c => (c.academicYearId as IAcademicYear)._id.toString() === selectedFromYear));
      setSelectedFromClass(undefined);
    } else {
      setFromClasses([]);
    }
  }, [selectedFromYear, allClasses]);

  // Filter 'target' classes when 'target' year changes
  useEffect(() => {
    if (targetAcademicYear) {
        setTargetClasses(allClasses.filter(c => (c.academicYearId as IAcademicYear)._id.toString() === targetAcademicYear));
        setTargetClass(undefined);
    } else {
        setTargetClasses([]);
    }
  }, [targetAcademicYear, allClasses]);


  const handleFetchResults = useCallback(async () => {
    if (!selectedFromYear || !selectedFromClass) {
      message.info('Please select a "From" Academic Year and a Class.');
      setClassResults([]);
      return;
    }
    setLoadingResults(true);
    try {
      const res = await fetch(`${REPORT_API_BASE}?academicYearId=${selectedFromYear}&classId=${selectedFromClass}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to generate class report');
      const data: ClassTermResult[] = await res.json();
      setClassResults(data);
    } catch (err: any) {
      message.error(err.message || 'Could not load report data.');
      setClassResults([]);
    } finally {
      setLoadingResults(false);
    }
  }, [selectedFromYear, selectedFromClass, schoolCode, REPORT_API_BASE]);

  const PROMOTION_THRESHOLD = 50;

  const handleConfirmPromotions = () => {
    if (!targetClass) {
        message.error("Please select a target class for promotion.");
        return;
    }

    const studentsToPromote = classResults.filter(r => (r.averagePercentage || 0) >= PROMOTION_THRESHOLD);
    if (studentsToPromote.length === 0) {
        message.warning("No students meet the criteria for promotion.");
        return;
    }
    const studentProfileIds = studentsToPromote.map(s => s.studentId);
    
    Modal.confirm({
        title: `Confirm Promotion of ${studentsToPromote.length} Students?`,
        icon: <ExclamationCircleOutlined />,
        content: (
            <div>
                <p>You are about to promote {studentsToPromote.length} students from 
                <strong> {fromClasses.find(c => c._id === selectedFromClass)?.name} </strong> 
                to 
                <strong> {targetClasses.find(c => c._id === targetClass)?.name}</strong>.</p>
                <p>This action will update their class and academic year records. This process cannot be easily undone.</p>
                <p><strong>Are you sure you want to proceed?</strong></p>
            </div>
        ),
        okText: "Yes, Promote Students",
        okType: 'primary',
        cancelText: "No, Cancel",
        onOk: async () => {
            setSaving(true);
            try {
                const response = await fetch(PROCESS_API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentProfileIds, targetClassId: targetClass })
                });
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || 'Failed to process promotions');
                }
                message.success(`${result.modifiedCount || 0} students have been successfully promoted.`);
                // Optionally clear the results table after promotion
                setClassResults([]);
                setSelectedFromClass(undefined);
            } catch (error: any) {
                message.error(`Promotion failed: ${error.message}`);
            } finally {
                setSaving(false);
            }
        }
    });
  };

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
      <Card title="Promotion Analysis & Execution" className="mb-6">
        <Row gutter={[16, 24]}>
          <Col xs={24} md={12}>
            <Card type="inner" title="1. Select Source Class">
                <Text>Academic Year</Text>
                <Select style={{ width: '100%', marginBottom: 16 }} placeholder="Select Academic Year" value={selectedFromYear} onChange={setSelectedFromYear} loading={loadingYears} suffixIcon={<CalendarOutlined />}>
                  {fromAcademicYears.map(year => <Option key={year._id} value={year._id}>{year.name}</Option>)}
                </Select>
                <Text>Class</Text>
                <Select style={{ width: '100%' }} placeholder="Select Class" value={selectedFromClass} onChange={setSelectedFromClass} loading={loadingClasses} disabled={!selectedFromYear || loadingClasses} suffixIcon={<TeamOutlined />}>
                  {fromClasses.map(cls => <Option key={cls._id} value={cls._id}>{cls.name}</Option>)}
                </Select>
                 <Button type="default" icon={<SearchOutlined />} onClick={handleFetchResults} loading={loadingResults} disabled={!selectedFromYear || !selectedFromClass} style={{marginTop: 16}}>Analyze Results</Button>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card type="inner" title="2. Select Target Class">
                <Text>Target Academic Year</Text>
                <Select style={{ width: '100%', marginBottom: 16 }} placeholder="Select Target Academic Year" value={targetAcademicYear} onChange={setTargetAcademicYear} loading={loadingYears} suffixIcon={<CalendarOutlined />}>
                  {allAcademicYears.map(year => <Option key={year._id} value={year._id}>{year.name}</Option>)}
                </Select>
                 <Text>Target Class</Text>
                <Select style={{ width: '100%' }} placeholder="Select Target Class" value={targetClass} onChange={setTargetClass} loading={loadingClasses} disabled={!targetAcademicYear || loadingClasses} suffixIcon={<TeamOutlined />}>
                  {targetClasses.map(cls => <Option key={cls._id} value={cls._id}>{cls.name}</Option>)}
                </Select>
            </Card>
          </Col>
        </Row>
      </Card>
      
      {loadingResults ? (
        <div className="text-center p-8"><Spin tip="Analyzing class results..." /></div>
      ) : classResults.length > 0 ? (
        <>
            <Title level={4}>Promotion Analysis for {fromClasses.find(c=>c._id === selectedFromClass)?.name}</Title>
            <Alert
                message="Review Suggestions"
                description={`Based on a threshold of ${PROMOTION_THRESHOLD}%, the system has suggested an action for each student. Please review these suggestions and select a target class before confirming promotions.`}
                type="info"
                showIcon
                className="mb-4"
            />
            <Table columns={columns} dataSource={classResults} rowKey="studentId" bordered size="middle" />
            <div className="text-right mt-6">
                <Button type="primary" size="large" icon={<CheckOutlined/>} onClick={handleConfirmPromotions} disabled={!targetClass || saving} loading={saving}>
                    Confirm & Promote Students
                </Button>
            </div>
        </>
      ) : (
        <Empty description="Select source class and click 'Analyze Results' to see promotion suggestions." />
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
