
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Spin, Alert, Card, List, Tag, Row, Col, Empty } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, BookOutlined, UserOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import type { ITimetable, ITimetabledPeriod } from '@/models/Tenant/Timetable'; // Ensure ITimetabledPeriod is also exported or defined here
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;

// Simplified ITimetabledPeriod matching the populated data from API
interface PopulatedPeriod extends Omit<ITimetabledPeriod, 'subjectId' | 'teacherId'> {
  subjectId: { _id: string; name: string; code?: string };
  teacherId: { _id: string; firstName?: string; lastName?: string; username: string };
}

interface PopulatedTimetable extends Omit<ITimetable, 'periods' | 'academicYearId' | 'classId' | 'termId'> {
  periods: PopulatedPeriod[];
  academicYearId: { _id: string; name: string };
  classId: { _id: string; name: string; level?: string };
  termId?: { _id: string; name: string };
}


const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function StudentTimetablePage() {
  const params = useParams();
  const schoolCode = params.schoolCode as string;

  const [timetable, setTimetable] = useState<PopulatedTimetable | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = `/api/${schoolCode}/portal/students/me/timetable`;

  const fetchTimetable = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_URL);
      if (!res.ok) {
        const errData = await res.json();
        if (res.status === 404) {
            throw new Error(errData.error || 'No active timetable found for your class. Please check with your school administration.');
        }
        throw new Error(errData.error || 'Failed to fetch timetable');
      }
      const data: PopulatedTimetable = await res.json();
      setTimetable(data);
    } catch (err: any) {
      setError(err.message);
      setTimetable(null);
    } finally {
      setLoading(false);
    }
  }, [schoolCode, API_URL]);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  const groupedPeriods = useMemo(() => {
    if (!timetable?.periods) return {};
    
    const grouped = timetable.periods.reduce((acc, period) => {
      const day = period.dayOfWeek;
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(period);
      return acc;
    }, {} as Record<string, PopulatedPeriod[]>);

    // Sort periods within each day by startTime
    for (const day in grouped) {
      grouped[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return grouped;
  }, [timetable]);


  if (loading) {
    return <div className="flex justify-center items-center h-64"><Spin size="large" tip="Loading your timetable..." /></div>;
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon className="my-4" />;
  }

  if (!timetable) {
    return <Empty description="No timetable data available at the moment." />;
  }
  
  const sortedDaysWithPeriods = daysOrder.filter(day => groupedPeriods[day] && groupedPeriods[day].length > 0);


  return (
    <div className="p-4">
      <Title level={2} className="mb-2 flex items-center">
        <CalendarOutlined className="mr-2" /> My Timetable
      </Title>
      <Paragraph className="mb-6">
        Displaying active timetable for: <Text strong>{timetable.name}</Text>
        <br />
        Class: <Text strong>{timetable.classId.name} {timetable.classId.level ? `(${timetable.classId.level})` : ''}</Text> | 
        Academic Year: <Text strong>{timetable.academicYearId.name}</Text>
        {timetable.termId && <Text> | Term: <Text strong>{timetable.termId.name}</Text></Text>}
      </Paragraph>

      {sortedDaysWithPeriods.length === 0 ? (
         <Empty description="No periods scheduled in your current timetable. Please check back later or contact your school administration." />
      ) : (
        <Row gutter={[16, 16]}>
            {sortedDaysWithPeriods.map(day => (
            <Col xs={24} md={12} lg={8} key={day}>
                <Card title={<Title level={4} className="!my-0">{day}</Title>} className="h-full shadow-md">
                <List
                    itemLayout="horizontal"
                    dataSource={groupedPeriods[day]}
                    renderItem={(period) => (
                    <List.Item className="!p-0">
                        <Card type="inner" size="small" className="w-full mb-2">
                            <div className="flex justify-between items-center mb-1">
                                <Text strong className="text-base text-primary">
                                    <BookOutlined className="mr-2" />
                                    {period.subjectId.name} {period.subjectId.code ? `(${period.subjectId.code})` : ''}
                                </Text>
                                <Tag color="blue">
                                    <ClockCircleOutlined className="mr-1" />
                                    {period.startTime} - {period.endTime}
                                </Tag>
                            </div>
                            <Paragraph className="text-sm text-gray-700 mb-1">
                                <UserOutlined className="mr-2" />
                                {period.teacherId.firstName} {period.teacherId.lastName} ({period.teacherId.username})
                            </Paragraph>
                            {period.location && (
                                <Paragraph className="text-xs text-gray-500 mb-0">
                                <EnvironmentOutlined className="mr-1" />
                                Location: {period.location}
                                </Paragraph>
                            )}
                        </Card>
                    </List.Item>
                    )}
                />
                </Card>
            </Col>
            ))}
        </Row>
      )}
    </div>
  );
}

// Helper hook, not used in this component directly but kept for consistency if needed elsewhere
function useMemo<T>(factory: () => T, deps: React.DependencyList | undefined): T {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return React.useMemo(factory, deps);
}
