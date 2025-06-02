
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Table, Modal, Form, Input, DatePicker, Switch, message, Tag, Space, Spin, Popconfirm, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CalendarOutlined } from '@ant-design/icons';
import type { ITerm } from '@/models/Tenant/Term';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;

interface TermDataType extends Omit<ITerm, 'academicYearId'> {
  key: string;
  academicYearId: { _id: string; name: string } | string; // Populated or ID
  startDate: moment.Moment;
  endDate: moment.Moment;
}

interface TermsPageProps {
  params: { schoolCode: string };
}

export default function TermsPage({ params }: TermsPageProps) {
  const { schoolCode } = params;
  const [terms, setTerms] = useState<TermDataType[]>([]);
  const [academicYears, setAcademicYears] = useState<IAcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTerm, setEditingTerm] = useState<TermDataType | null>(null);
  const [form] = Form.useForm();

  const API_URL_BASE = `/api/${schoolCode}/portal/academics/terms`;
  const ACADEMIC_YEARS_API = `/api/${schoolCode}/portal/academics/academic-years`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [termsRes, yearsRes] = await Promise.all([
        fetch(API_URL_BASE),
        fetch(ACADEMIC_YEARS_API),
      ]);

      if (!termsRes.ok) throw new Error((await termsRes.json()).error || 'Failed to fetch terms');
      if (!yearsRes.ok) throw new Error((await yearsRes.json()).error || 'Failed to fetch academic years');
      
      const termsData: ITerm[] = await termsRes.json();
      const yearsData: IAcademicYear[] = await yearsRes.json();

      setTerms(termsData.map(term => ({ 
        ...term, 
        key: term._id,
        academicYearId: term.academicYearId as any, // Will be populated or string
        startDate: moment(term.startDate),
        endDate: moment(term.endDate),
      })));
      setAcademicYears(yearsData);

    } catch (error: any) {
      message.error(error.message || 'Could not load initial data.');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, API_URL_BASE, ACADEMIC_YEARS_API]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddTerm = () => {
    setEditingTerm(null);
    form.resetFields();
    form.setFieldsValue({ isActive: false });
    setIsModalVisible(true);
  };

  const handleEditTerm = (term: TermDataType) => {
    setEditingTerm(term);
    form.setFieldsValue({
      ...term,
      academicYearId: typeof term.academicYearId === 'object' ? term.academicYearId._id : term.academicYearId,
      startDate: term.startDate ? moment(term.startDate) : undefined,
      endDate: term.endDate ? moment(term.endDate) : undefined,
    });
    setIsModalVisible(true);
  };

  const handleDeleteTerm = async (termId: string) => {
    try {
      const response = await fetch(`${API_URL_BASE}/${termId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete term');
      }
      message.success('Term deleted successfully');
      fetchData();
    } catch (error: any) {
      message.error(error.message || 'Could not delete term.');
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
      
      const url = editingTerm ? `${API_URL_BASE}/${editingTerm._id}` : API_URL_BASE;
      const method = editingTerm ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingTerm ? 'update' : 'add'} term`);
      }

      message.success(`Term ${editingTerm ? 'updated' : 'added'} successfully`);
      setIsModalVisible(false);
      fetchData();
    } catch (error: any) {
      message.error(error.message || `Could not ${editingTerm ? 'update' : 'add'} term.`);
    }
  };

  const columns = [
    { title: 'Term Name', dataIndex: 'name', key: 'name', sorter: (a:TermDataType, b:TermDataType) => a.name.localeCompare(b.name) },
    { 
      title: 'Academic Year', 
      dataIndex: 'academicYearId', 
      key: 'academicYearId', 
      render: (ay: TermDataType['academicYearId']) => typeof ay === 'object' ? ay.name : (academicYears.find(y => y._id === ay)?.name || ay),
      sorter: (a: TermDataType, b: TermDataType) => {
        const nameA = typeof a.academicYearId === 'object' ? a.academicYearId.name : (academicYears.find(y => y._id === a.academicYearId)?.name || '');
        const nameB = typeof b.academicYearId === 'object' ? b.academicYearId.name : (academicYears.find(y => y._id === b.academicYearId)?.name || '');
        return nameA.localeCompare(nameB);
      }
    },
    { title: 'Start Date', dataIndex: 'startDate', key: 'startDate', render: (date: moment.Moment) => date ? date.format('YYYY-MM-DD') : '-', sorter: (a: TermDataType, b: TermDataType) => moment(a.startDate).unix() - moment(b.startDate).unix()},
    { title: 'End Date', dataIndex: 'endDate', key: 'endDate', render: (date: moment.Moment) => date ? date.format('YYYY-MM-DD') : '-', sorter: (a: TermDataType, b: TermDataType) => moment(a.endDate).unix() - moment(b.endDate).unix()},
    { title: 'Status', dataIndex: 'isActive', key: 'isActive', render: (isActive: boolean) => <Tag color={isActive ? 'green' : 'blue'}>{isActive ? 'Active' : 'Inactive'}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: TermDataType) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEditTerm(record)}>Edit</Button>
          <Popconfirm
            title="Delete this term?"
            description="This action cannot be undone. Ensure this term is not in use."
            onConfirm={() => handleDeleteTerm(record._id)}
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
        <Title level={2}><CalendarOutlined className="mr-2"/>Term Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTerm}>
          Add New Term
        </Button>
      </div>
      <Table columns={columns} dataSource={terms} rowKey="_id" />

      <Modal
        title={editingTerm ? 'Edit Term' : 'Add New Term'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting}
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical" name="termForm" className="mt-4">
          <Form.Item name="name" label="Term Name" rules={[{ required: true, message: "E.g., 'Term 1', 'Semester 2'" }]}>
            <Input placeholder="e.g., Term 1" />
          </Form.Item>
          <Form.Item name="academicYearId" label="Academic Year" rules={[{ required: true }]}>
            <Select placeholder="Select academic year">
              {academicYears.map(year => <Option key={year._id} value={year._id}>{year.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="startDate" label="Start Date" rules={[{ required: true }]}>
            <DatePicker style={{width: "100%"}} format="YYYY-MM-DD"/>
          </Form.Item>
          <Form.Item name="endDate" label="End Date" rules={[{ required: true }]}>
            <DatePicker style={{width: "100%"}} format="YYYY-MM-DD"/>
          </Form.Item>
          <Form.Item 
            name="isActive" 
            label="Set as Active Term" 
            valuePropName="checked"
            tooltip="Setting this term as active will deactivate any other currently active term within the same academic year."
          >
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
