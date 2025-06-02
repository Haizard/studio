
'use client';
import React, { useState, useEffect } from 'react';
import { Button, Typography, Table, Modal, Form, Input, DatePicker, Switch, message, Tag, Space, Spin, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CalendarOutlined } from '@ant-design/icons';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear'; // Adjust path as necessary
import moment from 'moment';

const { Title } = Typography;

interface AcademicYearDataType extends IAcademicYear {
  key: string;
}

interface AcademicYearsPageProps {
  params: { schoolCode: string };
}

export default function AcademicYearsPage({ params }: AcademicYearsPageProps) {
  const { schoolCode } = params;
  const [academicYears, setAcademicYears] = useState<AcademicYearDataType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYearDataType | null>(null);
  const [form] = Form.useForm();

  const API_URL_BASE = `/api/${schoolCode}/portal/academics/academic-years`;

  const fetchAcademicYears = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL_BASE);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch academic years');
      }
      const data: IAcademicYear[] = await response.json();
      setAcademicYears(data.map(year => ({ 
        ...year, 
        key: year._id,
        startDate: moment(year.startDate) as any, // For DatePicker
        endDate: moment(year.endDate) as any,     // For DatePicker
      })));
    } catch (error: any) {
      message.error(error.message || 'Could not load academic years.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademicYears();
  }, [schoolCode]);

  const handleAddYear = () => {
    setEditingYear(null);
    form.resetFields();
    form.setFieldsValue({ isActive: false }); // Default to inactive
    setIsModalVisible(true);
  };

  const handleEditYear = (year: AcademicYearDataType) => {
    setEditingYear(year);
    form.setFieldsValue({
      ...year,
      // Ensure dates are moment objects for DatePicker
      startDate: year.startDate ? moment(year.startDate) : undefined,
      endDate: year.endDate ? moment(year.endDate) : undefined,
    });
    setIsModalVisible(true);
  };

  const handleDeleteYear = async (yearId: string) => {
    try {
      const response = await fetch(`${API_URL_BASE}/${yearId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete academic year');
      }
      message.success('Academic year deleted successfully');
      fetchAcademicYears();
    } catch (error: any) {
      message.error(error.message || 'Could not delete academic year.');
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
      
      const url = editingYear ? `${API_URL_BASE}/${editingYear._id}` : API_URL_BASE;
      const method = editingYear ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingYear ? 'update' : 'add'} academic year`);
      }

      message.success(`Academic year ${editingYear ? 'updated' : 'added'} successfully`);
      setIsModalVisible(false);
      fetchAcademicYears();
    } catch (error: any) {
      message.error(error.message || `Could not ${editingYear ? 'update' : 'add'} academic year.`);
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a:AcademicYearDataType, b:AcademicYearDataType) => a.name.localeCompare(b.name) },
    { title: 'Start Date', dataIndex: 'startDate', key: 'startDate', render: (date: moment.Moment) => date ? date.format('YYYY-MM-DD') : '-', sorter: (a: AcademicYearDataType, b: AcademicYearDataType) => moment(a.startDate).unix() - moment(b.startDate).unix()},
    { title: 'End Date', dataIndex: 'endDate', key: 'endDate', render: (date: moment.Moment) => date ? date.format('YYYY-MM-DD') : '-', sorter: (a: AcademicYearDataType, b: AcademicYearDataType) => moment(a.endDate).unix() - moment(b.endDate).unix()},
    { title: 'Status', dataIndex: 'isActive', key: 'isActive', render: (isActive: boolean) => <Tag color={isActive ? 'green' : 'blue'}>{isActive ? 'Active' : 'Inactive'}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: AcademicYearDataType) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEditYear(record)}>Edit</Button>
          <Popconfirm
            title="Delete this academic year?"
            description="This action cannot be undone. Ensure this year is not in use."
            onConfirm={() => handleDeleteYear(record._id)}
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
        <Title level={2}><CalendarOutlined className="mr-2"/>Academic Year Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddYear}>
          Add Academic Year
        </Button>
      </div>
      <Table columns={columns} dataSource={academicYears} rowKey="_id" />

      <Modal
        title={editingYear ? 'Edit Academic Year' : 'Add New Academic Year'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting} // AntD Form provides isSubmitting
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical" name="academicYearForm" className="mt-4">
          <Form.Item name="name" label="Academic Year Name" rules={[{ required: true, message: "E.g., '2023-2024'" }]}>
            <Input placeholder="e.g., 2023-2024" />
          </Form.Item>
          <Form.Item name="startDate" label="Start Date" rules={[{ required: true }]}>
            <DatePicker style={{width: "100%"}} format="YYYY-MM-DD"/>
          </Form.Item>
          <Form.Item name="endDate" label="End Date" rules={[{ required: true }]}>
            <DatePicker style={{width: "100%"}} format="YYYY-MM-DD"/>
          </Form.Item>
          <Form.Item 
            name="isActive" 
            label="Set as Active Year" 
            valuePropName="checked"
            tooltip="Setting this year as active will deactivate any other currently active year."
          >
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
