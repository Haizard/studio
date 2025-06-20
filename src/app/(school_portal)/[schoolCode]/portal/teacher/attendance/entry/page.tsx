
'use client';
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Button, Typography, Table, Radio, Input, message, Spin, Row, Col, Card, Descriptions, Alert, Breadcrumb, DatePicker, Space as AntSpace } from 'antd';
import { SaveOutlined, ArrowLeftOutlined, UserOutlined, CheckCircleOutlined, CloseCircleOutlined, MinusCircleOutlined, QuestionCircleOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import type { IStudent } from '@/models/Tenant/Student';
import type { ITenantUser } from '@/models/Tenant/User';
import type { IAttendance, AttendanceStatus } from '@/models/Tenant/Attendance';
import type { IClass } from '@/models/Tenant/Class';
import type { ISubject } from '@/models/Tenant/Subject';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import moment from 'moment';
import mongoose from 'mongoose';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

interface StudentAttendanceData {
  key: string; // studentProfileId
  studentId: string; // studentProfileId
  studentName: string;
  studentUsername: string;
  status: AttendanceStatus;
  remarks?: string;
}

const attendanceStatuses: AttendanceStatus[] = ['Present', 'Absent', 'Late', 'Excused'];

function AttendanceEntryCore() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const schoolCode = params.schoolCode as string;
  const academicYearId = searchParams.get('academicYearId');
  const classId = searchParams.get('classId');
  const subjectId = searchParams.get('subjectId'); // Optional
  const date = searchParams.get('date'); // YYYY-MM-DD

  const [classDetails, setClassDetails] = useState<IClass | null>(null);
  const [subjectDetails, setSubjectDetails] = useState<ISubject | null>(null);
  const [academicYearDetails, setAcademicYearDetails] = useState<IAcademicYear | null>(null);
  
  const [studentsAttendance, setStudentsAttendance] = useState<StudentAttendanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const CLASS_DETAILS_API = `/api/${schoolCode}/portal/academics/classes/${classId}`;
  const SUBJECT_DETAILS_API_BASE = `/api/${schoolCode}/portal/academics/subjects/`;
  const ACADEMIC_YEAR_DETAILS_API_BASE = `/api/${schoolCode}/portal/academics/academic-years/`;
  const STUDENTS_IN_CLASS_API = `/api/${schoolCode}/portal/students/class/${classId}?academicYearId=${academicYearId}`; 
  const ATTENDANCE_API = `/api/${schoolCode}/portal/attendance`;


  const fetchData = useCallback(async () => {
    if (!academicYearId || !classId || !date || 
        !mongoose.Types.ObjectId.isValid(academicYearId) ||
        !mongoose.Types.ObjectId.isValid(classId) ||
        (subjectId && !mongoose.Types.ObjectId.isValid(subjectId))
    ) {
      setError("Invalid parameters. Please go back and select valid options.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const detailsPromises = [
        fetch(`${ACADEMIC_YEAR_DETAILS_API_BASE}${academicYearId}`).then(res => res.ok ? res.json() : Promise.reject(new Error('Failed to fetch academic year details'))),
        fetch(CLASS_DETAILS_API).then(res => res.ok ? res.json() : Promise.reject(new Error('Failed to fetch class details'))),
      ];
      if (subjectId) {
        detailsPromises.push(fetch(`${SUBJECT_DETAILS_API_BASE}${subjectId}`).then(res => res.ok ? res.json() : Promise.reject(new Error('Failed to fetch subject details'))));
      }
      
      const [yearData, classData, subjectDataOptional] = await Promise.all(detailsPromises);
      setAcademicYearDetails(yearData);
      setClassDetails(classData);
      if (subjectId && subjectDataOptional) setSubjectDetails(subjectDataOptional);


      let attendanceQuery = `academicYearId=${academicYearId}&classId=${classId}&date=${date}`;
      if (subjectId) attendanceQuery += `&subjectId=${subjectId}`;

      const [studentsRes, attendanceRes] = await Promise.all([
        fetch(STUDENTS_IN_CLASS_API),
        fetch(`${ATTENDANCE_API}?${attendanceQuery}`),
      ]);

      if (!studentsRes.ok) throw new Error((await studentsRes.json()).error || 'Failed to fetch students for the class.');
      if (!attendanceRes.ok) throw new Error((await attendanceRes.json()).error || 'Failed to fetch existing attendance.');

      const studentsData: IStudent[] = await studentsRes.json();
      const existingAttendanceData: IAttendance[] = await attendanceRes.json();
      const attendanceMap = new Map(existingAttendanceData.map(att => [att.studentId.toString(), att]));

      const mergedData: StudentAttendanceData[] = studentsData
        .filter(student => student.userId && (student.userId as ITenantUser).isActive) 
        .map(student => {
          const user = student.userId as ITenantUser;
          const existingRecord = attendanceMap.get(student._id.toString()); 
          return {
            key: student._id.toString(),
            studentId: student._id.toString(), 
            studentName: `${user.firstName} ${user.lastName}`,
            studentUsername: user.username,
            status: existingRecord?.status || 'Present', 
            remarks: existingRecord?.remarks || '',
          };
        });
      setStudentsAttendance(mergedData);

    } catch (err: any) {
      setError(err.message || 'Could not load attendance data.');
      console.error("Fetch data error:", err);
    } finally {
      setLoading(false);
    }
  }, [schoolCode, academicYearId, classId, subjectId, date, STUDENTS_IN_CLASS_API, ATTENDANCE_API, CLASS_DETAILS_API, SUBJECT_DETAILS_API_BASE, ACADEMIC_YEAR_DETAILS_API_BASE]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = (studentKey: string, newStatus: AttendanceStatus) => {
    setStudentsAttendance(prev =>
      prev.map(s => (s.key === studentKey ? { ...s, status: newStatus } : s))
    );
  };

  const handleRemarkChange = (studentKey: string, newRemark: string) => {
    setStudentsAttendance(prev =>
      prev.map(s => (s.key === studentKey ? { ...s, remarks: newRemark } : s))
    );
  };

  const handleMarkAllPresent = () => {
    setStudentsAttendance(prev =>
      prev.map(s => ({ ...s, status: 'Present' }))
    );
    message.info('All students marked as Present. You can make individual changes.');
  };

  const handleSaveAttendance = async () => {
    if (!academicYearId || !classId || !date) {
      message.error("Critical information missing. Cannot save attendance.");
      return;
    }
    setSaving(true);
    const payload = {
      academicYearId,
      classId,
      subjectId: subjectId || undefined,
      date,
      records: studentsAttendance.map(s => ({
        studentId: s.studentId, 
        status: s.status,
        remarks: s.remarks,
      })),
    };

    try {
      const response = await fetch(ATTENDANCE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save attendance.');
      }
      message.success('Attendance saved successfully!');
      fetchData(); 
    } catch (err: any) {
      message.error(err.message || 'Could not save attendance.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: 'Student Name', dataIndex: 'studentName', key: 'studentName', width: '30%' },
    { title: 'Username', dataIndex: 'studentUsername', key: 'studentUsername', width: '20%' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: '30%',
      render: (status: AttendanceStatus, record: StudentAttendanceData) => (
        <Radio.Group
          value={status}
          onChange={e => handleStatusChange(record.key, e.target.value)}
          disabled={saving}
        >
          {attendanceStatuses.map(s => <Radio.Button key={s} value={s}>{s}</Radio.Button>)}
        </Radio.Group>
      ),
    },
    {
      title: 'Remarks',
      dataIndex: 'remarks',
      key: 'remarks',
      render: (text: string, record: StudentAttendanceData) => (
        <TextArea
          value={text}
          onChange={e => handleRemarkChange(record.key, e.target.value)}
          rows={1}
          disabled={saving}
        />
      ),
    },
  ];
  
  const breadcrumbItems = [
    { title: <Link href={`/${schoolCode}/portal/dashboard`}>Dashboard</Link> },
    { title: <Link href={`/${schoolCode}/portal/teacher/attendance`}>Attendance Selection</Link> },
    { title: 'Record Attendance' },
  ];

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Spin size="large" tip="Loading attendance roster..." /></div>;
  }
  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon className="my-4" 
              action={<Button onClick={() => router.back()} icon={<ArrowLeftOutlined />}>Back to Selection</Button>}
           />;
  }

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} className="mb-4" />
      <Row justify="space-between" align="middle" className="mb-4">
        <Col>
          <Title level={3} className="!mb-1">Record Attendance</Title>
          <Paragraph type="secondary">
            For: {classDetails?.name || 'N/A'} 
            {subjectDetails ? ` - ${subjectDetails.name}` : ''} 
            {' on '} {moment(date).format('LL')}
            {' ('} {academicYearDetails?.name || 'N/A'} {')'}
          </Paragraph>
        </Col>
        <Col>
          <AntSpace>
             <DatePicker 
              value={moment(date)} 
              onChange={(newDate) => {
                if (newDate) {
                    const newDateString = newDate.format('YYYY-MM-DD');
                    let newUrl = `/${schoolCode}/portal/teacher/attendance/entry?academicYearId=${academicYearId}&classId=${classId}&date=${newDateString}`;
                    if (subjectId) newUrl += `&subjectId=${subjectId}`;
                    router.push(newUrl);
                }
              }}
              format="YYYY-MM-DD"
              disabledDate={current => current && current > moment().endOf('day')}
            />
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(`/${schoolCode}/portal/teacher/attendance?academicYearId=${academicYearId || ''}&classId=${classId || ''}${subjectId ? `&subjectId=${subjectId}`: ''}&date=${date || ''}`)}>
                Back to Selection
            </Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveAttendance} loading={saving}>
              Save Attendance
            </Button>
          </AntSpace>
        </Col>
      </Row>
      
      <div className="mb-4">
        <Button 
          icon={<UsergroupAddOutlined />} 
          onClick={handleMarkAllPresent} 
          disabled={saving || studentsAttendance.length === 0}
        >
          Mark All Present
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={studentsAttendance}
        rowKey="key"
        bordered
        size="middle"
        pagination={{ pageSize: 30, showSizeChanger: true, pageSizeOptions: ['15', '30', '50', '100'] }}
        locale={{ emptyText: "No students found for this class in the selected academic year, or ensure students are active." }}
      />
      <div className="mt-6 text-right">
         <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveAttendance} loading={saving}>
            Save Attendance
          </Button>
       </div>
    </div>
  );
}


export default function AttendanceEntryPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Spin size="large" tip="Loading page..." /></div>}>
            <AttendanceEntryCore />
        </Suspense>
    );
}

