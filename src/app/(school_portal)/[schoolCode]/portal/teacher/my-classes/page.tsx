
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Card, Row, Col, Spin, Empty, Alert, Button } from 'antd';
import { TeamOutlined, ArrowRightOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import type { IClass } from '@/models/Tenant/Class';

const { Title, Paragraph } = Typography;

interface TeacherAssignmentClass {
  _id: string;
  name: string;
  level?: string;
  stream?: string;
}

interface TeacherAssignment {
  classId: TeacherAssignmentClass;
  subjectId: { _id: string; name: string; code?: string };
  academicYearId: { _id: string; name: string };
}

export default function TeacherMyClassesPage() {
  const params = useParams();
  const schoolCode = params.schoolCode as string;
  const { data: session, status: sessionStatus } = useSession();

  const [activeAcademicYear, setActiveAcademicYear] = useState<IAcademicYear | null>(null);
  const [assignedClasses, setAssignedClasses] = useState<TeacherAssignmentClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveAcademicYear = useCallback(async () => {
    try {
      const res = await fetch(`/api/${schoolCode}/portal/academics/academic-years?active=true`);
      if (!res.ok) throw new Error('Failed to fetch active academic year');
      const years: IAcademicYear[] = await res.json();
      if (years.length > 0) {
        setActiveAcademicYear(years[0]);
        return years[0];
      } else {
        setError("No active academic year found. Please contact an administrator.");
        return null;
      }
    } catch (err: any) {
      setError(err.message || 'Could not load active academic year.');
      return null;
    }
  }, [schoolCode]);

  const fetchTeacherAssignments = useCallback(async (yearId: string) => {
    try {
      const res = await fetch(`/api/${schoolCode}/portal/teachers/my-assignments?academicYearId=${yearId}`);
      if (!res.ok) throw new Error('Failed to fetch teacher assignments');
      const assignments: TeacherAssignment[] = await res.json();
      
      const uniqueClasses = Array.from(new Map(assignments.map(item => [item.classId._id, item.classId])).values());
      setAssignedClasses(uniqueClasses.sort((a,b) => a.name.localeCompare(b.name)));

    } catch (err: any) {
      setError(err.message || 'Could not load teacher assignments.');
    }
  }, [schoolCode]);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      setLoading(true);
      setError(null);
      fetchActiveAcademicYear().then(activeYear => {
        if (activeYear) {
          fetchTeacherAssignments(activeYear._id).finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      });
    } else if (sessionStatus === 'unauthenticated') {
        setError("User not authenticated.");
        setLoading(false);
    }
  }, [sessionStatus, fetchActiveAcademicYear, fetchTeacherAssignments]);

  if (loading || sessionStatus === 'loading') {
    return <div className="flex justify-center items-center h-64"><Spin size="large" tip="Loading your classes..." /></div>;
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon className="my-4" />;
  }

  if (!activeAcademicYear) {
    return <Alert message="Information" description="No active academic year is set. Class assignments cannot be displayed." type="info" showIcon />;
  }
  
  if (assignedClasses.length === 0) {
    return (
      <div>
        <Title level={2} className="mb-6"><TeamOutlined className="mr-2" /> My Classes for {activeAcademicYear.name}</Title>
        <Empty description="You are not currently assigned to any classes for the active academic year." />
      </div>
    );
  }

  return (
    <div>
      <Title level={2} className="mb-6"><TeamOutlined className="mr-2" /> My Classes for {activeAcademicYear.name}</Title>
      <Paragraph className="mb-6">Here are the classes you are assigned to for the current academic year. Click on a class to view its student roster.</Paragraph>
      <Row gutter={[16, 16]}>
        {assignedClasses.map(cls => (
          <Col xs={24} sm={12} md={8} key={cls._id}>
            <Card 
              hoverable 
              title={`${cls.name} ${cls.level ? `(${cls.level}${cls.stream ? ` - ${cls.stream}` : ''})` : ''}`}
              className="h-full"
              actions={[
                <Link href={`/${schoolCode}/portal/teacher/my-classes/${cls._id}`} key="view">
                  <Button type="primary" icon={<ArrowRightOutlined />}>View Roster</Button>
                </Link>
              ]}
            >
              <Paragraph type="secondary">
                View students enrolled in this class.
              </Paragraph>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
    