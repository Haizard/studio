
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Table, Modal, Form, Input, Select, Switch, message, Tag, Space, Spin, DatePicker, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, UserOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import Link from 'next/link';
import type { IStudent } from '@/models/Tenant/Student';
import type { ITenantUser } from '@/models/Tenant/User';
import type { IClass } from '@/models/Tenant/Class';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;

interface StudentDataType extends IStudent {
  key: string;
  userId: Partial<ITenantUser>; // Only parts of user needed for display
  currentClassId?: Partial<IClass>;
  currentAcademicYearId?: Partial<IAcademicYear>;
}

interface StudentsPageProps {
  params: { schoolCode: string };
}

export default function StudentsPage({ params }: StudentsPageProps) {
  const { schoolCode } = params;
  const [students, setStudents] = useState<StudentDataType[]>([]);
  const [academicYears, setAcademicYears] = useState<IAcademicYear[]>([]);
  const [classes, setClasses] = useState<IClass[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<IClass[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentDataType | null>(null);
  const [form] = Form.useForm();

  const API_URL_BASE = `/api/${schoolCode}/portal/students`;
  const ACADEMIC_YEARS_API = `/api/${schoolCode}/portal/academics/academic-years`;
  const CLASSES_API = `/api/${schoolCode}/portal/academics/classes`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsRes, yearsRes, classesRes] = await Promise.all([
        fetch(API_URL_BASE),
        fetch(ACADEMIC_YEARS_API),
        fetch(CLASSES_API)
      ]);

      if (!studentsRes.ok) throw new Error((await studentsRes.json()).error || 'Failed to fetch students');
      if (!yearsRes.ok) throw new Error((await yearsRes.json()).error || 'Failed to fetch academic years');
      if (!classesRes.ok) throw new Error((await classesRes.json()).error || 'Failed to fetch classes');
      
      const studentsData: IStudent[] = await studentsRes.json();
      const yearsData: IAcademicYear[] = await yearsRes.json();
      const classesData: IClass[] = await classesRes.json();

      setStudents(studentsData.map(std => ({ ...std, key: std._id } as StudentDataType)));
      setAcademicYears(yearsData.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
      setClasses(classesData);

    } catch (error: any) {
      message.error(error.message || 'Could not load initial data.');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, API_URL_BASE, ACADEMIC_YEARS_API, CLASSES_API]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAcademicYearChangeInModal = (yearId: string) => {
    const relatedClasses = classes.filter(cls => (typeof cls.academicYearId === 'object' ? (cls.academicYearId as any)._id : cls.academicYearId) === yearId);
    setFilteredClasses(relatedClasses);
    form.setFieldsValue({ currentClassId: undefined }); 
  };

  const handleAddStudent = () => {
    setEditingStudent(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, role: 'student' });
    setFilteredClasses([]);
    setIsModalVisible(true);
  };

  const handleEditStudent = (student: StudentDataType) => {
    setEditingStudent(student);
    const studentAYId = student.currentAcademicYearId?._id;
    if (studentAYId) {
        const relatedClasses = classes.filter(cls => (typeof cls.academicYearId === 'object' ? (cls.academicYearId as any)._id : cls.academicYearId) === studentAYId);
        setFilteredClasses(relatedClasses);
    } else {
        setFilteredClasses([]);
    }

    form.setFieldsValue({
      ...student,
      firstName: student.userId.firstName,
      lastName: student.userId.lastName,
      username: student.userId.username,
      email: student.userId.email,
      isActive: student.userId.isActive,
      admissionDate: student.admissionDate ? moment(student.admissionDate) : undefined,
      dateOfBirth: student.dateOfBirth ? moment(student.dateOfBirth) : undefined,
      currentClassId: student.currentClassId?._id,
      currentAcademicYearId: student.currentAcademicYearId?._id,
      // Password is not pre-filled
    });
    setIsModalVisible(true);
  };

  const handleDeactivateStudent = async (studentProfileId: string, currentStatus: boolean) => {
     try {
      const response = await fetch(`${API_URL_BASE}/${studentProfileId}`, { 
        method: 'DELETE', // In our API, DELETE means deactivate/soft-delete
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }) // Send the new desired status if API supports it directly, otherwise API handles toggling
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${currentStatus ? 'deactivate' : 'activate'} student`);
      }
      message.success(`Student ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      fetchData();
    } catch (error: any) {
      message.error(error.message || `Could not ${currentStatus ? 'deactivate' : 'activate'} student.`);
    }
  };


  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      let payload: any = { 
        ...values,
        admissionDate: values.admissionDate ? values.admissionDate.toISOString() : undefined,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.toISOString() : undefined,
      };
      
      const url = editingStudent ? `${API_URL_BASE}/${editingStudent._id}` : API_URL_BASE;
      const method = editingStudent ? 'PUT' : 'POST';

      if (editingStudent) {
        payload.userId = editingStudent.userId._id; // Pass existing TenantUser ID for PUT
        if (!values.password) { // If editing and password is empty, don't send it
            delete payload.password;
        }
      } else { // For POST (new student)
         if (!values.password) {
            message.error('Password is required for new students.');
            return;
         }
         payload.role = 'student'; // Ensure role is student for new user
      }


      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingStudent ? 'update' : 'add'} student`);
      }

      message.success(`Student ${editingStudent ? 'updated' : 'added'} successfully`);
      setIsModalVisible(false);
      fetchData();
    } catch (error: any)
{
      message.error(error.message || `Could not ${editingStudent ? 'update' : 'add'} student.`);
    }
  };

  const columns = [
    { title: 'Student ID', dataIndex: 'studentIdNumber', key: 'studentIdNumber' },
    { title: 'Full Name', key: 'fullName', render: (_:any, record: StudentDataType) => `${record.userId.firstName} ${record.userId.lastName}` },
    { title: 'Username', key: 'username', render: (_:any, record: StudentDataType) => record.userId.username },
    { title: 'Email', key: 'email', render: (_:any, record: StudentDataType) => record.userId.email },
    { title: 'Class', key: 'class', render: (_:any, record: StudentDataType) => record.currentClassId?.name || '-' },
    { title: 'Academic Year', key: 'academicYear', render: (_:any, record: StudentDataType) => record.currentAcademicYearId?.name || '-' },
    { title: 'Status', key: 'isActive', render: (_:any, record: StudentDataType) => <Tag color={record.userId.isActive ? 'green' : 'red'}>{record.userId.isActive ? 'Active' : 'Inactive'}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: StudentDataType) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEditStudent(record)}>Edit</Button>
          <Link href={`/${schoolCode}/portal/student/my-profile?studentId=${record._id}`} target="_blank">
            <Button icon={<EyeOutlined />}>View Profile</Button>
          </Link>
          <Button 
            icon={<DeleteOutlined />} 
            danger={record.userId.isActive} 
            onClick={() => handleDeactivateStudent(record._id, record.userId.isActive ?? false)}
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
        <Title level={2}><UserOutlined className="mr-2"/>Student Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddStudent}>
          Add New Student
        </Button>
      </div>
      <Table columns={columns} dataSource={students} rowKey="_id" scroll={{ x: 1200 }} />

      <Modal
        title={editingStudent ? 'Edit Student' : 'Add New Student'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting}
        destroyOnClose
        width={800}
      >
        <Form form={form} layout="vertical" name="studentForm" className="mt-4">
          <Title level={4} className="mb-4">User Account Details</Title>
          <Row gutter={16}>
            <Col xs={24} sm={12}><Form.Item name="firstName" label="First Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="username" label="Username" rules={[{ required: true }]}><Input disabled={!!editingStudent} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input type="email" disabled={!!editingStudent} /></Form.Item></Col>
            <Col xs={24} sm={12}>
              <Form.Item 
                name="password" 
                label={editingStudent ? "New Password (Optional)" : "Password"}
                rules={editingStudent ? [] : [{ required: true, message: 'Password is required for new users!' }]}
                help={editingStudent ? "Leave blank to keep current password." : ""}
              >
                <Input.Password />
              </Form.Item>
            </Col>
             <Col xs={24} sm={12}><Form.Item name="isActive" label="User Account Active" valuePropName="checked"><Switch checkedChildren="Active" unCheckedChildren="Inactive" /></Form.Item></Col>
          </Row>
          
          <Title level={4} className="my-4 pt-4 border-t">Student Profile Details</Title>
          <Row gutter={16}>
            <Col xs={24} sm={12}><Form.Item name="studentIdNumber" label="Student ID Number" rules={[{ required: true }]}><Input disabled={!!editingStudent && !!editingStudent.studentIdNumber} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="admissionDate" label="Admission Date" rules={[{ required: true }]}><DatePicker style={{width: "100%"}} format="YYYY-MM-DD"/></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="dateOfBirth" label="Date of Birth" rules={[{ required: true }]}><DatePicker style={{width: "100%"}} format="YYYY-MM-DD"/></Form.Item></Col>
            <Col xs={24} sm={12}>
              <Form.Item name="gender" label="Gender" rules={[{ required: true }]}>
                <Select placeholder="Select gender">
                  <Option value="Male">Male</Option>
                  <Option value="Female">Female</Option>
                  <Option value="Other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Title level={4} className="my-4 pt-4 border-t">Academic Details</Title>
           <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="currentAcademicYearId" label="Current Academic Year" rules={[{ required: true }]}>
                <Select placeholder="Select academic year" onChange={handleAcademicYearChangeInModal} allowClear>
                  {academicYears.map(year => <Option key={year._id} value={year._id}>{year.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="currentClassId" label="Current Class (Optional)">
                <Select placeholder="Select class" allowClear disabled={!form.getFieldValue('currentAcademicYearId') || filteredClasses.length === 0}>
                  {filteredClasses.map(cls => <Option key={cls._id} value={cls._id}>{cls.name} {cls.level ? `(${cls.level})` : ''}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          {/* More academic details like A-Level Combination, O-Level Subjects can be added later */}
        </Form>
      </Modal>
    </div>
  );
}

    