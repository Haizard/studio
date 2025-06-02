
'use client';
import React, { useState, useEffect } from 'react';
import { Typography, Spin, Alert, Descriptions, Avatar, Tag, Row, Col, Card } from 'antd';
import { UserOutlined, IdcardOutlined, CalendarOutlined, AuditOutlined, TeamOutlined, BookOutlined } from '@ant-design/icons';
import { useSession } from 'next-auth/react';
import type { IStudent } from '@/models/Tenant/Student';
import type { ITenantUser } from '@/models/Tenant/User';
import type { IClass } from '@/models/Tenant/Class';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import type { IAlevelCombination } from '@/models/Tenant/AlevelCombination';
import type { ISubject } from '@/models/Tenant/Subject';


interface StudentProfilePageProps {
  params: { schoolCode: string };
}

interface PopulatedStudentProfile extends Omit<IStudent, 'userId' | 'currentClassId' | 'currentAcademicYearId' | 'alevelCombinationId' | 'oLevelOptionalSubjects'> {
  userId: ITenantUser;
  currentClassId?: IClass;
  currentAcademicYearId?: IAcademicYear;
  alevelCombinationId?: IAlevelCombination & { subjects: ISubject[] };
  oLevelOptionalSubjects?: ISubject[];
}


export default function StudentProfilePage({ params }: StudentProfilePageProps) {
  const { schoolCode } = params;
  const { data: session, status: sessionStatus } = useSession();
  const [studentProfile, setStudentProfile] = useState<PopulatedStudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === 'authenticated' && session?.user) {
      const fetchProfile = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/${schoolCode}/portal/students/me`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to fetch profile: ${response.statusText}`);
          }
          const data = await response.json();
          setStudentProfile(data);
        } catch (err: any) {
          setError(err.message || 'Could not load student profile.');
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    } else if (sessionStatus === 'unauthenticated') {
      setError("You are not authenticated.");
      setLoading(false);
    }
     // If sessionStatus is 'loading', we wait
  }, [sessionStatus, session, schoolCode]);

  if (loading || sessionStatus === 'loading') {
    return <div className="flex justify-center items-center h-full"><Spin size="large" tip="Loading profile..." /></div>;
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon className="mt-4" />;
  }

  if (!studentProfile) {
    return <Alert message="No Profile Found" description="Student profile data is not available." type="warning" showIcon className="mt-4"/>;
  }

  const { userId, studentIdNumber, admissionDate, dateOfBirth, gender, currentClassId, currentAcademicYearId, alevelCombinationId, oLevelOptionalSubjects } = studentProfile;

  return (
    <div className="p-4">
      <Typography.Title level={2} className="mb-8 flex items-center">
        <UserOutlined className="mr-3" /> My Student Profile
      </Typography.Title>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={8} lg={6} className="text-center">
          <Avatar size={128} icon={<UserOutlined />} src={userId.profilePictureUrl} className="mb-4 shadow-md" />
          <Typography.Title level={4}>{`${userId.firstName} ${userId.lastName}`}</Typography.Title>
          <Typography.Text type="secondary" className="block">{userId.username}</Typography.Text>
          <Typography.Text type="secondary" className="block">{userId.email}</Typography.Text>
          <Tag color={userId.isActive ? "green" : "red"} className="mt-2">
            {userId.isActive ? 'Active Account' : 'Inactive Account'}
          </Tag>
        </Col>

        <Col xs={24} md={16} lg={18}>
          <Card title={<><IdcardOutlined className="mr-2" />Personal Information</>} className="mb-6 shadow-sm">
            <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 1, md: 1, sm: 1, xs: 1 }}>
              <Descriptions.Item label="Student ID">{studentIdNumber}</Descriptions.Item>
              <Descriptions.Item label="Gender">{gender}</Descriptions.Item>
              <Descriptions.Item label="Date of Birth">{new Date(dateOfBirth).toLocaleDateString()}</Descriptions.Item>
              <Descriptions.Item label="Admission Date">{new Date(admissionDate).toLocaleDateString()}</Descriptions.Item>
            </Descriptions>
          </Card>
          
          <Card title={<><TeamOutlined className="mr-2" />Academic Information</>} className="shadow-sm">
            <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 1, md: 1, sm: 1, xs: 1 }}>
              <Descriptions.Item label="Current Academic Year">
                {currentAcademicYearId ? currentAcademicYearId.name : 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Current Class">
                {currentClassId ? `${currentClassId.name} (${currentClassId.level || ''} ${currentClassId.stream || ''})`.trim() : 'N/A'}
              </Descriptions.Item>
              {alevelCombinationId && (
                <Descriptions.Item label="A-Level Combination" span={2}>
                  {`${alevelCombinationId.name} (${alevelCombinationId.code})`}
                  <div className="mt-1">
                    {alevelCombinationId.subjects.map(sub => <Tag key={sub._id} color="blue" className="m-1">{sub.name}</Tag>)}
                  </div>
                </Descriptions.Item>
              )}
              {oLevelOptionalSubjects && oLevelOptionalSubjects.length > 0 && (
                 <Descriptions.Item label="O-Level Optional Subjects" span={2}>
                   {oLevelOptionalSubjects.map(sub => <Tag key={sub._id} color="geekblue" className="m-1">{sub.name}</Tag>)}
                 </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
