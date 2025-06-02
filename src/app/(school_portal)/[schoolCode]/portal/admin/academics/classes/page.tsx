
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Table, Modal, Form, Input, Select, message, Tag, Space, Spin, Popconfirm, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined } from '@ant-design/icons';
import type { IClass } from '@/models/Tenant/Class';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import type { ISubject } from '@/models/Tenant/Subject';
import type { ITenantUser } from '@/models/Tenant/User';

const { Title } = Typography;
const { Option } = Select;

interface ClassDataType extends Omit<IClass, 'academicYearId' | 'classTeacherId' | 'subjectsOffered'> {
  key: string;
  academicYearId: { _id: string; name: string } | string; // Populated or ID
  classTeacherId?: { _id: string; firstName?: string; lastName?: string; username: string } | string | null; // Populated or ID
  subjectsOffered?: ({ _id: string; name: string; code?:string } | string)[]; // Populated or ID array
}

interface ClassesPageProps {
  params: { schoolCode: string };
}

export default function ClassesPage({ params }: ClassesPageProps) {
  const { schoolCode } = params;
  const [classes, setClasses] = useState<ClassDataType[]>([]);
  const [academicYears, setAcademicYears] = useState<IAcademicYear[]>([]);
  const [subjects, setSubjects] = useState<ISubject[]>([]);
  const [teachers, setTeachers] = useState<ITenantUser[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassDataType | null>(null);
  const [form] = Form.useForm();

  const API_URL_BASE = `/api/${schoolCode}/portal/academics/classes`;
  const ACADEMIC_YEARS_API = `/api/${schoolCode}/portal/academics/academic-years`;
  const SUBJECTS_API = `/api/${schoolCode}/portal/academics/subjects`;
  const USERS_API = `/api/${schoolCode}/portal/users`; // To fetch teachers

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [classesRes, yearsRes, subjectsRes, usersRes] = await Promise.all([
        fetch(API_URL_BASE),
        fetch(ACADEMIC_YEARS_API),
        fetch(SUBJECTS_API),
        fetch(USERS_API)
      ]);

      if (!classesRes.ok) throw new Error((await classesRes.json()).error || 'Failed to fetch classes');
      if (!yearsRes.ok) throw new Error((await yearsRes.json()).error || 'Failed to fetch academic years');
      if (!subjectsRes.ok) throw new Error((await subjectsRes.json()).error || 'Failed to fetch subjects');
      if (!usersRes.ok) throw new Error((await usersRes.json()).error || 'Failed to fetch users');
      
      const classesData: IClass[] = await classesRes.json();
      const yearsData: IAcademicYear[] = await yearsRes.json();
      const subjectsData: ISubject[] = await subjectsRes.json();
      const usersData: ITenantUser[] = await usersRes.json();

      setClasses(classesData.map(cls => ({ ...cls, key: cls._id } as ClassDataType)));
      setAcademicYears(yearsData);
      setSubjects(subjectsData);
      setTeachers(usersData.filter(user => user.role === 'teacher' && user.isActive));

    } catch (error: any) {
      message.error(error.message || 'Could not load initial data.');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, API_URL_BASE, ACADEMIC_YEARS_API, SUBJECTS_API, USERS_API]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddClass = () => {
    setEditingClass(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditClass = (cls: ClassDataType) => {
    setEditingClass(cls);
    form.setFieldsValue({
      ...cls,
      academicYearId: typeof cls.academicYearId === 'object' ? cls.academicYearId._id : cls.academicYearId,
      classTeacherId: cls.classTeacherId && typeof cls.classTeacherId === 'object' ? cls.classTeacherId._id : cls.classTeacherId,
      subjectsOffered: cls.subjectsOffered?.map(sub => typeof sub === 'object' ? sub._id : sub) || [],
    });
    setIsModalVisible(true);
  };

  const handleDeleteClass = async (classId: string) => {
    try {
      const response = await fetch(`${API_URL_BASE}/${classId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete class');
      }
      message.success('Class deleted successfully');
      fetchData(); // Refetch all data
    } catch (error: any) {
      message.error(error.message || 'Could not delete class.');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values };
      
      const url = editingClass ? `${API_URL_BASE}/${editingClass._id}` : API_URL_BASE;
      const method = editingClass ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingClass ? 'update' : 'add'} class`);
      }

      message.success(`Class ${editingClass ? 'updated' : 'added'} successfully`);
      setIsModalVisible(false);
      fetchData(); // Refetch all data
    } catch (error: any) {
      message.error(error.message || `Could not ${editingClass ? 'update' : 'add'} class.`);
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a:ClassDataType, b:ClassDataType) => a.name.localeCompare(b.name) },
    { title: 'Level', dataIndex: 'level', key: 'level' },
    { title: 'Stream', dataIndex: 'stream', key: 'stream', render: (stream?: string) => stream || '-' },
    { 
      title: 'Academic Year', 
      dataIndex: 'academicYearId', 
      key: 'academicYearId', 
      render: (ay: ClassDataType['academicYearId']) => {
         if (!ay) return '-';
         return typeof ay === 'object' ? ay.name : (academicYears.find(y => y._id === ay)?.name || ay);
      },
      sorter: (a: ClassDataType, b: ClassDataType) => {
        const nameA = a.academicYearId && typeof a.academicYearId === 'object' ? a.academicYearId.name : (academicYears.find(y => y._id === a.academicYearId)?.name || '');
        const nameB = b.academicYearId && typeof b.academicYearId === 'object' ? b.academicYearId.name : (academicYears.find(y => y._id === b.academicYearId)?.name || '');
        return nameA.localeCompare(nameB);
      }
    },
    { 
      title: 'Class Teacher', 
      dataIndex: 'classTeacherId', 
      key: 'classTeacherId', 
      render: (teacher?: ClassDataType['classTeacherId']) => {
        if (!teacher) return '-';
        if (typeof teacher === 'object') {
          return `${teacher.firstName || ''} ${teacher.lastName || ''} (${teacher.username})`;
        }
        const foundTeacher = teachers.find(t => t._id === teacher);
        return foundTeacher ? `${foundTeacher.firstName || ''} ${foundTeacher.lastName || ''} (${foundTeacher.username})` : teacher;
      }
    },
    { 
      title: 'Subjects Offered', 
      dataIndex: 'subjectsOffered', 
      key: 'subjectsOffered', 
      render: (subs?: ClassDataType['subjectsOffered']) => {
        if (!subs || subs.length === 0) return '-';
        return subs.slice(0, 3).map(sub => { // Show max 3 tags for brevity
          const subjectDetails = typeof sub === 'object' ? sub : subjects.find(s => s._id === sub);
          const subjectName = subjectDetails ? subjectDetails.name : (typeof sub === 'string' ? sub : 'Unknown');
          return <Tag key={typeof sub === 'object' ? sub._id : sub}>{subjectName}</Tag>;
        });
      }
    },
    { title: 'Capacity', dataIndex: 'capacity', key: 'capacity', render: (capacity?: number) => capacity || '-' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ClassDataType) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEditClass(record)}>Edit</Button>
          <Popconfirm
            title="Delete this class?"
            description="This action cannot be undone. Ensure this class has no students enrolled."
            onConfirm={() => handleDeleteClass(record._id)}
            okText="Yes, Delete"
            cancelText="No"
          >
            <Button icon={<DeleteOutlined />} danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  
  if (loading) {
    return <div className="flex justify-center items-center h-full"><Spin size="large" /></div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={2}><TeamOutlined className="mr-2"/>Class Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddClass}>
          Add New Class
        </Button>
      </div>
      <Table columns={columns} dataSource={classes} rowKey="_id" />

      <Modal
        title={editingClass ? 'Edit Class' : 'Add New Class'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting}
        destroyOnClose
        width={700}
      >
        <Form form={form} layout="vertical" name="classForm" className="mt-4">
          <Form.Item name="name" label="Class Name" rules={[{ required: true, message: "E.g., 'Form 1A', 'Senior 5 Arts'" }]}>
            <Input placeholder="e.g., Form 1A" />
          </Form.Item>
          <Form.Item name="level" label="Level" rules={[{ required: true, message: "E.g., 'Form 1', 'Senior 5'" }]}>
            <Input placeholder="e.g., Form 1" />
          </Form.Item>
          <Form.Item name="stream" label="Stream (Optional)">
            <Input placeholder="e.g., A, Blue, Sciences" />
          </Form.Item>
          <Form.Item name="academicYearId" label="Academic Year" rules={[{ required: true }]}>
            <Select placeholder="Select academic year">
              {academicYears.map(year => <Option key={year._id} value={year._id}>{year.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="classTeacherId" label="Class Teacher (Optional)">
            <Select placeholder="Select class teacher" allowClear>
              {teachers.map(teacher => <Option key={teacher._id} value={teacher._id}>{`${teacher.firstName} ${teacher.lastName} (${teacher.username})`}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="subjectsOffered" label="Subjects Offered (Optional)">
            <Select mode="multiple" placeholder="Select subjects" allowClear>
              {subjects.map(subject => <Option key={subject._id} value={subject._id}>{subject.name} {subject.code ? `(${subject.code})` : ''}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="capacity" label="Capacity (Optional)">
            <InputNumber min={1} style={{width: "100%"}} placeholder="e.g. 40"/>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
