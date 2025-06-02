
'use client';
import React, { useState, useEffect } from 'react';
import { Typography, Spin, Alert, Descriptions, Avatar, Tag, Row, Col, Card, List } from 'antd';
import { UserOutlined, IdcardOutlined, CalendarOutlined, SolutionOutlined, BookOutlined, AuditOutlined } from '@ant-design/icons';
import { useSession } from 'next-auth/react';
import type { ITeacher, IAssignedClassSubject } from '@/models/Tenant/Teacher';
import type { ITenantUser } from '@/models/Tenant/User';
import type { IClass } from '@/models/Tenant/Class';
import type { ISubject } from '@/models/Tenant/Subject';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import moment from 'moment';

interface TeacherProfilePageProps {
  params: { schoolCode: string };
}

interface PopulatedAssignedClassSubject extends Omit<IAssignedClassSubject, 'classId' | 'subjectId' | 'academicYearId'> {
  classId: IClass;
  subjectId: ISubject;
  academicYearId: IAcademicYear;
}

interface PopulatedTeacherProfile extends Omit<ITeacher, 'userId' | 'isClassTeacherOf' | 'assignedClassesAndSubjects'> {
  userId: ITenantUser;
  isClassTeacherOf?: IClass;
  assignedClassesAndSubjects: PopulatedAssignedClassSubject[];
}


export default function TeacherProfilePage({ params }: TeacherProfilePageProps) {
  const { schoolCode } = params;
  const { data: session, status: sessionStatus } = useSession();
  const [teacherProfile, setTeacherProfile] = useState<PopulatedTeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === 'authenticated' && session?.user) {
      const fetchProfile = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/${schoolCode}/portal/teachers/me`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to fetch profile: ${response.statusText}`);
          }
          const data = await response.json();
          setTeacherProfile(data);
        } catch (err: any) {
          setError(err.message || 'Could not load teacher profile.');
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    } else if (sessionStatus === 'unauthenticated') {
      setError("You are not authenticated.");
      setLoading(false);
    }
  }, [sessionStatus, session, schoolCode]);

  if (loading || sessionStatus === 'loading') {
    return <div className="flex justify-center items-center h-full"><Spin size="large" tip="Loading profile..." /></div>;
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon className="mt-4" />;
  }

  if (!teacherProfile || !teacherProfile.userId) {
    return <Alert message="No Profile Found" description="Teacher profile data is not available." type="warning" showIcon className="mt-4"/>;
  }

  const { userId, teacherIdNumber, dateOfJoining, qualifications, specialization, isClassTeacherOf, assignedClassesAndSubjects } = teacherProfile;

  const activeAssignments = assignedClassesAndSubjects.filter(
    (assignment) => assignment.academicYearId?.isActive
  );

  return (
    <div className="p-4">
      <Typography.Title level={2} className="mb-8 flex items-center">
        <IdcardOutlined className="mr-3" /> My Teacher Profile
      </Typography.Title>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={8} lg={6} className="text-center">
          <Avatar size={128} icon={<UserOutlined />} src={userId.profilePictureUrl} className="mb-4 shadow-md" />
          <Typography.Title level={4}>{`${userId.firstName} ${userId.lastName}`}</Typography.Title>
          <Typography.Text type="secondary" className="block">@{userId.username}</Typography.Text>
          <Typography.Text type="secondary" className="block">{userId.email}</Typography.Text>
          <Tag color={userId.isActive ? "green" : "red"} className="mt-2">
            {userId.isActive ? 'Active Account' : 'Inactive Account'}
          </Tag>
        </Col>

        <Col xs={24} md={16} lg={18}>
          <Card title={<><UserOutlined className="mr-2" />Personal & Professional Details</>} className="mb-6 shadow-sm">
            <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 1, md: 1, sm: 1, xs: 1 }}>
              <Descriptions.Item label="Teacher ID">{teacherIdNumber || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Date of Joining">{moment(dateOfJoining).format('LL')}</Descriptions.Item>
              <Descriptions.Item label="Specialization">{specialization || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Qualifications" span={2}>
                {qualifications && qualifications.length > 0 ? (
                  qualifications.map(q => <Tag key={q} color="blue" className="m-1">{q}</Tag>)
                ) : 'N/A'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
          
          {isClassTeacherOf && (
            <Card title={<><AuditOutlined className="mr-2" />Class Teacher Responsibilities</>} className="mb-6 shadow-sm">
               <Descriptions bordered column={1}>
                <Descriptions.Item label="Class Teacher Of">
                    {`${isClassTeacherOf.name} (${isClassTeacherOf.level || ''} ${isClassTeacherOf.stream || ''})`.trim()}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          <Card title={<><BookOutlined className="mr-2" />Teaching Assignments (Current Active Year)</>} className="shadow-sm">
            {activeAssignments.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={activeAssignments}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<SolutionOutlined style={{fontSize: '20px', color: 'var(--ant-primary-color)'}}/>}
                      title={`${item.subjectId.name} ${item.subjectId.code ? `(${item.subjectId.code})` : ''}`}
                      description={`Class: ${item.classId.name} (${item.classId.level || ''}) - Year: ${item.academicYearId.name}`}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Typography.Paragraph>No active teaching assignments for the current academic year.</Typography.Paragraph>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
