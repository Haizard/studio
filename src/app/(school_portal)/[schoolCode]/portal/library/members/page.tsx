
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Table, Spin, Alert, Tag, Avatar, Input, Row, Col, Select } from 'antd';
import { UserOutlined, TeamOutlined, SearchOutlined } from '@ant-design/icons';
import type { IStudent } from '@/models/Tenant/Student';
import type { ITeacher } from '@/models/Tenant/Teacher';
import type { ITenantUser } from '@/models/Tenant/User';

const { Title, Paragraph } = Typography;
const { Option } = Select;

interface MemberDataType {
  key: string;
  id: string;
  name: string;
  role: 'Student' | 'Teacher';
  schoolIdNumber?: string;
  email?: string;
  username?: string;
  isActive: boolean;
  profilePictureUrl?: string;
}

interface LibraryMembersPageProps {
  params: { schoolCode: string };
}

export default function LibraryMembersPage({ params }: LibraryMembersPageProps) {
  const { schoolCode } = params;
  const [members, setMembers] = useState<MemberDataType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher'>('all');


  const STUDENTS_API = `/api/${schoolCode}/portal/students`;
  const TEACHERS_API = `/api/${schoolCode}/portal/teachers`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [studentsRes, teachersRes] = await Promise.all([
        fetch(STUDENTS_API),
        fetch(TEACHERS_API),
      ]);

      if (!studentsRes.ok) throw new Error((await studentsRes.json()).error || 'Failed to fetch students');
      if (!teachersRes.ok) throw new Error((await teachersRes.json()).error || 'Failed to fetch teachers');
      
      const studentsData: (IStudent & { userId: ITenantUser })[] = await studentsRes.json();
      const teachersData: (ITeacher & { userId: ITenantUser })[] = await teachersRes.json();

      const studentMembers: MemberDataType[] = studentsData
        .filter(s => s.userId) // Ensure userId exists
        .map(s => ({
          key: `student-${s._id}`,
          id: s._id.toString(),
          name: `${s.userId.firstName} ${s.userId.lastName}`,
          role: 'Student',
          schoolIdNumber: s.studentIdNumber,
          email: s.userId.email,
          username: s.userId.username,
          isActive: s.userId.isActive !== undefined ? s.userId.isActive : s.isActive, // Prefer userId.isActive, fallback to profile.isActive
          profilePictureUrl: s.userId.profilePictureUrl,
        }));

      const teacherMembers: MemberDataType[] = teachersData
        .filter(t => t.userId) // Ensure userId exists
        .map(t => ({
          key: `teacher-${t._id}`,
          id: t._id.toString(),
          name: `${t.userId.firstName} ${t.userId.lastName}`,
          role: 'Teacher',
          schoolIdNumber: t.teacherIdNumber,
          email: t.userId.email,
          username: t.userId.username,
          isActive: t.userId.isActive !== undefined ? t.userId.isActive : t.isActive, // Prefer userId.isActive
          profilePictureUrl: t.userId.profilePictureUrl,
        }));
        
      setMembers([...studentMembers, ...teacherMembers].sort((a, b) => a.name.localeCompare(b.name)));

    } catch (err: any) {
      setError(err.message || 'Could not load library members data.');
      console.error("Error fetching library members:", err);
    } finally {
      setLoading(false);
    }
  }, [schoolCode, STUDENTS_API, TEACHERS_API]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredMembers = members.filter(member => {
    const matchesSearchTerm = 
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.schoolIdNumber && member.schoolIdNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (member.username && member.username.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRoleFilter = 
        roleFilter === 'all' || 
        (roleFilter === 'student' && member.role === 'Student') ||
        (roleFilter === 'teacher' && member.role === 'Teacher');
        
    return matchesSearchTerm && matchesRoleFilter;
  });

  const columns = [
    {
      title: 'Avatar',
      dataIndex: 'profilePictureUrl',
      key: 'avatar',
      render: (url?: string, record?: MemberDataType) => <Avatar src={url} icon={<UserOutlined />} alt={record?.name} />,
      width: 80,
    },
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a: MemberDataType, b: MemberDataType) => a.name.localeCompare(b.name) },
    { title: 'Role', dataIndex: 'role', key: 'role', sorter: (a: MemberDataType, b: MemberDataType) => a.role.localeCompare(b.role), render: (role: string) => <Tag color={role === 'Student' ? 'blue' : 'green'}>{role}</Tag> },
    { title: 'School ID', dataIndex: 'schoolIdNumber', key: 'schoolIdNumber', render: (id?: string) => id || 'N/A' },
    { title: 'Username', dataIndex: 'username', key: 'username' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Status', dataIndex: 'isActive', key: 'isActive', render: (isActive: boolean) => <Tag color={isActive ? 'success' : 'error'}>{isActive ? 'Active' : 'Inactive'}</Tag> },
    // Future actions: View Borrowing History, Manage Fines
  ];

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Spin size="large" tip="Loading library members..." /></div>;
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon className="my-4" />;
  }

  return (
    <div>
      <Title level={2} className="mb-6"><TeamOutlined className="mr-2"/>Library Member Management</Title>
      <Paragraph>View all active students and teachers who are potential library members. Future enhancements will allow managing borrowing limits and history.</Paragraph>
      
      <Row gutter={16} className="mb-6">
        <Col xs={24} sm={12} md={10}>
            <Input 
                prefix={<SearchOutlined />}
                placeholder="Search by name, ID, or username"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                allowClear
            />
        </Col>
        <Col xs={24} sm={12} md={6}>
            <Select 
                defaultValue="all" 
                style={{ width: '100%' }} 
                onChange={value => setRoleFilter(value as 'all' | 'student' | 'teacher')}
                value={roleFilter}
            >
                <Option value="all">All Roles</Option>
                <Option value="student">Students Only</Option>
                <Option value="teacher">Teachers Only</Option>
            </Select>
        </Col>
      </Row>
      
      <Table
        columns={columns}
        dataSource={filteredMembers}
        rowKey="key"
        bordered
        size="middle"
        scroll={{ x: 1000 }}
      />
    </div>
  );
}
