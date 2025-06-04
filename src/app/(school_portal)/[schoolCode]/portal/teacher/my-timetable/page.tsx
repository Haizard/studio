
'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Typography, Spin, Alert, Card, List, Tag, Row, Col, Empty } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, BookOutlined, TeamOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import mongoose from 'mongoose'; // For ObjectId type if needed, though data is simplified

const { Title, Text, Paragraph } = Typography;

interface TeacherPeriod {
  _id: mongoose.Types.ObjectId | string; // Assuming _id comes from the period subdocument
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  subjectCode?: string;
  className: string;
  classLevel?: string;
  location?: string;
  timetableName: string;
  academicYearName: string;
  termName?: string;
}

const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function TeacherTimetablePage() {
  const params = useParams();
  const schoolCode = params.schoolCode as string;

  const [teacherSchedule, setTeacherSchedule] = useState<TeacherPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAcademicYearName, setActiveAcademicYearName] = useState<string | null>(null);

  const API_URL = `/api/${schoolCode}/portal/teachers/me/timetable`;

  const fetchTeacherTimetable = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_URL);
      if (!res.ok) {
        const errData = await res.json();
        if (res.status === 404 && errData.error === 'No active academic year found.') {
            throw new Error('No active academic year is currently set by the administration. Timetable cannot be displayed.');
        }
        throw new Error(errData.error || 'Failed to fetch timetable');
      }
      const data: TeacherPeriod[] = await res.json();
      setTeacherSchedule(data); // API already sorts data
      if (data.length > 0) {
        // All periods should belong to the same active academic year from the API logic
        setActiveAcademicYearName(data[0].academicYearName); 
      } else {
        // If no periods, try to get active academic year name to show context.
        // This might require an additional call or the API to return it.
        // For now, if the API returns an empty schedule, it means no periods *for the teacher*
        // in the active year's timetables. We still need the active year's name.
        // The API for teacher's timetable already ensures an active academic year exists.
        // If it doesn't, it errors out. So, if we get here with empty data,
        // it means the active year exists, but teacher has no periods.
        // We might need a separate call to get the active year name if data is empty.
        // For now, if data is empty, activeAcademicYearName might remain null if not set from data[0].
        // A better approach: API returns activeAcademicYearName even if schedule is empty.
        // Let's assume the API gives an active year name or the first period's year name is sufficient.
        // If data is empty but no error, we still want to show "for active academic year X".
        // The API was modified to return this context.
        const activeYearRes = await fetch(`/api/${schoolCode}/portal/academics/academic-years?active=true`);
        if(activeYearRes.ok){
            const activeYears: any[] = await activeYearRes.json();
            if(activeYears.length > 0) setActiveAcademicYearName(activeYears[0].name);
        }
      }

    } catch (err: any) {
      setError(err.message);
      setTeacherSchedule([]);
    } finally {
      setLoading(false);
    }
  }, [schoolCode, API_URL]);

  useEffect(() => {
    fetchTeacherTimetable();
  }, [fetchTeacherTimetable]);

  const groupedPeriods = useMemo(() => {
    if (!teacherSchedule) return {};
    
    const grouped = teacherSchedule.reduce((acc, period) => {
      const day = period.dayOfWeek;
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(period);
      return acc;
    }, {} as Record<string, TeacherPeriod[]>);

    // Periods are already sorted by API (day then startTime)
    // If further client-side sort is needed for any reason:
    // for (const day in grouped) {
    //   grouped[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
    // }
    return grouped;
  }, [teacherSchedule]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Spin size="large" tip="Loading your timetable..." /></div>;
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon className="my-4" />;
  }
  
  const sortedDaysWithPeriods = daysOrder.filter(day => groupedPeriods[day] && groupedPeriods[day].length > 0);

  return (
    <div className="p-4">
      <Title level={2} className="mb-2 flex items-center">
        <CalendarOutlined className="mr-2" /> My Teaching Timetable
      </Title>
      <Paragraph className="mb-6">
        Displaying your teaching schedule for the active academic year{activeAcademicYearName ? <Text strong> ({activeAcademicYearName})</Text> : ''}.
      </Paragraph>

      {sortedDaysWithPeriods.length === 0 ? (
         <Empty description="No teaching periods found in your schedule for the active academic year." />
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
                                    {period.subjectName} {period.subjectCode ? `(${period.subjectCode})` : ''}
                                </Text>
                                <Tag color="blue">
                                    <ClockCircleOutlined className="mr-1" />
                                    {period.startTime} - {period.endTime}
                                </Tag>
                            </div>
                            <Paragraph className="text-sm text-gray-700 mb-1">
                                <TeamOutlined className="mr-2" />
                                Class: {period.className} {period.classLevel ? `(${period.classLevel})` : ''}
                            </Paragraph>
                            {period.location && (
                                <Paragraph className="text-xs text-gray-500 mb-0">
                                <EnvironmentOutlined className="mr-1" />
                                Location: {period.location}
                                </Paragraph>
                            )}
                             {period.termName && (
                                <Paragraph className="text-xs text-gray-500 mb-0">
                                Term: {period.termName}
                                </Paragraph>
                            )}
                             <Paragraph className="text-xs text-gray-500 mt-1">
                                <Text type="secondary" className="text-xs">From Timetable: {period.timetableName}</Text>
                            </Paragraph>
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
