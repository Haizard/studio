
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Select, Card, Table, message, Spin, Empty, Tag, Row, Col, Alert } from 'antd';
import { CheckSquareOutlined, CalendarOutlined, ScheduleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import type { ITerm } from '@/models/Tenant/Term';
import type { IAttendance } from '@/models/Tenant/Attendance';
import type { IClass } from '@/models/Tenant/Class';
import type { ISubject } from '@/models/Tenant/Subject';
import moment from 'moment';

const { Title, Paragraph } = Typography;
const { Option } = Select;

interface PopulatedAttendanceRecord extends Omit<IAttendance, 'classId' | 'subjectId' | 'academicYearId'> {
  classId: Pick<IClass, '_id' | 'name' | 'level'>;
  subjectId?: Pick<ISubject, '_id' | 'name' | 'code'>;
  academicYearId: Pick<IAcademicYear, '_id' | 'name'>;
}

export default function StudentAttendancePage() {
  const params = useParams();
  const schoolCode = params.schoolCode as string;

  const [academicYears, setAcademicYears] = useState<IAcademicYear[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | undefined>();
  
  const [terms, setTerms] = useState<ITerm[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string | undefined>();

  const [attendanceRecords, setAttendanceRecords] = useState<PopulatedAttendanceRecord[]>([]);
  
  const [loadingYears, setLoadingYears] = useState(true);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const ACADEMIC_YEARS_API = `/api/${schoolCode}/portal/academics/academic-years`;
  const TERMS_API_BASE = `/api/${schoolCode}/portal/academics/terms`;
  const STUDENT_ATTENDANCE_API_BASE = `/api/${schoolCode}/portal/students/me/attendance`;

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
      setTerms([]);
      setSelectedTerm(undefined);
      return;
    }
    const fetchTerms = async () => {
      setLoadingTerms(true);
      try {
        const res = await fetch(`${TERMS_API_BASE}?academicYearId=${selectedAcademicYear}`);
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch terms');
        const data: ITerm[] = await res.json();
        setTerms(data.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
        setSelectedTerm(undefined); // Reset term selection when year changes
      } catch (err: any) {
        message.error(err.message || 'Could not load terms for the selected year.');
        setTerms([]);
      } finally {
        setLoadingTerms(false);
      }
    };
    fetchTerms();
  }, [selectedAcademicYear, schoolCode, TERMS_API_BASE]);

  const fetchStudentAttendance = useCallback(async () => {
    if (!selectedAcademicYear) {
      setAttendanceRecords([]);
      return;
    }
    setLoadingAttendance(true);
    try {
      let url = `${STUDENT_ATTENDANCE_API_BASE}?academicYearId=${selectedAcademicYear}`;
      if (selectedTerm) {
        url += `&termId=${selectedTerm}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch student attendance.');
      }
      const data: PopulatedAttendanceRecord[] = await res.json();
      setAttendanceRecords(data);
    } catch (err: any) {
      message.error(err.message || 'Could not load attendance records.');
      setAttendanceRecords([]);
    } finally {
      setLoadingAttendance(false);
    }
  }, [selectedAcademicYear, selectedTerm, schoolCode, STUDENT_ATTENDANCE_API_BASE]);

  useEffect(() => {
    fetchStudentAttendance();
  }, [fetchStudentAttendance]);

  const getStatusTagColor = (status: string) => {
    switch (status) {
      case 'Present': return 'success';
      case 'Absent': return 'error';
      case 'Late': return 'warning';
      case 'Excused': return 'processing';
      default: return 'default';
    }
  };

  const columns = [
    { title: 'Date', dataIndex: 'date', key: 'date', render: (date: string) => moment(date).format('LL'), sorter: (a: PopulatedAttendanceRecord, b: PopulatedAttendanceRecord) => moment(a.date).unix() - moment(b.date).unix() },
    { title: 'Class', dataIndex: ['classId', 'name'], key: 'class', render: (name: string, record: PopulatedAttendanceRecord) => `${name} (${record.classId.level || ''})` },
    { title: 'Subject', dataIndex: ['subjectId', 'name'], key: 'subject', render: (name?: string, record?: PopulatedAttendanceRecord) => name || 'N/A (General)'},
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color={getStatusTagColor(status)}>{status}</Tag> },
    { title: 'Remarks', dataIndex: 'remarks', key: 'remarks', render: (remarks?: string) => remarks || '-' },
  ];

  const calculateAttendanceSummary = () => {
    const totalDays = attendanceRecords.length;
    if (totalDays === 0) return null;

    const presentDays = attendanceRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
    const absentDays = attendanceRecords.filter(r => r.status === 'Absent').length;
    const percentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    return {
      totalDays,
      presentDays,
      absentDays,
      percentage: percentage.toFixed(1),
    };
  };

  const summary = calculateAttendanceSummary();

  return (
    <div className="p-4">
      <Title level={2} className="mb-6 flex items-center"><CheckSquareOutlined className="mr-2" />My Attendance</Title>
      <Paragraph>Select an academic year and optionally a term to view your attendance records.</Paragraph>

      <Row gutter={[16, 16]} className="mb-8">
        <Col xs={24} sm={12}>
          <Select
            style={{ width: '100%' }}
            placeholder="Select Academic Year"
            value={selectedAcademicYear}
            onChange={setSelectedAcademicYear}
            loading={loadingYears}
            suffixIcon={<CalendarOutlined />}
          >
            {academicYears.map(year => <Option key={year._id} value={year._id}>{year.name}</Option>)}
          </Select>
        </Col>
        <Col xs={24} sm={12}>
          <Select
            style={{ width: '100%' }}
            placeholder="Select Term (Optional)"
            value={selectedTerm}
            onChange={setSelectedTerm}
            loading={loadingTerms}
            disabled={!selectedAcademicYear || loadingTerms}
            allowClear
            suffixIcon={<ScheduleOutlined />}
          >
            {terms.map(term => <Option key={term._id} value={term._id}>{term.name}</Option>)}
          </Select>
        </Col>
      </Row>

      {loadingAttendance && <div className="text-center py-8"><Spin size="large" tip="Loading attendance..." /></div>}

      {!loadingAttendance && attendanceRecords.length === 0 && selectedAcademicYear && (
        <Empty description="No attendance records found for the selected period." />
      )}
      {!loadingAttendance && !selectedAcademicYear && (
         <Alert message="Please select an Academic Year to view attendance." type="info" showIcon />
      )}

      {!loadingAttendance && attendanceRecords.length > 0 && (
        <>
          {summary && (
            <Card className="mb-6" title="Attendance Summary">
              <Row gutter={16}>
                <Col span={8}><Statistic title="Total Recorded Days" value={summary.totalDays} /></Col>
                <Col span={8}><Statistic title="Days Present/Late" value={summary.presentDays} /></Col>
                <Col span={8}><Statistic title="Attendance Percentage" value={`${summary.percentage}%`} suffix={<InfoCircleOutlined title="Based on recorded days (Present or Late / Total Days)" />} /></Col>
              </Row>
            </Card>
          )}
          <Table
            columns={columns}
            dataSource={attendanceRecords}
            rowKey="_id"
            bordered
            size="middle"
            scroll={{ x: 700 }}
          />
        </>
      )}
       <Alert
          className="mt-8"
          message="Attendance Information"
          description={
            <ul className="list-disc list-inside text-sm">
              <li>This log shows attendance recorded by your teachers.</li>
              <li>'N/A (General)' under Subject usually means attendance was taken for the class overall, not a specific subject period.</li>
              <li>If you have discrepancies or questions, please contact your class teacher or the school office.</li>
            </ul>
          }
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
        />
    </div>
  );
}
