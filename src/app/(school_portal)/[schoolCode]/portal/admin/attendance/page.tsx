
'use client';
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Button, Typography, Select, Card, Row, Col, message, Spin, DatePicker, Table, Empty, Space as AntSpace, Tag } from 'antd';
import { CheckSquareOutlined, CalendarOutlined, TeamOutlined, BookOutlined, FilterOutlined, SearchOutlined } from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import type { IClass } from '@/models/Tenant/Class';
import type { ISubject } from '@/models/Tenant/Subject';
import type { IAttendance, AttendanceStatus } from '@/models/Tenant/Attendance';
import moment from 'moment';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// Define interfaces for populated data returned by the API
interface PopulatedUser { _id: string; firstName?: string; lastName?: string; username: string; }
interface PopulatedClass { _id: string; name: string; level?: string; }
interface PopulatedSubject { _id: string; name: string; code?: string; }
interface PopulatedAcademicYear { _id: string; name: string; }

interface AdminAttendanceRecordClient extends Omit<IAttendance, 'studentId' | 'classId' | 'subjectId' | 'recordedById' | 'academicYearId'> {
  key: string;
  _id: string; 
  studentId: PopulatedUser;
  classId: PopulatedClass;
  subjectId?: PopulatedSubject;
  recordedById: PopulatedUser;
  academicYearId: PopulatedAcademicYear;
}


