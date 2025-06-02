
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Spin, Alert, Table, Avatar, Breadcrumb, Button } from 'antd';
import { UserOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { IStudent } from '@/models/Tenant/Student';
import type { ITenantUser } from '@/models/Tenant/User';
import type { IClass } from '@/models/Tenant/Class';
import mongoose from 'mongoose';

const { Title, Paragraph } = Typography;

interface StudentRosterItem extends Pick<IStudent, '_id' | 'studentIdNumber' | 'gender'> {
  key: string;
  userId: Pick<ITenantUser, '_id' | 'firstName' | 'lastName' | 'username' | 'email' | 'profilePictureUrl'>;
}

interface ClassDetails extends Pick<IClass, '_id' | 'name' | 'level' | 'stream'> {}

export default function TeacherClassRosterPage() {
  const params = useParams();
  const router = useRouter();
  const schoolCode = params.schoolCode as string;
  const classId = params.classId as string;

  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
  const [students, setStudents] = useState<StudentRosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClassDetails = useCallback(async () => {
    // Fetch general class details if needed (e.g., from classes API)
    // For now, we might get enough from the roster API or previous page context
    // This is a placeholder if we need to fetch class specific info not from roster
    try {
        const res = await fetch(`/api/${schoolCode}/portal/academics/classes/${classId}`);
        if(!res.ok) throw new Error('Failed to fetch class details');
        const data: IClass = await res.json();
        setClassDetails({_id: data._id, name: data.name, level: data.level, stream: data.stream });
    } catch (err:any) {
        console.warn("Could not fetch class details:", err.message);
        // Not critical if student list still loads
    }

  }, [schoolCode, classId]);


  const fetchStudentRoster = useCallback(async () => {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
        setError("Invalid Class ID provided in URL.");
        setLoading(false);
        return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/${schoolCode}/portal/teachers/my-classes/${classId}/students`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `Failed to fetch student roster: ${res.statusText}`);
      }
      const data: IStudent[] = await res.json(); // API returns array of IStudent populated with userId
      
      setStudents(data.map(student => ({
        key: student._id.toString(),
        _id: student._id,
        studentIdNumber: student.studentIdNumber,
        gender: student.gender,
        userId: student.userId as Pick<ITenantUser, '_id' | 'firstName' | 'lastName' | 'username' | 'email' | 'profilePictureUrl'>, // Assuming userId is populated
      })));

    } catch (err: any) {
      setError(err.message || 'Could not load student roster.');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, classId]);

  useEffect(() => {
    fetchClassDetails(); // Fetch class details
    fetchStudentRoster(); // Fetch roster
  }, [fetchClassDetails, fetchStudentRoster]);

  const columns = [
    {
      title: 'Avatar',
      dataIndex: ['userId', 'profilePictureUrl'],
      key: 'avatar',
      render: (url?: string, record?: StudentRosterItem) => <Avatar src={url} icon={<UserOutlined />} alt={`${record?.userId.firstName} ${record?.userId.lastName}`} />,
      width: 80,
    },
    {
      title: 'Full Name',
      key: 'fullName',
      render: (_: any, record: StudentRosterItem) => `${record.userId.firstName} ${record.userId.lastName}`,
      sorter: (a: StudentRosterItem, b: StudentRosterItem) => `${a.userId.firstName} ${a.userId.lastName}`.localeCompare(`${b.userId.firstName} ${b.userId.lastName}`),
    },
    { title: 'Student ID', dataIndex: 'studentIdNumber', key: 'studentIdNumber', sorter: (a: StudentRosterItem, b: StudentRosterItem) => (a.studentIdNumber || "").localeCompare(b.studentIdNumber || "") },
    { title: 'Username', dataIndex: ['userId', 'username'], key: 'username', sorter: (a: StudentRosterItem, b: StudentRosterItem) => a.userId.username.localeCompare(b.userId.username) },
    { title: 'Gender', dataIndex: 'gender', key: 'gender', sorter: (a: StudentRosterItem, b: StudentRosterItem) => (a.gender || "").localeCompare(b.gender || "")},
    // Add more columns like Contact, Guardian, etc. if needed later
  ];
  
  const breadcrumbItems = [
    { title: <Link href={`/${schoolCode}/portal/dashboard`}>Dashboard</Link> },
    { title: <Link href={`/${schoolCode}/portal/teacher/my-classes`}>My Classes</Link> },
    { title: classDetails ? `Class: ${classDetails.name}` : 'Class Roster' },
  ];


  if (loading) {
    return <div className="flex justify-center items-center h-64"><Spin size="large" tip="Loading student roster..." /></div>;
  }

  if (error) {
    return (
        <>
            <Breadcrumb items={breadcrumbItems.slice(0,2)} className="mb-4"/>
            <Alert 
                message="Error" 
                description={error} 
                type="error" 
                showIcon 
                action={<Button onClick={() => router.back()} icon={<ArrowLeftOutlined />}>Back to My Classes</Button>}
                className="my-4" 
            />
        </>
    );
  }

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} className="mb-4"/>
      <Title level={2} className="mb-2">
        Student Roster for Class: {classDetails?.name || 'Loading...'}
        {classDetails?.level && <span className="text-lg font-normal text-gray-600"> ({classDetails.level}{classDetails.stream ? ` - ${classDetails.stream}` : ''})</span>}
      </Title>
      <Paragraph className="mb-6">List of students currently enrolled in this class for the active academic year.</Paragraph>
      <Table
        columns={columns}
        dataSource={students}
        rowKey="key"
        bordered
        size="middle"
        scroll={{ x: 800 }}
        pagination={{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['10','15', '30', '50']}}
      />
       <div className="mt-6">
        <Button onClick={() => router.back()} icon={<ArrowLeftOutlined />}>Back to My Classes</Button>
      </div>
    </div>
  );
}

    