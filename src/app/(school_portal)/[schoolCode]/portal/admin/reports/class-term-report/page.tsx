
'use client';
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Button, Typography, Select, Card, Row, Col, message, Spin, Table, Empty, Tag, Alert } from 'antd';
import { TeamOutlined, SearchOutlined, CalendarOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import type { IClass } from '@/models/Tenant/Class';
import moment from 'moment';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

interface ClassTermResult {
  studentId: string;
  studentName: string;
  totalMarksObtained: number;
  totalMaxMarks: number;
  averagePercentage?: number;
  grade?: string;
  remarks?: string;
}

function ClassTermReportCore() {
  const params = useParams();
  const router = useRouter();
  const schoolCode = params.schoolCode as string;

  const [academicYears, setAcademicYears] = useState<IAcademicYear[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | undefined>();
  
  const [classes, setClasses] = useState<IClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | undefined>();

  const [reportData, setReportData] = useState<ClassTermResult[]>([]);
  
  const [loadingYears, setLoadingYears] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);


  const ACADEMIC_YEARS_API = `/api/${schoolCode}/portal/academics/academic-years`;
  const CLASSES_API_BASE = `/api/${schoolCode}/portal/academics/classes`;
  const REPORT_API_BASE = `/api/${schoolCode}/portal/reports/class-term-report`;

  useEffect(() => {
    const fetchYears = async () => {
      setLoadingYears(true);
      try {
        const res = await fetch(ACADEMIC_YEARS_API);
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch academic years');
        const data: IAcademicYear[] = await res.json();
        setAcademicYears(data.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
        const activeYear = data.find(y => y.isActive);
        if (activeYear) setSelectedAcademicYear(activeYear._id);
        else if (data.length > 0) setSelectedAcademicYear(data[0]._id);
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
      setClasses([]);
      setSelectedClass(undefined);
      return;
    }
    const fetchClasses = async () => {
      setLoadingClasses(true);
      try {
        const res = await fetch(`${CLASSES_API_BASE}?academicYearId=${selectedAcademicYear}`);
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch classes for the selected year');
        const data: IClass[] = await res.json();
        setClasses(data.sort((a,b) => a.name.localeCompare(b.name)));
        setSelectedClass(undefined); 
      } catch (err: any) {
        message.error(err.message || 'Could not load classes.');
        setClasses([]);
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClasses();
  }, [selectedAcademicYear, schoolCode, CLASSES_API_BASE]);

  const handleFetchReport = useCallback(async () => {
    if (!selectedAcademicYear || !selectedClass) {
      message.info('Please select an Academic Year and a Class to generate the report.');
      setReportData([]);
      return;
    }
    setLoadingReport(true);
    setReportData([]);
    try {
       const res = await fetch(`${REPORT_API_BASE}?academicYearId=${selectedAcademicYear}&classId=${selectedClass}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to generate class report');
      const data: ClassTermResult[] = await res.json();
      setReportData(data);
    } catch (err: any) {
      message.error(err.message || 'Could not load report data.');
      setReportData([]);
    } finally {
      setLoadingReport(false);
    }
  }, [selectedAcademicYear, selectedClass, schoolCode, REPORT_API_BASE]);

  const columns = [
    { title: 'Student Name', dataIndex: 'studentName', key: 'studentName', sorter: (a: ClassTermResult, b: ClassTermResult) => a.studentName.localeCompare(b.studentName) },
    { title: 'Total Marks', dataIndex: 'totalMarksObtained', key: 'totalMarks', render: (val: number, record: ClassTermResult) => `${val.toFixed(1)} / ${record.totalMaxMarks.toFixed(1)}` },
    { title: 'Average', dataIndex: 'averagePercentage', key: 'average', render: (val?: number) => val !== undefined ? `${val.toFixed(1)}%` : 'N/A', sorter: (a: ClassTermResult, b: ClassTermResult) => (a.averagePercentage || 0) - (b.averagePercentage || 0) },
    { title: 'Grade', dataIndex: 'grade', key: 'grade', render: (grade?: string) => grade ? <Tag>{grade}</Tag> : 'N/A' },
    { title: 'Remarks', dataIndex: 'remarks', key: 'remarks', render: (remarks?: string) => remarks || 'N/A' },
  ];

  return (
    <div>
      <Title level={2} className="mb-6"><TeamOutlined className="mr-2" />Class Performance Report</Title>
      <Paragraph>Generate a performance summary for all students in a selected class for a specific academic year.</Paragraph>

      <Card title="Report Filters" className="mb-6">
        <Row gutter={[16, 16]} align="bottom">
          <Col xs={24} md={8}>
            <Text>Academic Year</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Select Academic Year"
              value={selectedAcademicYear}
              onChange={val => { setSelectedAcademicYear(val); setSelectedClass(undefined); setReportData([]); }}
              loading={loadingYears}
              suffixIcon={<CalendarOutlined />}
            >
              {academicYears.map(year => <Option key={year._id} value={year._id}>{year.name}</Option>)}
            </Select>
          </Col>
          <Col xs={24} md={8}>
            <Text>Class</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Select Class"
              value={selectedClass}
              onChange={val => { setSelectedClass(val); setReportData([]); }}
              loading={loadingClasses}
              disabled={!selectedAcademicYear || loadingClasses}
              suffixIcon={<TeamOutlined />}
            >
              {classes.map(cls => <Option key={cls._id} value={cls._id}>{cls.name} {cls.level ? `(${cls.level})`: ''}</Option>)}
            </Select>
          </Col>
          <Col xs={24} md={8}>
             <Button 
              type="primary" 
              icon={<SearchOutlined />} 
              onClick={handleFetchReport}
              disabled={!selectedAcademicYear || !selectedClass || loadingReport}
              loading={loadingReport}
              block
            >
              Generate Report
            </Button>
          </Col>
        </Row>
      </Card>

      {loadingReport ? (
        <div className="text-center p-8"><Spin tip="Generating report..." /></div>
      ) : (
        <>
        <Alert
            className="mb-4"
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            message="About This Report"
            description="This report aggregates marks from all published exams within the selected academic year. The grade and remarks are based on the school's default grading scale."
        />
        <Table
          columns={columns}
          dataSource={reportData}
          rowKey="studentId"
          bordered
          size="middle"
          scroll={{ x: 800 }}
          locale={{ emptyText: <Empty description="Select filters and click 'Generate Report', or no student data found." /> }}
        />
        </>
      )}
    </div>
  );
}

export default function ClassTermReportPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Spin size="large" tip="Loading page..." /></div>}>
            <ClassTermReportCore />
        </Suspense>
    );
}
