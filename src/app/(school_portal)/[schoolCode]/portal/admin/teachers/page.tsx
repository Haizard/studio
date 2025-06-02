
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Table, Modal, Form, Input, Select, Switch, message, Tag, Space, Spin, DatePicker, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, UserOutlined, DeleteOutlined, SolutionOutlined } from '@ant-design/icons';
// import Link from 'next/link'; // For future "View Details" page
import type { ITeacher } from '@/models/Tenant/Teacher';
import type { ITenantUser } from '@/models/Tenant/User';
import type { IClass } from '@/models/Tenant/Class';
import type { ISubject } from '@/models/Tenant/Subject';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;

interface TeacherDataType extends ITeacher {
  key: string;
  userId: Partial<ITenantUser>;
  isClassTeacherOf?: Partial<IClass>;
}

interface TeachersPageProps {
  params: { schoolCode: string };
}

export default function TeachersPage({ params }: TeachersPageProps) {
  const { schoolCode } = params;
  const [teachers, setTeachers] = useState<TeacherDataType[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherDataType | null>(null);
  const [form] = Form.useForm();

  // Data for assignment select dropdowns (simplified for now, ideally fetched dynamically based on AY)
  // const [academicYears, setAcademicYears] = useState<IAcademicYear[]>([]);
  // const [classes, setClasses] = useState<IClass[]>([]);
  // const [subjects, setSubjects] = useState<ISubject[]>([]);

  const API_URL_BASE = `/api/${schoolCode}/portal/teachers`;
  // const ACADEMIC_YEARS_API = `/api/${schoolCode}/portal/academics/academic-years`;
  // const CLASSES_API = `/api/${schoolCode}/portal/academics/classes`;
  // const SUBJECTS_API = `/api/${schoolCode}/portal/academics/subjects`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch teachers and other necessary data in parallel if needed
      const teachersRes = await fetch(API_URL_BASE);
      if (!teachersRes.ok) throw new Error((await teachersRes.json()).error || 'Failed to fetch teachers');
      const teachersData: ITeacher[] = await teachersRes.json();
      setTeachers(teachersData.map(t => ({ ...t, key: t._id } as TeacherDataType)));

      // Example: Fetch data for select dropdowns (can be optimized)
      // const [yearsRes, classesRes, subjectsRes] = await Promise.all([
      //   fetch(ACADEMIC_YEARS_API),
      //   fetch(CLASSES_API),
      //   fetch(SUBJECTS_API)
      // ]);
      // if (!yearsRes.ok) throw new Error('Failed to fetch academic years');
      // if (!classesRes.ok) throw new Error('Failed to fetch classes');
      // if (!subjectsRes.ok) throw new Error('Failed to fetch subjects');
      // setAcademicYears(await yearsRes.json());
      // setClasses(await classesRes.json());
      // setSubjects(await subjectsRes.json());

    } catch (error: any) {
      message.error(error.message || 'Could not load initial data.');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, API_URL_BASE]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddTeacher = () => {
    setEditingTeacher(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, role: 'teacher', qualifications: [], assignedClassesAndSubjects: [] });
    setIsModalVisible(true);
  };

  const handleEditTeacher = (teacher: TeacherDataType) => {
    setEditingTeacher(teacher);
    form.setFieldsValue({
      ...teacher,
      firstName: teacher.userId.firstName,
      lastName: teacher.userId.lastName,
      username: teacher.userId.username,
      email: teacher.userId.email,
      isActive: teacher.userId.isActive,
      dateOfJoining: teacher.dateOfJoining ? moment(teacher.dateOfJoining) : undefined,
      qualifications: teacher.qualifications || [],
      assignedClassesAndSubjects: teacher.assignedClassesAndSubjects || [], // For display, actual management might be more complex
      isClassTeacherOf: teacher.isClassTeacherOf?._id,
    });
    setIsModalVisible(true);
  };
  
  const handleDeactivateTeacher = async (teacherProfileId: string, currentStatus: boolean) => {
     try {
      const response = await fetch(`${API_URL_BASE}/${teacherProfileId}`, { 
        method: 'DELETE', // API handles this as deactivation/activation
        headers: { 'Content-Type': 'application/json' },
        // body: JSON.stringify({ isActive: !currentStatus }) // API should infer from current state or handle idempotent DELETE
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${currentStatus ? 'deactivate' : 'activate'} teacher`);
      }
      message.success(`Teacher ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      fetchData();
    } catch (error: any) {
      message.error(error.message || `Could not ${currentStatus ? 'deactivate' : 'activate'} teacher.`);
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      let payload: any = { 
        ...values,
        dateOfJoining: values.dateOfJoining ? values.dateOfJoining.toISOString() : undefined,
        qualifications: Array.isArray(values.qualifications) ? values.qualifications : (values.qualifications ? (values.qualifications as string).split(',').map(q => q.trim()) : []),
        // assignedClassesAndSubjects: For now, not directly editable in this simple modal. API handles full array.
      };
      
      const url = editingTeacher ? `${API_URL_BASE}/${editingTeacher._id}` : API_URL_BASE;
      const method = editingTeacher ? 'PUT' : 'POST';

      if (editingTeacher) {
        payload.userId = editingTeacher.userId._id;
        if (!values.password) {
            delete payload.password;
        }
      } else {
         if (!values.password) {
            message.error('Password is required for new teachers.');
            return;
         }
         payload.role = 'teacher';
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingTeacher ? 'update' : 'add'} teacher`);
      }

      message.success(`Teacher ${editingTeacher ? 'updated' : 'added'} successfully`);
      setIsModalVisible(false);
      fetchData();
    } catch (error: any) {
      message.error(error.message || `Could not ${editingTeacher ? 'update' : 'add'} teacher.`);
    }
  };

  const columns = [
    { title: 'Teacher ID', dataIndex: 'teacherIdNumber', key: 'teacherIdNumber', render: (id?: string) => id || '-' },
    { title: 'Full Name', key: 'fullName', render: (_:any, record: TeacherDataType) => `${record.userId.firstName} ${record.userId.lastName}` },
    { title: 'Username', key: 'username', render: (_:any, record: TeacherDataType) => record.userId.username },
    { title: 'Email', key: 'email', render: (_:any, record: TeacherDataType) => record.userId.email },
    { title: 'Specialization', dataIndex: 'specialization', key: 'specialization', render: (spec?: string) => spec || '-' },
    { title: 'Status', key: 'isActive', render: (_:any, record: TeacherDataType) => <Tag color={record.userId.isActive ? 'green' : 'red'}>{record.userId.isActive ? 'Active' : 'Inactive'}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: TeacherDataType) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEditTeacher(record)}>Edit</Button>
          {/* <Link href={`/${schoolCode}/portal/teacher/${record._id}/details`}> // Future details page
            <Button icon={<SolutionOutlined />}>View Details</Button>
          </Link> */}
          <Button 
            icon={<DeleteOutlined />} 
            danger={record.userId.isActive} 
            onClick={() => handleDeactivateTeacher(record._id, record.userId.isActive ?? false)}
          >
            {record.userId.isActive ? 'Deactivate' : 'Activate'}
          </Button>
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
        <Title level={2}><UserOutlined className="mr-2"/>Teacher Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTeacher}>
          Add New Teacher
        </Button>
      </div>
      <Table columns={columns} dataSource={teachers} rowKey="_id" scroll={{ x: 1200 }} />

      <Modal
        title={editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting}
        destroyOnClose
        width={800}
      >
        <Form form={form} layout="vertical" name="teacherForm" className="mt-4">
          <Title level={4} className="mb-4">User Account Details</Title>
          <Row gutter={16}>
            <Col xs={24} sm={12}><Form.Item name="firstName" label="First Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="username" label="Username" rules={[{ required: true }]}><Input disabled={!!editingTeacher} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input type="email" disabled={!!editingTeacher} /></Form.Item></Col>
            <Col xs={24} sm={12}>
              <Form.Item 
                name="password" 
                label={editingTeacher ? "New Password (Optional)" : "Password"}
                rules={editingTeacher ? [] : [{ required: true, message: 'Password is required for new users!' }]}
                help={editingTeacher ? "Leave blank to keep current password." : ""}
              >
                <Input.Password />
              </Form.Item>
            </Col>
             <Col xs={24} sm={12}><Form.Item name="isActive" label="User Account Active" valuePropName="checked"><Switch checkedChildren="Active" unCheckedChildren="Inactive" /></Form.Item></Col>
          </Row>
          
          <Title level={4} className="my-4 pt-4 border-t">Teacher Profile Details</Title>
          <Row gutter={16}>
            <Col xs={24} sm={8}><Form.Item name="teacherIdNumber" label="Teacher ID Number (Optional)"><Input /></Form.Item></Col>
            <Col xs={24} sm={8}><Form.Item name="dateOfJoining" label="Date of Joining" rules={[{ required: true }]}><DatePicker style={{width: "100%"}} format="YYYY-MM-DD"/></Form.Item></Col>
            <Col xs={24} sm={8}><Form.Item name="specialization" label="Specialization (Optional)"><Input placeholder="e.g., Mathematics, Physics" /></Form.Item></Col>
            <Col xs={24}>
              <Form.Item name="qualifications" label="Qualifications (Optional)">
                <Select mode="tags" style={{ width: '100%' }} tokenSeparators={[',']} placeholder="e.g. BSc. Education, M.Ed" />
              </Form.Item>
            </Col>
          </Row>

          {/* Placeholder for assignedClassesAndSubjects - complex UI for later iteration */}
          {/* {editingTeacher && editingTeacher.assignedClassesAndSubjects && editingTeacher.assignedClassesAndSubjects.length > 0 && (
            <>
              <Title level={4} className="my-4 pt-4 border-t">Current Assignments</Title>
              <List
                size="small"
                bordered
                dataSource={editingTeacher.assignedClassesAndSubjects}
                renderItem={item => (
                  <List.Item>
                    {`AY: ${item.academicYearId.name} - Class: ${item.classId.name} - Subject: ${item.subjectId.name}`}
                  </List.Item>
                )}
              />
            </>
          )} */}
        </Form>
      </Modal>
    </div>
  );
}
