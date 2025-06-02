
'use client';
import React, { useState, useEffect } from 'react';
import { Button, Typography, Table, Modal, Form, Input, Switch, message, Tag, Space, Spin, Select, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UnorderedListOutlined } from '@ant-design/icons';
import type { ISubject } from '@/models/Tenant/Subject'; // Adjust path as necessary

const { Title } = Typography;
const { Option } = Select;

interface SubjectDataType extends ISubject {
  key: string;
}

interface SubjectsPageProps {
  params: { schoolCode: string };
}

// Example levels, these could be fetched or configurable
const availableLevels = ['O-Level', 'A-Level', 'Form 1', 'Form 2', 'Form 3', 'Form 4', 'Senior 5', 'Senior 6'];

export default function SubjectsPage({ params }: SubjectsPageProps) {
  const { schoolCode } = params;
  const [subjects, setSubjects] = useState<SubjectDataType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectDataType | null>(null);
  const [form] = Form.useForm();

  const API_URL_BASE = `/api/${schoolCode}/portal/academics/subjects`;

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL_BASE);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch subjects');
      }
      const data: ISubject[] = await response.json();
      setSubjects(data.map(subject => ({ ...subject, key: subject._id })));
    } catch (error: any) {
      message.error(error.message || 'Could not load subjects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [schoolCode]);

  const handleAddSubject = () => {
    setEditingSubject(null);
    form.resetFields();
    form.setFieldsValue({ isElective: false, forLevel: [] });
    setIsModalVisible(true);
  };

  const handleEditSubject = (subject: SubjectDataType) => {
    setEditingSubject(subject);
    form.setFieldsValue({
      ...subject,
      forLevel: subject.forLevel || [], // Ensure it's an array for Select
    });
    setIsModalVisible(true);
  };

  const handleDeleteSubject = async (subjectId: string) => {
    try {
      const response = await fetch(`${API_URL_BASE}/${subjectId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete subject');
      }
      message.success('Subject deleted successfully');
      fetchSubjects();
    } catch (error: any) {
      message.error(error.message || 'Could not delete subject.');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values };
      
      const url = editingSubject ? `${API_URL_BASE}/${editingSubject._id}` : API_URL_BASE;
      const method = editingSubject ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingSubject ? 'update' : 'add'} subject`);
      }

      message.success(`Subject ${editingSubject ? 'updated' : 'added'} successfully`);
      setIsModalVisible(false);
      fetchSubjects();
    } catch (error: any) {
      message.error(error.message || `Could not ${editingSubject ? 'update' : 'add'} subject.`);
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a:SubjectDataType, b:SubjectDataType) => a.name.localeCompare(b.name) },
    { title: 'Code', dataIndex: 'code', key: 'code' },
    { title: 'Department', dataIndex: 'department', key: 'department' },
    { title: 'Type', dataIndex: 'isElective', key: 'isElective', render: (isElective: boolean) => <Tag color={isElective ? 'orange' : 'cyan'}>{isElective ? 'Elective' : 'Core'}</Tag> },
    { title: 'Applicable Levels', dataIndex: 'forLevel', key: 'forLevel', render: (levels: string[]) => (levels && levels.length > 0 ? levels.map(level => <Tag key={level}>{level}</Tag>) : '-')},
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: SubjectDataType) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEditSubject(record)}>Edit</Button>
          <Popconfirm
            title="Delete this subject?"
            description="This action cannot be undone. Ensure this subject is not in use by classes or combinations."
            onConfirm={() => handleDeleteSubject(record._id)}
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
        <Title level={2}><UnorderedListOutlined className="mr-2"/>Subject Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddSubject}>
          Add New Subject
        </Button>
      </div>
      <Table columns={columns} dataSource={subjects} rowKey="_id" />

      <Modal
        title={editingSubject ? 'Edit Subject' : 'Add New Subject'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting}
        destroyOnClose
        width={700}
      >
        <Form form={form} layout="vertical" name="subjectForm" className="mt-4">
          <Form.Item name="name" label="Subject Name" rules={[{ required: true }]}>
            <Input placeholder="e.g., Mathematics" />
          </Form.Item>
          <Form.Item name="code" label="Subject Code (Optional)" rules={[{ pattern: /^[a-zA-Z0-9_.-]*$/, message: "Code can only contain letters, numbers, and '_', '.', '-'" }]}>
            <Input placeholder="e.g., MATH101" />
          </Form.Item>
          <Form.Item name="department" label="Department (Optional)">
            <Input placeholder="e.g., Sciences, Humanities" />
          </Form.Item>
          <Form.Item name="isElective" label="Is this an Elective Subject?" valuePropName="checked">
            <Switch checkedChildren="Elective" unCheckedChildren="Core" />
          </Form.Item>
          <Form.Item name="forLevel" label="Applicable Levels (Optional)">
            <Select mode="tags" style={{ width: '100%' }} placeholder="Select or type levels (e.g., Form 1, O-Level)">
              {availableLevels.map(level => <Option key={level} value={level}>{level}</Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
