
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Table, Modal, Form, Input, DatePicker, Select, message, Tag, Space, Spin, Popconfirm, Row, Col, InputNumber, Breadcrumb } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReadOutlined, ClockCircleOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { IAssessment } from '@/models/Tenant/Assessment';
import type { IExam } from '@/models/Tenant/Exam';
import type { ISubject } from '@/models/Tenant/Subject';
import type { IClass } from '@/models/Tenant/Class';
import type { ITenantUser } from '@/models/Tenant/User';
import moment from 'moment';
import mongoose from 'mongoose';


const { Title } = Typography;
const { Option } = Select;

interface AssessmentDataType extends Omit<IAssessment, 'subjectId' | 'classId' | 'invigilatorId'> {
  key: string;
  _id: string;
  subjectId: { _id: string; name: string; code?: string } | string;
  classId: { _id: string; name: string; level?: string } | string;
  invigilatorId?: { _id: string; firstName?: string; lastName?: string; username: string } | string | null;
  assessmentDate: moment.Moment;
}

export default function AssessmentsPage() {
  const params = useParams();
  const router = useRouter();
  const schoolCode = params.schoolCode as string;
  const examId = params.examId as string;

  const [examDetails, setExamDetails] = useState<IExam | null>(null);
  const [assessments, setAssessments] = useState<AssessmentDataType[]>([]);
  const [subjects, setSubjects] = useState<ISubject[]>([]);
  const [classes, setClasses] = useState<IClass[]>([]); // Will be filtered by exam's academic year
  const [teachers, setTeachers] = useState<ITenantUser[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<AssessmentDataType | null>(null);
  const [form] = Form.useForm();

  const API_URL_BASE = `/api/${schoolCode}/portal/exams/${examId}/assessments`;
  const EXAM_API_URL = `/api/${schoolCode}/portal/exams/${examId}`;
  const SUBJECTS_API = `/api/${schoolCode}/portal/academics/subjects`;
  const CLASSES_API_BASE = `/api/${schoolCode}/portal/academics/classes`; // Base URL for classes
  const USERS_API = `/api/${schoolCode}/portal/users`; 

  const fetchData = useCallback(async () => {
    if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
      message.error("Invalid Exam ID provided.");
      router.push(`/${schoolCode}/portal/admin/exams`);
      return;
    }
    setLoading(true);
    try {
      const examRes = await fetch(EXAM_API_URL);
      if (!examRes.ok) throw new Error((await examRes.json()).error || 'Failed to fetch exam details');
      const examData: IExam = await examRes.json();
      setExamDetails(examData);
      
      const examAcademicYearId = typeof examData.academicYearId === 'object' ? (examData.academicYearId as any)._id : examData.academicYearId;

      const [assessmentsRes, subjectsRes, classesRes, usersRes] = await Promise.all([
        fetch(API_URL_BASE),
        fetch(SUBJECTS_API),
        fetch(`${CLASSES_API_BASE}?academicYearId=${examAcademicYearId}`), // Fetch classes filtered by exam's academic year
        fetch(USERS_API)
      ]);

      if (!assessmentsRes.ok) throw new Error((await assessmentsRes.json()).error || 'Failed to fetch assessments');
      if (!subjectsRes.ok) throw new Error((await subjectsRes.json()).error || 'Failed to fetch subjects');
      if (!classesRes.ok) throw new Error((await classesRes.json()).error || 'Failed to fetch classes for the exam year');
      if (!usersRes.ok) throw new Error((await usersRes.json()).error || 'Failed to fetch users');
      
      const assessmentsData: IAssessment[] = await assessmentsRes.json();
      const subjectsData: ISubject[] = await subjectsRes.json();
      const classesData: IClass[] = await classesRes.json();
      const usersData: ITenantUser[] = await usersRes.json();

      setAssessments(assessmentsData.map(asm => ({ 
        ...asm, 
        key: asm._id,
        _id: asm._id,
        subjectId: asm.subjectId as any,
        classId: asm.classId as any,
        invigilatorId: asm.invigilatorId as any,
        assessmentDate: moment(asm.assessmentDate),
      })));
      setSubjects(subjectsData);
      setClasses(classesData); // These are now pre-filtered
      setTeachers(usersData.filter(user => user.role === 'teacher' && user.isActive));

    } catch (error: any) {
      message.error(error.message || 'Could not load initial data.');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, examId, API_URL_BASE, EXAM_API_URL, SUBJECTS_API, CLASSES_API_BASE, USERS_API, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddAssessment = () => {
    setEditingAssessment(null);
    form.resetFields();
    form.setFieldsValue({ assessmentDate: moment(), maxMarks: 100, isGraded: false });
    setIsModalVisible(true);
  };

  const handleEditAssessment = (asm: AssessmentDataType) => {
    setEditingAssessment(asm);
    form.setFieldsValue({
      ...asm,
      subjectId: typeof asm.subjectId === 'object' ? asm.subjectId._id : asm.subjectId,
      classId: typeof asm.classId === 'object' ? asm.classId._id : asm.classId,
      invigilatorId: asm.invigilatorId && typeof asm.invigilatorId === 'object' ? asm.invigilatorId._id : asm.invigilatorId,
      assessmentDate: asm.assessmentDate ? moment(asm.assessmentDate) : undefined,
    });
    setIsModalVisible(true);
  };

  const handleDeleteAssessment = async (assessmentIdToDelete: string) => {
    try {
      const response = await fetch(`${API_URL_BASE}/${assessmentIdToDelete}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete assessment');
      }
      message.success('Assessment deleted successfully');
      fetchData();
    } catch (error: any) {
      message.error(error.message || 'Could not delete assessment.');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = { 
        ...values,
        assessmentDate: values.assessmentDate ? values.assessmentDate.toISOString() : undefined,
      };
      
      const url = editingAssessment ? `${API_URL_BASE}/${editingAssessment._id}` : API_URL_BASE;
      const method = editingAssessment ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingAssessment ? 'update' : 'add'} assessment`);
      }

      message.success(`Assessment ${editingAssessment ? 'updated' : 'added'} successfully`);
      setIsModalVisible(false);
      fetchData();
    } catch (error: any) {
      message.error(error.message || `Could not ${editingAssessment ? 'update' : 'add'} assessment.`);
    }
  };

  const columns = [
    { title: 'Assessment Name', dataIndex: 'assessmentName', key: 'assessmentName', sorter: (a:AssessmentDataType, b:AssessmentDataType) => a.assessmentName.localeCompare(b.assessmentName)},
    { 
      title: 'Subject', 
      dataIndex: 'subjectId', 
      key: 'subjectId', 
      render: (sub: AssessmentDataType['subjectId']) => typeof sub === 'object' ? `${sub.name} ${sub.code ? `(${sub.code})` : ''}` : (subjects.find(s => s._id === sub)?.name || sub),
      sorter: (a: AssessmentDataType, b: AssessmentDataType) => {
        const nameA = typeof a.subjectId === 'object' ? a.subjectId.name : (subjects.find(s => s._id === a.subjectId)?.name || '');
        const nameB = typeof b.subjectId === 'object' ? b.subjectId.name : (subjects.find(s => s._id === b.subjectId)?.name || '');
        return nameA.localeCompare(nameB);
      }
    },
    { 
      title: 'Class', 
      dataIndex: 'classId', 
      key: 'classId', 
      render: (cls: AssessmentDataType['classId']) => typeof cls === 'object' ? `${cls.name} ${cls.level ? `(${cls.level})` : ''}` : (classes.find(c => c._id === cls)?.name || cls),
       sorter: (a: AssessmentDataType, b: AssessmentDataType) => {
        const nameA = typeof a.classId === 'object' ? a.classId.name : (classes.find(c => c._id === a.classId)?.name || '');
        const nameB = typeof b.classId === 'object' ? b.classId.name : (classes.find(c => c._id === b.classId)?.name || '');
        return nameA.localeCompare(nameB);
      }
    },
    { title: 'Type', dataIndex: 'assessmentType', key: 'assessmentType' },
    { title: 'Max Marks', dataIndex: 'maxMarks', key: 'maxMarks' },
    { title: 'Date', dataIndex: 'assessmentDate', key: 'assessmentDate', render: (date: moment.Moment) => date ? date.format('YYYY-MM-DD') : '-', sorter: (a: AssessmentDataType, b: AssessmentDataType) => moment(a.assessmentDate).unix() - moment(b.assessmentDate).unix()},
    { title: 'Time', dataIndex: 'assessmentTime', key: 'assessmentTime', render: (time?:string) => time || '-' },
    { title: 'Graded', dataIndex: 'isGraded', key: 'isGraded', render: (isGraded:boolean) => <Tag color={isGraded ? 'green' : 'orange'}>{isGraded ? 'Yes' : 'No'}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: AssessmentDataType) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEditAssessment(record)}>Edit</Button>
          <Popconfirm
            title="Delete this assessment?"
            description="This action cannot be undone. Any entered marks will also be lost."
            onConfirm={() => handleDeleteAssessment(record._id)}
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
    { title: <Link href={`/${schoolCode}/portal/admin/exams`}>Exams</Link> },
    { title: examDetails ? `Assessments for ${examDetails.name}` : 'Loading Exam...' },
  ];
  
  if (loading && !examDetails) { 
    return <div className="flex justify-center items-center h-full"><Spin size="large" tip="Loading exam details..." /></div>;
  }

  if (!examDetails) {
    return <div className="text-center p-8"><Title level={3} type="danger">Exam details could not be loaded.</Title><Button onClick={() => router.back()}>Go Back</Button></div>
  }

  return (
    <div>
      <Breadcrumb items={breadcrumbItems} className="mb-6" />
      <div className="flex justify-between items-center mb-6">
        <Title level={2}><ReadOutlined className="mr-2"/>Assessments for: {examDetails.name}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddAssessment}>
          Add New Assessment
        </Button>
      </div>
      <Spin spinning={loading}> 
        <Table columns={columns} dataSource={assessments} rowKey="_id" />
      </Spin>

      <Modal
        title={editingAssessment ? 'Edit Assessment' : 'Add New Assessment'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting}
        destroyOnClose
        width={800}
      >
        <Form form={form} layout="vertical" name="assessmentForm" className="mt-4">
          <Row gutter={16}>
            <Col xs={24} sm={12}>
                <Form.Item name="assessmentName" label="Assessment Name" rules={[{ required: true, message: "E.g., 'Paper 1', 'Practical Test'" }]}>
                    <Input placeholder="e.g., Paper 1" />
                </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
                 <Form.Item name="assessmentType" label="Assessment Type" rules={[{ required: true }]}>
                    <Input placeholder="e.g., Theory, Practical, Quiz" />
                </Form.Item>
            </Col>
             <Col xs={24} sm={12}>
                <Form.Item name="subjectId" label="Subject" rules={[{ required: true }]}>
                    <Select placeholder="Select subject">
                    {subjects.map(subject => <Option key={subject._id} value={subject._id}>{subject.name} {subject.code ? `(${subject.code})` : ''}</Option>)}
                    </Select>
                </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
                 <Form.Item name="classId" label="Class" rules={[{ required: true }]}>
                    <Select placeholder="Select class (filtered by exam's academic year)">
                    {classes.map(cls => <Option key={cls._id} value={cls._id}>{cls.name} {cls.level ? `(${cls.level})` : ''}</Option>)}
                    </Select>
                </Form.Item>
            </Col>
             <Col xs={24} sm={8}>
                <Form.Item name="maxMarks" label="Max Marks" rules={[{ required: true, type: 'number', min: 1 }]}>
                    <InputNumber min={1} style={{width: "100%"}} placeholder="e.g., 100" />
                </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
                 <Form.Item name="assessmentDate" label="Assessment Date" rules={[{ required: true }]}>
                    <DatePicker style={{width: "100%"}} format="YYYY-MM-DD"/>
                </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
                <Form.Item name="assessmentTime" label="Assessment Time (Optional)">
                    <Input prefix={<ClockCircleOutlined />} placeholder="e.g., 09:00 AM - 11:00 AM" />
                </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
                <Form.Item name="invigilatorId" label="Invigilator (Optional)">
                    <Select placeholder="Select invigilator" allowClear>
                    {teachers.map(teacher => <Option key={teacher._id} value={teacher._id}>{`${teacher.firstName} ${teacher.lastName} (${teacher.username})`}</Option>)}
                    </Select>
                </Form.Item>
            </Col>
             <Col xs={24} sm={12}>
                <Form.Item name="isGraded" label="Is Graded?" valuePropName="checked">
                    <Switch checkedChildren="Yes" unCheckedChildren="No" />
                </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