function AdminAttendanceRecordsPageCore() {
  const params = useParams();
  const router = useRouter();
  const schoolCode = params.schoolCode as string;

  const [academicYears, setAcademicYears] = useState<IAcademicYear[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | undefined>();
  
  const [classes, setClasses] = useState<IClass[]>([]); // Classes for the selected AY
  const [selectedClass, setSelectedClass] = useState<string | undefined>();

  const [allSchoolSubjects, setAllSchoolSubjects] = useState<ISubject[]>([]); // All subjects in the school
  const [displayableSubjects, setDisplayableSubjects] = useState<ISubject[]>([]); // Subjects for dropdown (filtered or all)
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>();
  
  const [selectedDateRange, setSelectedDateRange] = useState<[moment.Moment, moment.Moment] | null>(null);
  
  const [attendanceRecords, setAttendanceRecords] = useState<AdminAttendanceRecordClient[]>([]);
  
  const [loadingYears, setLoadingYears] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingAllSubjects, setLoadingAllSubjects] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);


  const ACADEMIC_YEARS_API = `/api/${schoolCode}/portal/academics/academic-years`;
  const CLASSES_API_BASE = `/api/${schoolCode}/portal/academics/classes`;
  const SUBJECTS_API_BASE = `/api/${schoolCode}/portal/academics/subjects`;
  const ADMIN_ATTENDANCE_API = `/api/${schoolCode}/portal/admin/attendance/records`;

  // Fetch Academic Years
  useEffect(() => {
    const fetchYears = async () => {
      setLoadingYears(true);
      try {
        const res = await fetch(ACADEMIC_YEARS_API);
        if (!res.ok) throw new Error((await res.json()).error ||'Failed to fetch academic years');
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
        if (!res.ok) throw new Error((await res.json()).error ||'Failed to fetch classes for the selected year');
        const data: IClass[] = await res.json();
        setClasses(data.sort((a,b) => a.name.localeCompare(b.name)));
        setSelectedClass(undefined); 
      } catch (err: any) {
        message.error(err.message || 'Could not load classes.');
        setClasses([]);
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClasses();
  }, [selectedAcademicYear, schoolCode, CLASSES_API_BASE]);

  // Fetch all school subjects once
   useEffect(() => {
    const fetchAllSubjects = async () => {
        setLoadingAllSubjects(true);
        try {
            const res = await fetch(SUBJECTS_API_BASE);
            if (!res.ok) throw new Error((await res.json()).error ||'Failed to fetch subjects');
            const data: ISubject[] = await res.json();
            setAllSchoolSubjects(data.sort((a,b) => a.name.localeCompare(b.name)));
            setDisplayableSubjects(data.sort((a,b) => a.name.localeCompare(b.name))); // Initially show all
        } catch (err:any) {
            message.error(err.message || 'Could not load subjects.');
            setAllSchoolSubjects([]);
            setDisplayableSubjects([]);
        } finally {
            setLoadingAllSubjects(false);
        }
      };
      fetchAllSubjects();
  }, [schoolCode, SUBJECTS_API_BASE]);

  // Filter displayable subjects when selectedClass or allSchoolSubjects change
  useEffect(() => {
    if (!selectedClass) {
      setDisplayableSubjects(allSchoolSubjects); // Show all subjects if no class selected
      setSelectedSubject(undefined);
      return;
    }

    const selectedClassDetails = classes.find(c => c._id === selectedClass);
    if (selectedClassDetails && selectedClassDetails.subjectsOffered && selectedClassDetails.subjectsOffered.length > 0) {
        const offeredSubjectIds = selectedClassDetails.subjectsOffered.map(s => (typeof s === 'string' ? s : (s as ISubject)._id));
        const filtered = allSchoolSubjects.filter(s => offeredSubjectIds.includes(s._id));
        setDisplayableSubjects(filtered.sort((a,b) => a.name.localeCompare(b.name)));
    } else {
        setDisplayableSubjects(allSchoolSubjects); // Show all subjects if class has no specific offerings
    }
    setSelectedSubject(undefined);
  }, [selectedClass, classes, allSchoolSubjects]);


  const handleFetchAttendance = useCallback(async () => {
    if (!selectedAcademicYear || !selectedClass || !selectedDateRange) {
      message.info('Please select Academic Year, Class, and Date Range to fetch records.');
      setAttendanceRecords([]);
      return;
    }
    setLoadingAttendance(true);
    try {
      const queryParams = new URLSearchParams({
        academicYearId: selectedAcademicYear,
        classId: selectedClass,
        startDate: selectedDateRange[0].format('YYYY-MM-DD'),
        endDate: selectedDateRange[1].format('YYYY-MM-DD'),
      });
      if (selectedSubject) queryParams.append('subjectId', selectedSubject);
      
      const res = await fetch(`${ADMIN_ATTENDANCE_API}?${queryParams.toString()}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch attendance records');
      const data: AdminAttendanceRecordClient[] = await res.json();
      setAttendanceRecords(data.map(r => ({...r, key: r._id})));
    } catch (err: any) {
      message.error(err.message || 'Could not load attendance records.');
      setAttendanceRecords([]);
    } finally {
      setLoadingAttendance(false);
    }
  }, [selectedAcademicYear, selectedClass, selectedSubject, selectedDateRange, schoolCode, ADMIN_ATTENDANCE_API]);

  const columns = [
    { 
        title: 'Date', 
        dataIndex: 'date', 
        key: 'date', 
        render: (date: string) => moment(date).format('LL'), 
        sorter: (a:AdminAttendanceRecordClient, b:AdminAttendanceRecordClient) => moment(a.date).unix() - moment(b.date).unix() 
    },
    { 
        title: 'Student Name', 
        key: 'studentName',
        render: (text: any, record: AdminAttendanceRecordClient) => record.studentId ? `${record.studentId.firstName} ${record.studentId.lastName}` : 'N/A',
        sorter: (a:AdminAttendanceRecordClient, b:AdminAttendanceRecordClient) => 
            `${a.studentId?.firstName} ${a.studentId?.lastName}`.localeCompare(`${b.studentId?.firstName} ${b.studentId?.lastName}`)
    },
    { 
        title: 'Class', 
        key: 'className',
        render: (text: any, record: AdminAttendanceRecordClient) => record.classId ? `${record.classId.name} ${record.classId.level ? `(${record.classId.level})` : ''}` : 'N/A'
    },
    { 
        title: 'Subject', 
        key: 'subjectName', 
        render: (text: any, record: AdminAttendanceRecordClient) => record.subjectId ? `${record.subjectId.name} ${record.subjectId.code ? `(${record.subjectId.code})` : ''}` : 'General'
    },
    { 
        title: 'Status', 
        dataIndex: 'status', 
        key: 'status', 
        render: (status: AttendanceStatus) => <Tag color={
            status === 'Present' ? 'success' :
            status === 'Absent' ? 'error' :
            status === 'Late' ? 'warning' :
            status === 'Excused' ? 'blue' : 'default'
        }>{status}</Tag> 
    },
    { 
        title: 'Remarks', 
        dataIndex: 'remarks', 
        key: 'remarks', 
        render: (text?: string) => text || '-' 
    },
    { 
        title: 'Recorded By', 
        key: 'recordedBy',
        render: (text:any, record: AdminAttendanceRecordClient) => record.recordedById ? record.recordedById.username : 'N/A'
    },
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
                    onChange={val => { setSelectedClass(val); }}
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
                    loading={loadingAllSubjects && displayableSubjects.length === 0}
                    disabled={loadingAllSubjects && displayableSubjects.length === 0}
                    allowClear
                    suffixIcon={<BookOutlined />}
                >
                    {displayableSubjects.map(sub => <Option key={sub._id} value={sub._id}>{sub.name} {sub.code ? `(${sub.code})` : ''}</Option>)}
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
          scroll={{ x: 1200 }} // Increased scroll width
          locale={{ emptyText: <Empty description={attendanceRecords.length === 0 && (selectedAcademicYear && selectedClass && selectedDateRange) ? "No attendance records found for the selected criteria." : "Please select filters and click 'Fetch Records'."} /> }}
        />
      )}
    </div>
  );
}

export default function AdminAttendanceRecordsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Spin size="large" tip="Loading page..." /></div>}>
            <AdminAttendanceRecordsPageCore />
        </Suspense>
    );
}
