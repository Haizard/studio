
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Table, Modal, Form, Input, DatePicker, Select, message, Tag, Space, Spin, Popconfirm, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FileTextOutlined, ReadOutlined } from '@ant-design/icons';
import Link from 'next/link';
import type { IExam, ExamStatus } from '@/models/Tenant/Exam';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import type { ITerm } from '@/models/Tenant/Term';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;

const examStatuses: ExamStatus[] = ['Scheduled', 'Ongoing', 'Completed', 'Grading', 'Published', 'Cancelled'];

interface ExamDataType extends Omit<IExam, 'academicYearId' | 'termId'> {
  key: string;
  academicYearId: { _id: string; name: string } | string;
  termId?: { _id: string; name: string } | string | null;
  startDate: moment.Moment;
  endDate: moment.Moment;
}

interface ExamsPageProps {
  params: { schoolCode: string };
}

export default function ExamsPage({ params }: ExamsPageProps) {
  const { schoolCode } = params;
  const [exams, setExams] = useState<ExamDataType[]>([]);
  const [academicYears, setAcademicYears] = useState<IAcademicYear[]>([]);
  const [terms, setTerms] = useState<ITerm[]>([]);
  const [filteredTerms, setFilteredTerms] = useState<ITerm[]>([]);

  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamDataType | null>(null);
  const [form] = Form.useForm();

  const API_URL_BASE = `/api/${schoolCode}/portal/exams`;
  const ACADEMIC_YEARS_API = `/api/${schoolCode}/portal/academics/academic-years`;
  const TERMS_API = `/api/${schoolCode}/portal/academics/terms`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [examsRes, yearsRes, termsRes] = await Promise.all([
        fetch(API_URL_BASE),
        fetch(ACADEMIC_YEARS_API),
        fetch(TERMS_API), // Fetch all terms initially
      ]);

      if (!examsRes.ok) throw new Error((await examsRes.json()).error || 'Failed to fetch exams');
      if (!yearsRes.ok) throw new Error((await yearsRes.json()).error || 'Failed to fetch academic years');
      if (!termsRes.ok) throw new Error((await termsRes.json()).error || 'Failed to fetch terms');
      
      const examsData: IExam[] = await examsRes.json();
      const yearsData: IAcademicYear[] = await yearsRes.json();
      const termsData: ITerm[] = await termsRes.json();

      setExams(examsData.map(exam => ({ 
        ...exam, 
        key: exam._id,
        academicYearId: exam.academicYearId as any,
        termId: exam.termId as any,
        startDate: moment(exam.startDate),
        endDate: moment(exam.endDate),
      })));
      setAcademicYears(yearsData);
      setTerms(termsData); // Store all terms

    } catch (error: any) {
      message.error(error.message || 'Could not load initial data.');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, API_URL_BASE, ACADEMIC_YEARS_API, TERMS_API]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAcademicYearChange = (yearId: string) => {
    const relatedTerms = terms.filter(term => (typeof term.academicYearId === 'object' ? term.academicYearId._id : term.academicYearId) === yearId);
    setFilteredTerms(relatedTerms);
    form.setFieldsValue({ termId: undefined }); // Reset term when AY changes
  };

  const handleAddExam = () => {
    setEditingExam(null);
    form.resetFields();
    setFilteredTerms([]);
    form.setFieldsValue({ status: 'Scheduled' });
    setIsModalVisible(true);
  };

  const handleEditExam = (exam: ExamDataType) => {
    setEditingExam(exam);
    const ayId = typeof exam.academicYearId === 'object' ? exam.academicYearId._id : exam.academicYearId;
    if (ayId) {
        const relatedTerms = terms.filter(term => (typeof term.academicYearId === 'object' ? term.academicYearId._id : term.academicYearId) === ayId);
        setFilteredTerms(relatedTerms);
    } else {
        setFilteredTerms([]);
    }
    
    form.setFieldsValue({
      ...exam,
      academicYearId: ayId,
      termId: exam.termId && typeof exam.termId === 'object' ? exam.termId._id : exam.termId,
      startDate: exam.startDate ? moment(exam.startDate) : undefined,
      endDate: exam.endDate ? moment(exam.endDate) : undefined,
    });
    setIsModalVisible(true);
  };

  const handleDeleteExam = async (examId: string) => {
    try {
      // TODO: Check if exam has assessments before deleting
      const response = await fetch(`${API_URL_BASE}/${examId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete exam');
      }
      message.success('Exam deleted successfully');
      fetchData();
    } catch (error: any) {
      message.error(error.message || 'Could not delete exam.');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = { 
        ...values,
        startDate: values.startDate ? values.startDate.toISOString() : undefined,
        endDate: values.endDate ? values.endDate.toISOString() : undefined,
      };
      
      const url = editingExam ? `${API_URL_BASE}/${editingExam._id}` : API_URL_BASE;
      const method = editingExam ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingExam ? 'update' : 'add'} exam`);
      }

      message.success(`Exam ${editingExam ? 'updated' : 'added'} successfully`);
      setIsModalVisible(false);
      fetchData();
    } catch (error: any) {
      message.error(error.message || `Could not ${editingExam ? 'update' : 'add'} exam.`);
    }
  };

  const columns = [
    { title: 'Exam Name', dataIndex: 'name', key: 'name', sorter: (a:ExamDataType, b:ExamDataType) => a.name.localeCompare(b.name) },
    { 
      title: 'Academic Year', 
      dataIndex: 'academicYearId', 
      key: 'academicYearId', 
      render: (ay: ExamDataType['academicYearId']) => typeof ay === 'object' ? ay.name : (academicYears.find(y => y._id === ay)?.name || ay)
    },
    { 
      title: 'Term', 
      dataIndex: 'termId', 
      key: 'termId', 
      render: (term?: ExamDataType['termId']) => {
        if (!term) return '-';
        return typeof term === 'object' ? term.name : (terms.find(t => t._id === term)?.name || term);
      }
    },
    { title: 'Start Date', dataIndex: 'startDate', key: 'startDate', render: (date: moment.Moment) => date ? date.format('YYYY-MM-DD') : '-' },
    { title: 'End Date', dataIndex: 'endDate', key: 'endDate', render: (date: moment.Moment) => date ? date.format('YYYY-MM-DD') : '-' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: ExamStatus) => <Tag>{status}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ExamDataType) => (
        <Space>
          <Link href={`/${schoolCode}/portal/admin/exams/${record._id}/assessments`}>
            <Button icon={<ReadOutlined />}>Assessments</Button>
          </Link>
          <Button icon={<EditOutlined />} onClick={() => handleEditExam(record)}>Edit</Button>
          <Popconfirm
            title="Delete this exam?"
            description="This action cannot be undone. Associated assessments will also be affected."
            onConfirm={() => handleDeleteExam(record._id)}
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
        <Title level={2}><FileTextOutlined className="mr-2"/>Exam Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddExam}>
          Add New Exam
        </Button>
      </div>
      <Table columns={columns} dataSource={exams} rowKey="_id" />

      <Modal
        title={editingExam ? 'Edit Exam' : 'Add New Exam'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting}
        destroyOnClose
        width={700}
      >
        <Form form={form} layout="vertical" name="examForm" className="mt-4">
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="name" label="Exam Name" rules={[{ required: true, message: "E.g., 'Mid Term Exams 2024'" }]}>
                <Input placeholder="e.g., Mid Term Exams 2024" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="academicYearId" label="Academic Year" rules={[{ required: true }]}>
                <Select placeholder="Select academic year" onChange={handleAcademicYearChange}>
                  {academicYears.map(year => <Option key={year._id} value={year._id}>{year.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="termId" label="Term (Optional)">
                <Select placeholder="Select term" allowClear disabled={!form.getFieldValue('academicYearId')}>
                  {filteredTerms.map(term => <Option key={term._id} value={term._id}>{term.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="startDate" label="Start Date" rules={[{ required: true }]}>
                <DatePicker style={{width: "100%"}} format="YYYY-MM-DD"/>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endDate" label="End Date" rules={[{ required: true }]}>
                <DatePicker style={{width: "100%"}} format="YYYY-MM-DD"/>
              </Form.Item>
            </Col>
            <Col span={24}>
               <Form.Item name="description" label="Description (Optional)">
                <Input.TextArea rows={3} placeholder="Additional details about the exam schedule or scope." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                <Select placeholder="Select status">
                  {examStatuses.map(status => <Option key={status} value={status}>{status}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
