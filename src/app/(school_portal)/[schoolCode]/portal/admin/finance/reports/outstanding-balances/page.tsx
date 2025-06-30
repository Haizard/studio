
'use client';
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Button, Typography, Select, Card, Row, Col, message, Spin, Table, Empty, Tag } from 'antd';
import { FileTextOutlined, FilterOutlined, SearchOutlined, CalendarOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import type { IClass } from '@/models/Tenant/Class';
import type { IStudent } from '@/models/Tenant/Student';
import type { ITenantUser } from '@/models/Tenant/User';
import moment from 'moment';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

interface StudentBalance {
  studentId: string;
  studentName: string;
  studentIdNumber?: string;
  className?: string;
  classLevel?: string;
  totalFeesDue: number;
  totalFeesPaid: number;
  outstandingBalance: number;
}

interface StudentBalanceClient extends StudentBalance {
    key: string;
}

function OutstandingBalancesReportCore() {
  const params = useParams();
  const schoolCode = params.schoolCode as string;

  // Filter Data States
  const [academicYears, setAcademicYears] = useState<IAcademicYear[]>([]);
  const [classes, setClasses] = useState<IClass[]>([]);
  const [students, setStudents] = useState<(IStudent & { userId: ITenantUser })[]>([]);

  // Filter Selection States
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | undefined>();
  const [selectedClass, setSelectedClass] = useState<string | undefined>();
  const [selectedStudent, setSelectedStudent] = useState<string | undefined>();

  // Report Data & Loading States
  const [reportData, setReportData] = useState<StudentBalanceClient[]>([]);
  const [loadingYears, setLoadingYears] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);

  // API URLs
  const ACADEMIC_YEARS_API = `/api/${schoolCode}/portal/academics/academic-years`;
  const CLASSES_API_BASE = `/api/${schoolCode}/portal/academics/classes`;
  const STUDENTS_API_BASE = `/api/${schoolCode}/portal/students`;
  const REPORT_API = `/api/${schoolCode}/portal/admin/finance/reports/outstanding-balances`;

  // Fetch data for filters
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
      } catch (err: any) { message.error(err.message || 'Could not load academic years.'); }
      finally { setLoadingYears(false); }
    };
    fetchYears();
  }, [schoolCode, ACADEMIC_YEARS_API]);

  useEffect(() => {
    if (!selectedAcademicYear) {
      setClasses([]);
      setStudents([]);
      return;
    }
    const fetchDependentData = async () => {
        setLoadingClasses(true);
        setLoadingStudents(true);
        try {
            const [classesRes, studentsRes] = await Promise.all([
                fetch(`${CLASSES_API_BASE}?academicYearId=${selectedAcademicYear}`),
                fetch(STUDENTS_API_BASE) // Fetch all students for the dropdown
            ]);
            if (!classesRes.ok) throw new Error((await classesRes.json()).error || 'Failed to fetch classes');
            if (!studentsRes.ok) throw new Error((await studentsRes.json()).error || 'Failed to fetch students');
            
            const classesData: IClass[] = await classesRes.json();
            const studentsData: (IStudent & { userId: ITenantUser })[] = await studentsRes.json();
            
            setClasses(classesData.sort((a,b) => a.name.localeCompare(b.name)));
            setStudents(studentsData.sort((a,b) => (a.userId?.lastName || '').localeCompare(b.userId?.lastName || '')));

        } catch (err: any) { message.error(err.message || 'Could not load classes or students.'); }
        finally {
            setLoadingClasses(false);
            setLoadingStudents(false);
        }
    };
    fetchDependentData();
  }, [selectedAcademicYear, schoolCode, CLASSES_API_BASE, STUDENTS_API_BASE]);


  const handleFetchReport = useCallback(async () => {
    if (!selectedAcademicYear) {
      message.info('Please select an Academic Year to generate the report.');
      setReportData([]);
      return;
    }
    setLoadingReport(true);
    setReportData([]);
    try {
      const queryParams = new URLSearchParams({ academicYearId: selectedAcademicYear });
      if (selectedClass) queryParams.append('classId', selectedClass);
      if (selectedStudent) queryParams.append('studentId', selectedStudent);
      
      const res = await fetch(`${REPORT_API}?${queryParams.toString()}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch outstanding balances report');
      const data: StudentBalance[] = await res.json();
      setReportData(data.map(d => ({...d, key: d.studentId})));
    } catch (err: any) {
      message.error(err.message || 'Could not load report data.');
      setReportData([]);
    } finally {
      setLoadingReport(false);
    }
  }, [selectedAcademicYear, selectedClass, selectedStudent, schoolCode, REPORT_API]);

  const columns = [
    { title: 'Student Name', dataIndex: 'studentName', key: 'studentName', sorter: (a: StudentBalanceClient, b: StudentBalanceClient) => a.studentName.localeCompare(b.studentName) },
    { title: 'Student ID', dataIndex: 'studentIdNumber', key: 'studentIdNumber', sorter: (a: StudentBalanceClient, b: StudentBalanceClient) => (a.studentIdNumber || '').localeCompare(b.studentIdNumber || '') },
    { title: 'Class', dataIndex: 'className', key: 'className', render: (text: string, record: StudentBalanceClient) => record.className ? `${record.className} ${record.classLevel ? `(${record.classLevel})` : ''}` : 'N/A' },
    { title: 'Total Fees Due', dataIndex: 'totalFeesDue', key: 'totalFeesDue', render: (val: number) => `TZS ${val.toLocaleString()}`, sorter: (a: StudentBalanceClient, b: StudentBalanceClient) => a.totalFeesDue - b.totalFeesDue },
    { title: 'Total Fees Paid', dataIndex: 'totalFeesPaid', key: 'totalFeesPaid', render: (val: number) => `TZS ${val.toLocaleString()}`, sorter: (a: StudentBalanceClient, b: StudentBalanceClient) => a.totalFeesPaid - b.totalFeesPaid },
    { 
        title: 'Outstanding Balance', 
        dataIndex: 'outstandingBalance', 
        key: 'outstandingBalance',
        render: (val: number) => (
            <Tag color={val > 0 ? 'volcano' : (val < 0 ? 'green' : 'default')}>
                TZS {val.toLocaleString()}
            </Tag>
        ),
        sorter: (a: StudentBalanceClient, b: StudentBalanceClient) => a.outstandingBalance - b.outstandingBalance 
    },
  ];

  return (
    <div>
      <Title level={2} className="mb-6"><FileTextOutlined className="mr-2" />Outstanding Balances Report</Title>
      <Paragraph>Generate a report of student fee balances for a specific academic year, with optional filters for class or individual students.</Paragraph>

      <Card title={<><FilterOutlined className="mr-2" />Report Filters</>} className="mb-6">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Text>Academic Year (Required)</Text>
            <Select style={{ width: '100%' }} placeholder="Select Academic Year" value={selectedAcademicYear} onChange={val => { setSelectedAcademicYear(val); setSelectedClass(undefined); setSelectedStudent(undefined); }} loading={loadingYears} suffixIcon={<CalendarOutlined />}>
              {academicYears.map(year => <Option key={year._id} value={year._id}>{year.name}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Text>Class (Optional)</Text>
            <Select style={{ width: '100%' }} placeholder="Filter by Class" value={selectedClass} onChange={setSelectedClass} loading={loadingClasses} disabled={!selectedAcademicYear} allowClear suffixIcon={<TeamOutlined />}>
              {classes.map(cls => <Option key={cls._id} value={cls._id}>{cls.name}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Text>Student (Optional)</Text>
             <Select
              showSearch
              style={{ width: '100%' }}
              placeholder="Filter by Student"
              value={selectedStudent}
              onChange={setSelectedStudent}
              loading={loadingStudents}
              disabled={!selectedAcademicYear}
              filterOption={(input, option) => (option?.children?.toString() ?? '').toLowerCase().includes(input.toLowerCase())}
              allowClear
              suffixIcon={<UserOutlined />}
            >
              {students.map(s => <Option key={s.userId._id} value={s.userId._id.toString()}>{`${s.userId.firstName} ${s.userId.lastName} (${s.userId.username})`}</Option>)}
            </Select>
          </Col>
        </Row>
        <Row justify="end" className="mt-4">
            <Col><Button type="primary" icon={<SearchOutlined />} onClick={handleFetchReport} loading={loadingReport} disabled={!selectedAcademicYear}>Generate Report</Button></Col>
        </Row>
      </Card>

      {loadingReport && <div className="text-center p-8"><Spin tip="Generating report..." /></div>}
      
      {!loadingReport && (
        <Table
            columns={columns}
            dataSource={reportData}
            rowKey="key"
            bordered
            size="middle"
            scroll={{ x: 1200 }}
            locale={{ emptyText: <Empty description="No data generated. Please select filters and click 'Generate Report'." /> }}
        />
      )}
    </div>
  );
}


export default function OutstandingBalancesReportPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Spin size="large" tip="Loading page..." /></div>}>
            <OutstandingBalancesReportCore />
        </Suspense>
    );
}
