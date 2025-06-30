'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Table, Modal, Form, Input, Select, message, Tag, Space, Spin, Popconfirm, InputNumber, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, HomeOutlined, ManOutlined, WomanOutlined, AppstoreOutlined } from '@ant-design/icons';
import type { IDormitory } from '@/models/Tenant/Dormitory';
import type { ITenantUser } from '@/models/Tenant/User';
import Link from 'next/link';

const { Title } = Typography;
const { Option } = Select;

interface DormitoryDataType extends IDormitory {
  key: string;
  wardenName?: string;
}

interface DormitoryPageProps {
  params: { schoolCode: string };
}

export default function DormitoryPage({ params }: DormitoryPageProps) {
  const { schoolCode } = params;
  const [dormitories, setDormitories] = useState<DormitoryDataType[]>([]);
  const [users, setUsers] = useState<ITenantUser[]>([]); // To populate wardens dropdown
  
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingDorm, setEditingDorm] = useState<DormitoryDataType | null>(null);
  const [form] = Form.useForm();

  const API_URL_BASE = `/api/${schoolCode}/portal/dormitory/dormitories`;
  const USERS_API = `/api/${schoolCode}/portal/users`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dormsRes, usersRes] = await Promise.all([
        fetch(API_URL_BASE),
        fetch(USERS_API),
      ]);

      if (!dormsRes.ok) throw new Error((await dormsRes.json()).error || 'Failed to fetch dormitories');
      if (!usersRes.ok) throw new Error((await usersRes.json()).error || 'Failed to fetch users');
      
      const dormsData: IDormitory[] = await dormsRes.json();
      const usersData: ITenantUser[] = await usersRes.json();

      setDormitories(dormsData.map(dorm => ({ 
        ...dorm, 
        key: dorm._id,
        wardenName: dorm.wardenId ? `${(dorm.wardenId as ITenantUser).firstName} ${(dorm.wardenId as ITenantUser).lastName}` : 'N/A',
      })));
      // Filter for potential wardens (e.g., admins, teachers, dormitory_masters)
      setUsers(usersData.filter(u => ['admin', 'teacher', 'dormitory_master'].includes(u.role) && u.isActive));

    } catch (error: any) {
      message.error(error.message || 'Could not load initial data.');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, API_URL_BASE, USERS_API]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddDormitory = () => {
    setEditingDorm(null);
    form.resetFields();
    form.setFieldsValue({ type: 'Boys' });
    setIsModalVisible(true);
  };

  const handleEditDormitory = (dorm: DormitoryDataType) => {
    setEditingDorm(dorm);
    form.setFieldsValue({
      ...dorm,
      wardenId: typeof dorm.wardenId === 'object' ? (dorm.wardenId as ITenantUser)?._id : dorm.wardenId,
    });
    setIsModalVisible(true);
  };

  const handleDeleteDormitory = async (dormId: string) => {
    try {
      const response = await fetch(`${API_URL_BASE}/${dormId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete dormitory');
      }
      message.success('Dormitory deleted successfully');
      fetchData();
    } catch (error: any) {
      message.error(error.message || 'Could not delete dormitory.');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values, wardenId: values.wardenId || null };
      
      const url = editingDorm ? `${API_URL_BASE}/${editingDorm._id}` : API_URL_BASE;
      const method = editingDorm ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingDorm ? 'update' : 'add'} dormitory`);
      }

      message.success(`Dormitory ${editingDorm ? 'updated' : 'added'} successfully`);
      setIsModalVisible(false);
      fetchData();
    } catch (error: any) {
      message.error(error.message || `Could not ${editingDorm ? 'update' : 'add'} dormitory.`);
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a:DormitoryDataType, b:DormitoryDataType) => a.name.localeCompare(b.name) },
    { 
      title: 'Type', 
      dataIndex: 'type', 
      key: 'type', 
      render: (type: 'Boys' | 'Girls' | 'Mixed') => (
        <Tag icon={type === 'Boys' ? <ManOutlined /> : <WomanOutlined />} color={type === 'Boys' ? 'blue' : 'pink'}>{type}</Tag>
      )
    },
    { title: 'Capacity', dataIndex: 'capacity', key: 'capacity', render: (val?: number) => val || 'N/A' },
    { title: 'Warden', dataIndex: 'wardenName', key: 'wardenName' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: DormitoryDataType) => (
        <Space>
          <Link href={`/${schoolCode}/portal/dormitory/${record._id}/rooms`}>
             <Button icon={<AppstoreOutlined />}>Manage Rooms</Button>
          </Link>
          <Button icon={<EditOutlined />} onClick={() => handleEditDormitory(record)}>Edit</Button>
          <Popconfirm
            title="Delete this dormitory?"
            description="This action cannot be undone. Ensure this dormitory has no rooms or occupants."
            onConfirm={() => handleDeleteDormitory(record._id)}
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
        <Title level={2}><HomeOutlined className="mr-2"/>Dormitory Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddDormitory}>
          Add New Dormitory
        </Button>
      </div>
      <Table columns={columns} dataSource={dormitories} rowKey="_id" />

      <Modal
        title={editingDorm ? 'Edit Dormitory' : 'Add New Dormitory'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting}
        destroyOnClose
        width={700}
      >
        <Form form={form} layout="vertical" name="dormitoryForm" className="mt-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Dormitory Name" rules={[{ required: true, message: "E.g., 'Kilimanjaro Hostel'" }]}>
                <Input placeholder="e.g., Kilimanjaro Hostel" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="Dormitory Type" rules={[{ required: true }]}>
                <Select placeholder="Select type">
                  <Option value="Boys">Boys</Option>
                  <Option value="Girls">Girls</Option>
                  <Option value="Mixed">Mixed</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="wardenId" label="Warden (Optional)">
                <Select placeholder="Select a warden" allowClear>
                  {users.map(user => (
                    <Option key={user._id} value={user._id}>{`${user.firstName} ${user.lastName} (${user.role})`}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
               <Form.Item name="capacity" label="Total Capacity (Optional)">
                <InputNumber min={1} style={{width: "100%"}} placeholder="e.g. 100"/>
              </Form.Item>
            </Col>
          </Row>
           <Form.Item name="notes" label="Notes (Optional)">
            <Input.TextArea rows={3} placeholder="Any specific notes about this dormitory." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
