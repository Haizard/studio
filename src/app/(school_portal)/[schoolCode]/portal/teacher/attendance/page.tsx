
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Select, Card, Row, Col, message, Spin, DatePicker } from 'antd';
import { CalendarOutlined, TeamOutlined, BookOutlined, ArrowRightOutlined, ScheduleOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import type { IClass } from '@/models/Tenant/Class';
import type { ISubject } from '@/models/Tenant/Subject';
import moment from 'moment';

const { Title, Paragraph } = Typography;
const { Option } = Select;

interface TeacherAssignment {
  classId: { _id: string; name: string; level?: string; stream?: string };
  subjectId: { _id: string; name: string; code?: string };
  academicYearId: { _id: string; name: string };
}

export default function AttendanceSelectionPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const schoolCode = params.schoolCode as string;

  const [academicYears, setAcademicYears] = useState<IAcademicYear[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | undefined>(searchParams.get('academicYearId') || undefined);
  
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<IClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | undefined>(searchParams.get('classId') || undefined);

  const [assignedSubjects, setAssignedSubjects] = useState<ISubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>(searchParams.get('subjectId') || undefined);
  
  const [selectedDate, setSelectedDate] = useState<moment.Moment | null>(searchParams.get('date') ? moment(searchParams.get('date')) : moment());
  
  const [loadingYears, setLoadingYears] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  const ACADEMIC_YEARS_API = `/api/${schoolCode}/portal/academics/academic-years?active=true`; // Fetch active first
  const ALL_ACADEMIC_YEARS_API = `/api/${schoolCode}/portal/academics/academic-years`;
  const TEACHER_ASSIGNMENTS_API = `/api/${schoolCode}/portal/teachers/my-assignments`;

  useEffect(() => {
    const fetchYears = async () => {
      setLoadingYears(true);
      try {
        const res = await fetch(ALL_ACADEMIC_YEARS_API); // Fetch all years for selection
        if (!res.ok) throw new Error('Failed to fetch academic years');
        const data: IAcademicYear[] = await res.json();
        setAcademicYears(data.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
        if (!selectedAcademicYear) { // Only set default if not already set by query param
          const activeYear = data.find(y => y.isActive);
          if (activeYear) setSelectedAcademicYear(activeYear._id);
          else if (data.length > 0) setSelectedAcademicYear(data[0]._id);
        }
      } catch (err: any) {
        message.error(err.message || 'Could not load academic years.');
      } finally {
        setLoadingYears(false);
      }
    };
    fetchYears();
  }, [schoolCode, ALL_ACADEMIC_YEARS_API, selectedAcademicYear]);

  useEffect(() => {
    if (!selectedAcademicYear) {
      setTeacherAssignments([]);
      setAssignedClasses([]);
      setAssignedSubjects([]);
      setSelectedClass(undefined);
      setSelectedSubject(undefined);
      return;
    }
    const fetchAssignments = async () => {
      setLoadingAssignments(true);
      try {
        const res = await fetch(`${TEACHER_ASSIGNMENTS_API}?academicYearId=${selectedAcademicYear}`);
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch teacher assignments');
        const data: TeacherAssignment[] = await res.json();
        setTeacherAssignments(data);
        const uniqueClasses = Array.from(new Map(data.map(item => [item.classId._id, item.classId])).values());
        setAssignedClasses(uniqueClasses as IClass[]);
        // If classId was from query params, try to set subjects for it
        if (selectedClass && uniqueClasses.some(uc => uc._id === selectedClass)) {
             const subjectsForClass = data
                .filter(assign => assign.classId._id === selectedClass)
                .map(assign => assign.subjectId);
            const uniqueSubjects = Array.from(new Map(subjectsForClass.map(sub => [sub._id, sub])).values());
            setAssignedSubjects(uniqueSubjects as ISubject[]);
        } else {
            setAssignedSubjects([]);
            setSelectedSubject(undefined);
        }

      } catch (err: any) {
        message.error(err.message || 'Could not load assignments for the selected year.');
        setTeacherAssignments([]);
        setAssignedClasses([]);
      } finally {
        setLoadingAssignments(false);
      }
    };
    fetchAssignments();
  }, [selectedAcademicYear, schoolCode, TEACHER_ASSIGNMENTS_API, selectedClass]);

  useEffect(() => {
    if (!selectedClass || teacherAssignments.length === 0) {
      setAssignedSubjects([]);
      // Do not reset selectedSubject if it came from query param initially
      // setSelectedSubject(undefined); 
      return;
    }
    const subjectsForClass = teacherAssignments
      .filter(assign => assign.classId._id === selectedClass && assign.academicYearId._id === selectedAcademicYear)
      .map(assign => assign.subjectId);
    const uniqueSubjects = Array.from(new Map(subjectsForClass.map(sub => [sub._id, sub])).values());
    setAssignedSubjects(uniqueSubjects as ISubject[]);
    // If selectedSubject from query param is not in new list, clear it
    if(selectedSubject && !uniqueSubjects.some(s => s._id === selectedSubject)){
        setSelectedSubject(undefined);
    }
  }, [selectedClass, teacherAssignments, selectedAcademicYear, selectedSubject]);

  const handleProceedToAttendance = () => {
    if (!selectedAcademicYear || !selectedClass || !selectedDate) {
      message.warning('Please select Academic Year, Class, and Date.');
      return;
    }
    let queryString = `academicYearId=${selectedAcademicYear}&classId=${selectedClass}&date=${selectedDate.format('YYYY-MM-DD')}`;
    if (selectedSubject) {
      queryString += `&subjectId=${selectedSubject}`;
    }
    router.push(`/${schoolCode}/portal/teacher/attendance/entry?${queryString}`);
  };


  return (
    <div>
      <Title level={2} className="mb-6"><CheckSquareOutlined className="mr-2" />Student Attendance</Title>
      <Paragraph>Select the criteria to take or view attendance.</Paragraph>

      <Row gutter={[16, 24]} className="mb-6">
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card title="1. Academic Year" size="small" className="h-full">
            <Select
              style={{ width: '100%' }}
              placeholder="Select Academic Year"
              value={selectedAcademicYear}
              onChange={value => { setSelectedAcademicYear(value); setSelectedClass(undefined); setSelectedSubject(undefined); }}
              loading={loadingYears}
              disabled={loadingYears}
              suffixIcon={<CalendarOutlined />}
            >
              {academicYears.map(year => <Option key={year._id} value={year._id}>{year.name}</Option>)}
            </Select>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card title="2. Class" size="small" className="h-full">
             <Select
              style={{ width: '100%' }}
              placeholder="Select Class"
              value={selectedClass}
              onChange={value => {setSelectedClass(value); setSelectedSubject(undefined);}}
              loading={loadingAssignments}
              disabled={!selectedAcademicYear || loadingAssignments || assignedClasses.length === 0}
              notFoundContent={loadingAssignments ? <Spin size="small" /> : "No classes assigned or select year."}
              suffixIcon={<TeamOutlined />}
            >
              {assignedClasses.map(cls => <Option key={cls._id} value={cls._id}>{cls.name} {cls.level ? `(${cls.level})` : ''}</Option>)}
            </Select>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card title="3. Subject (Optional)" size="small" className="h-full">
            <Select
              style={{ width: '100%' }}
              placeholder="Select Subject (Optional)"
              value={selectedSubject}
              onChange={setSelectedSubject}
              allowClear
              loading={loadingAssignments && !!selectedClass}
              disabled={!selectedClass || loadingAssignments || assignedSubjects.length === 0}
              notFoundContent={loadingAssignments && !!selectedClass ? <Spin size="small" /> : "No subjects for this class or select class."}
              suffixIcon={<BookOutlined />}
            >
              {assignedSubjects.map(sub => <Option key={sub._id} value={sub._id}>{sub.name} {sub.code ? `(${sub.code})` : ''}</Option>)}
            </Select>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card title="4. Date" size="small" className="h-full">
            <DatePicker 
              style={{ width: '100%' }}
              value={selectedDate}
              onChange={setSelectedDate}
              format="YYYY-MM-DD"
              disabledDate={current => current && current > moment().endOf('day')}
              suffixIcon={<ScheduleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Button 
        type="primary" 
        icon={<ArrowRightOutlined />} 
        onClick={handleProceedToAttendance}
        disabled={!selectedAcademicYear || !selectedClass || !selectedDate}
        size="large"
      >
        Take / View Attendance
      </Button>
    </div>
  );
}

