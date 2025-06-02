
'use client';
import React, { useState, useEffect } from 'react';
import { Button, Typography, Table, Modal, Form, Input, Select, Switch, message, Tag, Space, Spin } from 'antd';
import { PlusOutlined, EditOutlined, UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import type { ITenantUser, UserRole } from '@/models/Tenant/User'; // Adjust path as necessary

const { Title } = Typography;
const { Option } = Select;

interface UserDataType extends ITenantUser {
  key: string;
}

interface UserManagementPageProps {
  params: { schoolCode: string };
}

const userRoles: UserRole[] = ['admin', 'teacher', 'student', 'librarian', 'finance', 'pharmacy', 'dormitory_master'];

export default function UserManagementPage({ params }: UserManagementPageProps) {
  const { schoolCode } = params;
  const [users, setUsers] = useState<UserDataType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDataType | null>(null);
  const [form] = Form.useForm();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/${schoolCode}/portal/users`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }
      const data: ITenantUser[] = await response.json();
      setUsers(data.map(user => ({ ...user, key: user._id })));
    } catch (error: any) {
      message.error(error.message || 'Could not load users.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [schoolCode]);

  const handleAddUser = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true }); // Default to active
    setIsModalVisible(true);
  };

  const handleEditUser = (user: UserDataType) => {
    setEditingUser(user);
    form.setFieldsValue({
      ...user,
      // Password should not be pre-filled for editing
    });
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values };
      
      if (editingUser && !values.password) { // If editing and password is empty, don't send it
        delete payload.password;
      } else if (!editingUser && !values.password) { // If adding and password is empty
        message.error('Password is required for new users.');
        return;
      }


      const url = editingUser ? `/api/${schoolCode}/portal/users/${editingUser._id}` : `/api/${schoolCode}/portal/users`;
      const method = editingUser ? 'PUT' : 'POST'; // Assuming PUT for update API route

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingUser ? 'update' : 'add'} user`);
      }

      message.success(`User ${editingUser ? 'updated' : 'added'} successfully`);
      setIsModalVisible(false);
      fetchUsers();
    } catch (error: any) {
      message.error(error.message || `Could not ${editingUser ? 'update' : 'add'} user.`);
      console.error('Modal submission error:', error);
    }
  };

  const columns = [
    { title: 'Username', dataIndex: 'username', key: 'username', sorter: (a:UserDataType, b:UserDataType) => a.username.localeCompare(b.username) },
    { title: 'First Name', dataIndex: 'firstName', key: 'firstName' },
    { title: 'Last Name', dataIndex: 'lastName', key: 'lastName' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Role', dataIndex: 'role', key: 'role', render: (role: UserRole) => <Tag>{role.toUpperCase()}</Tag> },
    { title: 'Status', dataIndex: 'isActive', key: 'isActive', render: (isActive: boolean) => <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Active' : 'Inactive'}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: UserDataType) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEditUser(record)}>Edit</Button>
          {/* Delete button can be added here with confirmation */}
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
        <Title level={2}>User Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddUser}>
          Add New User
        </Button>
      </div>
      <Table columns={columns} dataSource={users} rowKey="_id" />

      <Modal
        title={editingUser ? 'Edit User' : 'Add New User'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting}
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical" name="userForm" className="mt-4">
          <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
            <Input prefix={<UserOutlined />} />
          </Form.Item>
          <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
            <Input prefix={<UserOutlined />} />
          </Form.Item>
          <Form.Item name="username" label="Username" rules={[{ required: true }]}>
            <Input prefix={<UserOutlined />} disabled={!!editingUser} />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input prefix={<MailOutlined />} disabled={!!editingUser} />
          </Form.Item>
          <Form.Item 
            name="password" 
            label={editingUser ? "New Password (Optional)" : "Password"}
            rules={editingUser ? [] : [{ required: true, message: 'Password is required for new users!' }]}
            help={editingUser ? "Leave blank to keep current password." : ""}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select placeholder="Select a role">
              {userRoles.map(role => (
                <Option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="isActive" label="Active Status" valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
