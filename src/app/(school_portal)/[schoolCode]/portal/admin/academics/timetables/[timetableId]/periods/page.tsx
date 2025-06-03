
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Table, Modal, Form, Input, Select, message, Tag, Space, Spin, Popconfirm, Row, Col, TimePicker, Alert, Breadcrumb } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CalendarOutlined, TeamOutlined, BookOutlined, ClockCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { ITimetable, ITimetabledPeriod } from '@/models/Tenant/Timetable';
import type { ISubject } from '@/models/Tenant/Subject';
import type { ITenantUser } from '@/models/Tenant/User';
import type { IClass } from '@/models/Tenant/Class';
import moment from 'moment';
import mongoose from 'mongoose';

const { Title, Text } = Typography;
const { Option } = Select;

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface PeriodManagementPageProps {
  params: { schoolCode: string; timetableId: string };
}

interface PeriodClientDataType extends ITimetabledPeriod {
  key: string; // Corresponds to period._id
  subjectName?: string;
  teacherName?: string;
}

export default function PeriodManagementPage({ params: routeParams }: PeriodManagementPageProps) {
  const { schoolCode, timetableId } = routeParams;
  const router = useRouter();

  const [timetable, setTimetable] = useState<ITimetable | null>(null);
  const [periods, setPeriods] = useState<PeriodClientDataType[]>([]);
  const [subjects, setSubjects] = useState<ISubject[]>([]); // Subjects relevant to the timetable's class
  const [teachers, setTeachers] = useState<ITenantUser[]>([]); // All active teachers
  
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<PeriodClientDataType | null>(null);
  const [form] = Form.useForm();

  const TIMETABLE_API_URL = `/api/${schoolCode}/portal/admin/academics/timetables/${timetableId}`;
  const SUBJECTS_API_BASE = `/api/${schoolCode}/portal/academics/subjects`; // To fetch all subjects if class has none specified
  const USERS_API = `/api/${schoolCode}/portal/users?role=teacher&isActive=true`; // To fetch active teachers
  const CLASS_SUBJECTS_API = (classId: string) => `/api/${schoolCode}/portal/academics/classes/${classId}`; // To get subjects of specific class

  const fetchTimetableDetails = useCallback(async () => {
    if (!mongoose.Types.ObjectId.isValid(timetableId)) {
      message.error("Invalid Timetable ID.");
      router.push(`/${schoolCode}/portal/admin/academics/timetables`);
      return null;
    }
    setLoading(true);
    try {
      const res = await fetch(TIMETABLE_API_URL);
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch timetable details');
      const data: ITimetable = await res.json();
      setTimetable(data);
      
      const populatedPeriods = (data.periods || []).map(p => ({
        ...p,
        key: p._id.toString(),
        subjectName: (p.subjectId as ISubject)?.name || 'N/A',
        teacherName: (p.teacherId as ITenantUser)?.firstName ? `${(p.teacherId as ITenantUser).firstName} ${(p.teacherId as ITenantUser).lastName}` : ((p.teacherId as ITenantUser)?.username || 'N/A'),
      }));
      setPeriods(populatedPeriods);
      return data;
    } catch (error: any) {
      message.error(error.message || 'Could not load timetable details.');
      setTimetable(null);
      return null;
    } finally {
      // Defer setLoading(false) until other data is fetched
    }
  }, [schoolCode, timetableId, router, TIMETABLE_API_URL]);

  const fetchSupportingData = useCallback(async (currentTimetable: ITimetable) => {
    try {
      const classId = (currentTimetable.classId as IClass)._id;
      let classSubjects: ISubject[] = [];

      // Fetch subjects specific to the class
      if (classId) {
        const classDetailsRes = await fetch(CLASS_SUBJECTS_API(classId.toString()));
        if (classDetailsRes.ok) {
            const classData: IClass = await classDetailsRes.json();
            if (classData.subjectsOffered && classData.subjectsOffered.length > 0) {
                 // Assuming subjectsOffered are populated or are at least Ids that we can use
                 // For simplicity, if they are just Ids, we would need another fetch to get their names
                 // Or ensure the /classes/:id endpoint populates subjectsOffered properly
                 classSubjects = classData.subjectsOffered as ISubject[]; // Assuming populated
            }
        } else {
            console.warn("Could not fetch class-specific subjects, falling back to all subjects.");
        }
      }
      
      if (classSubjects.length === 0) { // Fallback: Fetch all subjects if class has no specific ones
        const allSubjectsRes = await fetch(SUBJECTS_API_BASE);
        if (allSubjectsRes.ok) classSubjects = await allSubjectsRes.json();
        else console.error("Failed to fetch all subjects.");
      }
      setSubjects(classSubjects.sort((a,b) => a.name.localeCompare(b.name)));
      

      const teachersRes = await fetch(USERS_API);
      if (!teachersRes.ok) throw new Error('Failed to fetch teachers');
      const teachersData: ITenantUser[] = await teachersRes.json();
      setTeachers(teachersData.sort((a,b)=>(a.firstName || "").localeCompare(b.firstName || "")));

    } catch (error: any) {
      message.error(error.message || "Failed to load subjects or teachers.");
    } finally {
      setLoading(false); // All data fetching attempts complete
    }
  }, [schoolCode, SUBJECTS_API_BASE, USERS_API]);

  useEffect(() => {
    fetchTimetableDetails().then(currentTimetable => {
      if (currentTimetable) {
        fetchSupportingData(currentTimetable);
      } else {
        setLoading(false); // No timetable, stop loading
      }
    });
  }, [fetchTimetableDetails, fetchSupportingData]);


  const handleAddPeriod = () => {
    setEditingPeriod(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditPeriod = (period: PeriodClientDataType) => {
    setEditingPeriod(period);
    form.setFieldsValue({
      ...period,
      subjectId: typeof period.subjectId === 'object' ? (period.subjectId as ISubject)._id : period.subjectId,
      teacherId: typeof period.teacherId === 'object' ? (period.teacherId as ITenantUser)._id : period.teacherId,
      startTime: moment(period.startTime, 'HH:mm'),
      endTime: moment(period.endTime, 'HH:mm'),
    });
    setIsModalVisible(true);
  };

  const handleDeletePeriod = async (periodIdToDelete: string) => {
    if (!timetable) return;
    const updatedPeriods = timetable.periods.filter(p => p._id.toString() !== periodIdToDelete);
    try {
      const response = await fetch(TIMETABLE_API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...timetable, periods: updatedPeriods }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to delete period');
      message.success('Period deleted successfully');
      fetchTimetableDetails(); // Refetch to update UI
    } catch (error: any) {
      message.error(error.message || 'Could not delete period.');
    }
  };

  const handleModalOk = async () => {
    if (!timetable) return;
    try {
      const values = await form.validateFields();
      const newPeriodData: Omit<ITimetabledPeriod, '_id' | 'createdAt' | 'updatedAt'> = {
        dayOfWeek: values.dayOfWeek,
        startTime: values.startTime.format('HH:mm'),
        endTime: values.endTime.format('HH:mm'),
        subjectId: values.subjectId,
        teacherId: values.teacherId,
        location: values.location,
      };

      let updatedPeriods;
      if (editingPeriod) {
        updatedPeriods = timetable.periods.map(p => 
          p._id.toString() === editingPeriod.key ? { ...p, ...newPeriodData } : p
        );
      } else {
        updatedPeriods = [...timetable.periods, { ...newPeriodData, _id: new mongoose.Types.ObjectId() as any }];
      }
      
      const response = await fetch(TIMETABLE_API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...timetable, periods: updatedPeriods }),
      });

      if (!response.ok) throw new Error((await response.json()).error || `Failed to ${editingPeriod ? 'update' : 'add'} period`);
      
      message.success(`Period ${editingPeriod ? 'updated' : 'added'} successfully`);
      setIsModalVisible(false);
      fetchTimetableDetails(); // Refetch
    } catch (error: any) {
      message.error(error.message || `Could not ${editingPeriod ? 'update' : 'add'} period.`);
    }
  };

  const periodColumns = [
    { title: 'Day', dataIndex: 'dayOfWeek', key: 'dayOfWeek', sorter: (a: PeriodClientDataType, b: PeriodClientDataType) => daysOfWeek.indexOf(a.dayOfWeek) - daysOfWeek.indexOf(b.dayOfWeek) },
    { title: 'Start Time', dataIndex: 'startTime', key: 'startTime', sorter: (a: PeriodClientDataType, b: PeriodClientDataType) => a.startTime.localeCompare(b.startTime) },
    { title: 'End Time', dataIndex: 'endTime', key: 'endTime' },
    { title: 'Subject', dataIndex: 'subjectName', key: 'subjectName' },
    { title: 'Teacher', dataIndex: 'teacherName', key: 'teacherName' },
    { title: 'Location', dataIndex: 'location', key: 'location', render: (loc?: string) => loc || '-' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: PeriodClientDataType) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEditPeriod(record)}>Edit</Button>
          <Popconfirm
            title="Delete this period?"
            onConfirm={() => handleDeletePeriod(record.key)}
            okText="Yes, Delete"
            cancelText="No"
          >
            <Button icon={<DeleteOutlined />} danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const breadcrumbItems = [
    { title: <Link href={`/${schoolCode}/portal/dashboard`}>Home</Link> },
    { title: <Link href={`/${schoolCode}/portal/admin/academics`}>Academics</Link> },
    { title: <Link href={`/${schoolCode}/portal/admin/academics/timetables`}>Timetables</Link> },
    { title: timetable ? `Manage Periods: ${timetable.name}` : 'Loading Timetable...' },
  ];

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Spin size="large" tip="Loading timetable data..." /></div>;
  }

  if (!timetable) {
    return <Alert message="Error" description="Timetable details could not be loaded. Please go back and try again." type="error" showIcon action={<Button onClick={() => router.back()}>Back to Timetables</Button>} />;
  }
  
  const timetableClass = timetable.classId as IClass;
  const timetableAcademicYear = timetable.academicYearId as IAcademicYear;
  const timetableTerm = timetable.termId as ITerm | undefined;


  return (
    <div>
      <Breadcrumb items={breadcrumbItems} className="mb-4" />
      <Title level={2} className="mb-2">Manage Periods for: {timetable.name}</Title>
      <Text type="secondary" className="block mb-4">
        Class: {timetableClass?.name} ({timetableClass?.level}) | Academic Year: {timetableAcademicYear?.name} {timetableTerm ? `| Term: ${timetableTerm.name}` : ''}
      </Text>
      
      <div className="flex justify-between items-center mb-6">
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddPeriod}>
          Add New Period
        </Button>
         <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(`/${schoolCode}/portal/admin/academics/timetables`)}>Back to Timetables List</Button>
      </div>

      <Table columns={periodColumns} dataSource={periods} rowKey="key" bordered />

      <Modal
        title={editingPeriod ? 'Edit Period' : 'Add New Period'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting}
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical" name="periodForm" className="mt-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="dayOfWeek" label="Day of Week" rules={[{ required: true }]}>
                <Select placeholder="Select day">
                  {daysOfWeek.map(day => <Option key={day} value={day}>{day}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="subjectId" label="Subject" rules={[{ required: true }]}>
                <Select placeholder="Select subject" showSearch filterOption={(input, option) => (option?.children?.toString() ?? '').toLowerCase().includes(input.toLowerCase())}>
                  {subjects.map(sub => <Option key={sub._id} value={sub._id}>{sub.name} {sub.code ? `(${sub.code})` : ''}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="startTime" label="Start Time" rules={[{ required: true }]}>
                <TimePicker format="HH:mm" style={{width: "100%"}} minuteStep={5} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endTime" label="End Time" rules={[{ required: true }]}>
                <TimePicker format="HH:mm" style={{width: "100%"}} minuteStep={5}/>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="teacherId" label="Teacher" rules={[{ required: true }]}>
                <Select placeholder="Select teacher" showSearch filterOption={(input, option) => (option?.children?.toString() ?? '').toLowerCase().includes(input.toLowerCase())}>
                  {teachers.map(t => <Option key={t._id} value={t._id}>{t.firstName} {t.lastName} ({t.username})</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="location" label="Location (Optional)">
                <Input placeholder="e.g., Room 101, Lab A" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

    