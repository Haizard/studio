
'use client';
import React, { useState, useEffect } from 'react';
import { Button, Typography, Table, Modal, Form, Input, message, Tag, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ISchool } from '@/models/SuperAdmin/School'; // Adjust path as necessary

const { Title } = Typography;

interface SchoolDataType extends ISchool {
  key: string;
}

export default function ManageSchoolsPage() {
  const [schools, setSchools] = useState<SchoolDataType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolDataType | null>(null);
  const [form] = Form.useForm();

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/superadmin/schools');
      if (!response.ok) {
        throw new Error('Failed to fetch schools');
      }
      const data: ISchool[] = await response.json();
      setSchools(data.map(school => ({ ...school, key: school._id })));
    } catch (error) {
      message.error('Could not load schools.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const handleAddSchool = () => {
    setEditingSchool(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditSchool = (school: SchoolDataType) => {
    setEditingSchool(school);
    form.setFieldsValue({
      name: school.name,
      schoolCode: school.schoolCode,
      mongodbUri: school.mongodbUri,
      contactEmail: school.contactInfo?.email,
      contactPhone: school.contactInfo?.phone,
    });
    setIsModalVisible(true);
  };

  const handleDeleteSchool = async (schoolId: string) => {
    // Implement delete functionality here
    // Consider soft delete or confirmation
    message.info(`Delete school with ID: ${schoolId} (not implemented)`);
    // Example:
    // try {
    //   const response = await fetch(`/api/superadmin/schools/${schoolId}`, { method: 'DELETE' });
    //   if (!response.ok) throw new Error('Failed to delete school');
    //   message.success('School deleted successfully');
    //   fetchSchools();
    // } catch (error) {
    //   message.error('Failed to delete school');
    // }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        name: values.name,
        schoolCode: values.schoolCode.toLowerCase(),
        mongodbUri: values.mongodbUri,
        contactInfo: {
          email: values.contactEmail,
          phone: values.contactPhone,
        },
      };

      const url = editingSchool ? `/api/superadmin/schools/${editingSchool._id}` : '/api/superadmin/schools';
      const method = editingSchool ? 'PUT' : 'POST'; // Assuming PUT for update

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingSchool ? 'update' : 'add'} school`);
      }

      message.success(`School ${editingSchool ? 'updated' : 'added'} successfully`);
      setIsModalVisible(false);
      fetchSchools();
    } catch (error: any) {
      message.error(error.message || `Could not ${editingSchool ? 'update' : 'add'} school.`);
      console.error('Modal submission error:', error);
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a: SchoolDataType, b: SchoolDataType) => a.name.localeCompare(b.name) },
    { title: 'School Code', dataIndex: 'schoolCode', key: 'schoolCode' },
    { title: 'MongoDB URI', dataIndex: 'mongodbUri', key: 'mongodbUri', ellipsis: true },
    { title: 'Contact Email', dataIndex: ['contactInfo', 'email'], key: 'contactEmail' },
    { title: 'Status', dataIndex: 'isActive', key: 'isActive', render: (isActive: boolean) => <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Active' : 'Inactive'}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: SchoolDataType) => (
        <Space size="middle">
          <Button icon={<EditOutlined />} onClick={() => handleEditSchool(record)}>Edit</Button>
          {/* <Button icon={<DeleteOutlined />} danger onClick={() => handleDeleteSchool(record._id)}>Delete</Button> */}
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
        <Title level={2}>Manage Schools</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddSchool}>
          Add New School
        </Button>
      </div>
      <Table columns={columns} dataSource={schools} rowKey="_id" />

      <Modal
        title={editingSchool ? 'Edit School' : 'Add New School'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting}
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical" name="schoolForm" className="mt-4">
          <Form.Item name="name" label="School Name" rules={[{ required: true, message: 'Please input the school name!' }]}>
            <Input />
          </Form.Item>
          <Form.Item 
            name="schoolCode" 
            label="School Code" 
            rules={[
                { required: true, message: 'Please input the school code!' },
                { pattern: /^[a-z0-9]+$/, message: 'School code must be lowercase alphanumeric characters only.'}
            ]}
            help="Unique, lowercase, alphanumeric (e.g., 'scha', 'myschool01'). Cannot be changed after creation."
            >
            <Input disabled={!!editingSchool} />
          </Form.Item>
          <Form.Item name="mongodbUri" label="MongoDB Connection URI" rules={[{ required: true, message: 'Please input the MongoDB URI!' }]}>
            <Input.TextArea rows={3} placeholder="mongodb+srv://user:pass@cluster.mongodb.net/school_db_name?retryWrites=true&w=majority" />
          </Form.Item>
          <Form.Item name="contactEmail" label="Contact Email (Optional)" rules={[{ type: 'email', message: 'Please enter a valid email!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="contactPhone" label="Contact Phone (Optional)">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
