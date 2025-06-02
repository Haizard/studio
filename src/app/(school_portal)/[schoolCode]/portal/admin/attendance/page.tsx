
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Select, Card, Row, Col, message, Spin, DatePicker, Table, Empty, Space as AntSpace } from 'antd';
import { CheckSquareOutlined, CalendarOutlined, TeamOutlined, BookOutlined, FilterOutlined, SearchOutlined } from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import type { IClass } from '@/models/Tenant/Class';
import type { ISubject } from '@/models/Tenant/Subject';
import type { IAttendance } from '@/models/Tenant/Attendance'; // Assuming ITenantUser might be needed for 'recordedBy'
import moment from 'moment';

const { Title, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface AdminAttendanceRecord extends IAttendance {
  // Potentially add populated fields like studentName, className, subjectName, recordedByName
  key: string;
}

export default function AdminAttendanceRecordsPage() {
  const params = useParams();
  const router = useRouter();
  const schoolCode = params.schoolCode as string;

  const [academicYears, setAcademicYears] = useState<IAcademicYear[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | undefined>();
  
  const [classes, setClasses] = useState<IClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | undefined>();

  const [subjects, setSubjects] = useState<ISubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>();
  
  const [selectedDateRange, setSelectedDateRange] = useState<[moment.Moment, moment.Moment] | null>(null);
  
  const [attendanceRecords, setAttendanceRecords] = useState<AdminAttendanceRecord[]>([]);
  
  const [loadingYears, setLoadingYears] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);


  const ACADEMIC_YEARS_API = `/api/${schoolCode}/portal/academics/academic-years`;
  const CLASSES_API_BASE = `/api/${schoolCode}/portal/academics/classes`;
  const SUBJECTS_API_BASE = `/api/${schoolCode}/portal/academics/subjects`;
  // const ADMIN_ATTENDANCE_API = `/api/${schoolCode}/portal/admin/attendance/records`; // API to be created

  // Fetch Academic Years
  useEffect(() => {
    const fetchYears = async () => {
      setLoadingYears(true);
      try {
        const res = await fetch(ACADEMIC_YEARS_API);
        if (!res.ok) throw new Error('Failed to fetch academic years');
        const data: IAcademicYear[] = await res.json();
        setAcademicYears(data.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
        const activeYear = data.find(y => y.isActive);
        if (activeYear) setSelectedAcademicYear(activeYear._id);
        else if (data.length > 0) setSelectedAcademicYear(data[0]._id)
      } catch (err: any) {
        message.error(err.message || 'Could not load academic years.');
      } finally {
        setLoadingYears(false);
      }
    };
    fetchYears();
  }, [schoolCode, ACADEMIC_YEARS_API]);

  // Fetch Classes when Academic Year changes
  useEffect(() => {
    if (!selectedAcademicYear) {
      setClasses([]);
      setSelectedClass(undefined);
      return;
    }
    const fetchClasses = async () => {
      setLoadingClasses(true);
      try {
        const res = await fetch(`${CLASSES_API_BASE}?academicYearId=${selectedAcademicYear}`);
        if (!res.ok) throw new Error('Failed to fetch classes for the selected year');
        const data: IClass[] = await res.json();
        setClasses(data.sort((a,b) => a.name.localeCompare(b.name)));
        setSelectedClass(undefined); // Reset class selection
      } catch (err: any) {
        message.error(err.message || 'Could not load classes.');
        setClasses([]);
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClasses();
  }, [selectedAcademicYear, schoolCode, CLASSES_API_BASE]);

  // Fetch Subjects when Class changes (or from general list if preferred)
  useEffect(() => {
    if (!selectedClass) {
      // Option 1: Load all subjects if no class selected, or only subjects for the selected class
      // For admin view, maybe load all subjects for the school and let admin filter
      const fetchAllSubjects = async () => {
        setLoadingSubjects(true);
        try {
            const res = await fetch(SUBJECTS_API_BASE);
            if (!res.ok) throw new Error('Failed to fetch subjects');
            const data: ISubject[] = await res.json();
            setSubjects(data.sort((a,b) => a.name.localeCompare(b.name)));
        } catch (err:any) {
            message.error(err.message || 'Could not load subjects.');
            setSubjects([]);
        } finally {
            setLoadingSubjects(false);
        }
      };
      fetchAllSubjects();
      setSelectedSubject(undefined);
      return;
    }
    // Option 2: If you want to filter subjects based on what the selected class offers:
    const selectedClassDetails = classes.find(c => c._id === selectedClass);
    if (selectedClassDetails && selectedClassDetails.subjectsOffered && selectedClassDetails.subjectsOffered.length > 0) {
        const offeredSubjectIds = selectedClassDetails.subjectsOffered.map(s => (typeof s === 'string' ? s : (s as any)._id));
        // This assumes 'subjects' state holds ALL subjects. Filter from there.
        // Or, fetch specific subjects by IDs if `selectedClassDetails.subjectsOffered` contains full objects or just IDs.
        // For simplicity, if `subjectsOffered` are just IDs, you'd fetch ALL subjects and then filter client-side,
        // or your API would need to support fetching subjects by an array of IDs.
        // The current `CLASSES_API` populates `subjectsOffered` with name and code.
        // So we can use them directly for the dropdown if we fetch subjects generally first.
        // For now, we'll assume `subjects` state (all subjects) is populated and filter from it.
        const filtered = subjects.filter(s => offeredSubjectIds.includes(s._id));
        setSubjects(filtered.sort((a,b) => a.name.localeCompare(b.name)));
    } else {
        setSubjects([]); // No subjects offered by this class, or still loading all subjects
    }
    setSelectedSubject(undefined);

  }, [selectedClass, classes, schoolCode, SUBJECTS_API_BASE, subjects]); // `subjects` added as dep


  const handleFetchAttendance = useCallback(async () => {
    if (!selectedAcademicYear || !selectedClass || !selectedDateRange) {
      message.info('Please select Academic Year, Class, and Date Range to fetch records.');
      setAttendanceRecords([]);
      return;
    }
    setLoadingAttendance(true);
    // TODO: Implement API call to fetch attendance records
    // Example structure:
    // const queryString = new URLSearchParams({
    //   academicYearId: selectedAcademicYear,
    //   classId: selectedClass,
    //   startDate: selectedDateRange[0].format('YYYY-MM-DD'),
    //   endDate: selectedDateRange[1].format('YYYY-MM-DD'),
    // });
    // if (selectedSubject) queryString.append('subjectId', selectedSubject);
    // try {
    //   const res = await fetch(`${ADMIN_ATTENDANCE_API}?${queryString.toString()}`);
    //   if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch attendance records');
    //   const data: AdminAttendanceRecord[] = await res.json(); // Adjust type based on API response
    //   setAttendanceRecords(data.map(r => ({...r, key: r._id})));
    // } catch (err: any) {
    //   message.error(err.message || 'Could not load attendance records.');
    //   setAttendanceRecords([]);
    // } finally {
    //   setLoadingAttendance(false);
    // }
    message.info("Data fetching for attendance records is not yet implemented.");
    setAttendanceRecords([]); // Clear previous records
    setLoadingAttendance(false);
  }, [selectedAcademicYear, selectedClass, selectedSubject, selectedDateRange, schoolCode]);

  const columns = [
    { title: 'Date', dataIndex: 'date', key: 'date', render: (date: string) => moment(date).format('LL'), sorter: (a:AdminAttendanceRecord, b:AdminAttendanceRecord) => moment(a.date).unix() - moment(b.date).unix() },
    { title: 'Student Name', dataIndex: ['studentId', 'name'], key: 'studentName' }, // Placeholder, needs population
    { title: 'Class', dataIndex: ['classId', 'name'], key: 'className' }, // Placeholder, needs population
    { title: 'Subject', dataIndex: ['subjectId', 'name'], key: 'subjectName', render: (name?:string) => name || 'N/A' }, // Placeholder
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag>{status}</Tag> },
    { title: 'Remarks', dataIndex: 'remarks', key: 'remarks', render: (text?: string) => text || '-' },
    { title: 'Recorded By', dataIndex: ['recordedById', 'username'], key: 'recordedBy' }, // Placeholder
  ];


  return (
    <div>
      <Title level={2} className="mb-6"><CheckSquareOutlined className="mr-2" />Student Attendance Records</Title>
      <Paragraph>Filter and view attendance records for students across different classes and periods.</Paragraph>

      <Card title={<><FilterOutlined className="mr-2" />Filter Attendance Records</>} className="mb-6">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <AntSpace direction="vertical" style={{width: '100%'}}>
              <Text>Academic Year</Text>
              <Select
                style={{ width: '100%' }}
                placeholder="Select Academic Year"
                value={selectedAcademicYear}
                onChange={val => { setSelectedAcademicYear(val); setSelectedClass(undefined); setSelectedSubject(undefined); }}
                loading={loadingYears}
                suffixIcon={<CalendarOutlined />}
              >
                {academicYears.map(year => <Option key={year._id} value={year._id}>{year.name}</Option>)}
              </Select>
            </AntSpace>
          </Col>
          <Col xs={24} sm={12} md={6}>
             <AntSpace direction="vertical" style={{width: '100%'}}>
                <Text>Class</Text>
                <Select
                    style={{ width: '100%' }}
                    placeholder="Select Class"
                    value={selectedClass}
                    onChange={val => { setSelectedClass(val); setSelectedSubject(undefined); }}
                    loading={loadingClasses}
                    disabled={!selectedAcademicYear || loadingClasses}
                    suffixIcon={<TeamOutlined />}
                >
                    {classes.map(cls => <Option key={cls._id} value={cls._id}>{cls.name} {cls.level ? `(${cls.level})`: ''}</Option>)}
                </Select>
            </AntSpace>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <AntSpace direction="vertical" style={{width: '100%'}}>
                <Text>Subject (Optional)</Text>
                <Select
                    style={{ width: '100%' }}
                    placeholder="Select Subject"
                    value={selectedSubject}
                    onChange={setSelectedSubject}
                    loading={loadingSubjects}
                    disabled={loadingSubjects} // Or disable if !selectedClass && specific subject filtering logic
                    allowClear
                    suffixIcon={<BookOutlined />}
                >
                    {subjects.map(sub => <Option key={sub._id} value={sub._id}>{sub.name} {sub.code ? `(${sub.code})` : ''}</Option>)}
                </Select>
            </AntSpace>
          </Col>
          <Col xs={24} sm={12} md={6}>
             <AntSpace direction="vertical" style={{width: '100%'}}>
                <Text>Date Range</Text>
                <RangePicker 
                    style={{ width: '100%' }} 
                    value={selectedDateRange}
                    onChange={(dates) => setSelectedDateRange(dates as [moment.Moment, moment.Moment] | null)}
                    disabledDate={current => current && current > moment().endOf('day')}
                />
            </AntSpace>
          </Col>
        </Row>
        <Row justify="end" className="mt-4">
            <Col>
                <Button 
                    type="primary" 
                    icon={<SearchOutlined />} 
                    onClick={handleFetchAttendance}
                    disabled={!selectedAcademicYear || !selectedClass || !selectedDateRange || loadingAttendance}
                    loading={loadingAttendance}
                >
                    Fetch Records
                </Button>
            </Col>
        </Row>
      </Card>

      <Title level={4} className="my-6">Attendance Data</Title>
      {loadingAttendance ? (
        <div className="text-center p-8"><Spin tip="Loading attendance records..." /></div>
      ) : (
        <Table 
          columns={columns} 
          dataSource={attendanceRecords} 
          rowKey="key"
          bordered
          size="small"
          scroll={{ x: 1000 }}
          locale={{ emptyText: <Empty description="No attendance records found for the selected criteria, or data fetching is not yet implemented." /> }}
        />
      )}
    </div>
  );
}

    
    