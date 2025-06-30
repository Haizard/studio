'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Table, Modal, Form, Input, message, Tag, Space, Spin, Popconfirm, InputNumber, Row, Col, Breadcrumb, Alert } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, HomeOutlined, AppstoreOutlined, ArrowLeftOutlined, TeamOutlined } from '@ant-design/icons';
import type { IRoom } from '@/models/Tenant/Room';
import type { IDormitory } from '@/models/Tenant/Dormitory';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import mongoose from 'mongoose';

const { Title, Text } = Typography;

interface RoomDataType extends IRoom {
  key: string;
}

export default function ManageRoomsPage() {
  const params = useParams();
  const router = useRouter();
  const schoolCode = params.schoolCode as string;
  const dormitoryId = params.dormitoryId as string;

  const [rooms, setRooms] = useState<RoomDataType[]>([]);
  const [dormitory, setDormitory] = useState<IDormitory | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomDataType | null>(null);
  const [form] = Form.useForm();
  const [error, setError] = useState<string | null>(null);

  const DORMITORY_API = `/api/${schoolCode}/portal/dormitory/dormitories/${dormitoryId}`;
  const ROOMS_API_BASE = `/api/${schoolCode}/portal/dormitory/rooms`;

  const fetchData = useCallback(async () => {
    if (!mongoose.Types.ObjectId.isValid(dormitoryId)) {
        setError("Invalid Dormitory ID.");
        setLoading(false);
        return;
    }
    setLoading(true);
    setError(null);
    try {
      const [dormRes, roomsRes] = await Promise.all([
        fetch(DORMITORY_API),
        fetch(`${ROOMS_API_BASE}?dormitoryId=${dormitoryId}`)
      ]);

      if (!dormRes.ok) throw new Error((await dormRes.json()).error || 'Failed to fetch dormitory details');
      if (!roomsRes.ok) throw new Error((await roomsRes.json()).error || 'Failed to fetch rooms');
      
      const dormData: IDormitory = await dormRes.json();
      const roomsData: IRoom[] = await roomsRes.json();

      setDormitory(dormData);
      setRooms(roomsData.map(room => ({ ...room, key: room._id })));

    } catch (err: any) {
      setError(err.message || 'Could not load initial data.');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, dormitoryId, DORMITORY_API, ROOMS_API_BASE]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddRoom = () => {
    setEditingRoom(null);
    form.resetFields();
    form.setFieldsValue({ capacity: 4 }); // Default capacity
    setIsModalVisible(true);
  };

  const handleEditRoom = (room: RoomDataType) => {
    setEditingRoom(room);
    form.setFieldsValue({
      ...room,
    });
    setIsModalVisible(true);
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      const response = await fetch(`${ROOMS_API_BASE}/${roomId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete room');
      }
      message.success('Room deleted successfully');
      fetchData();
    } catch (err: any) {
      message.error(err.message || 'Could not delete room.');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values, dormitoryId };
      
      const url = editingRoom ? `${ROOMS_API_BASE}/${editingRoom._id}` : ROOMS_API_BASE;
      const method = editingRoom ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingRoom ? 'update' : 'add'} room`);
      }

      message.success(`Room ${editingRoom ? 'updated' : 'added'} successfully`);
      setIsModalVisible(false);
      fetchData();
    } catch (err: any) {
      message.error(err.message || `Could not ${editingRoom ? 'update' : 'add'} room.`);
    }
  };

  const columns = [
    { title: 'Room Number', dataIndex: 'roomNumber', key: 'roomNumber', sorter: (a:RoomDataType, b:RoomDataType) => a.roomNumber.localeCompare(b.roomNumber) },
    { title: 'Capacity', dataIndex: 'capacity', key: 'capacity', sorter: (a:RoomDataType, b:RoomDataType) => a.capacity - b.capacity },
    { 
        title: 'Occupants', 
        dataIndex: 'occupants', 
        key: 'occupants', 
        render: (occupants: any[]) => (
            <Tag icon={<TeamOutlined />} color={occupants.length > 0 ? 'blue' : 'default'}>
                {occupants ? occupants.length : 0}
            </Tag>
        )
    },
    { title: 'Notes', dataIndex: 'notes', key: 'notes', render: (notes?:string) => notes || '-' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: RoomDataType) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEditRoom(record)}>Edit</Button>
          <Popconfirm
            title="Delete this room?"
            description="This action cannot be undone. You can only delete empty rooms."
            onConfirm={() => handleDeleteRoom(record._id)}
            okText="Yes, Delete"
            cancelText="No"
            disabled={record.occupants && record.occupants.length > 0}
          >
            <Button icon={<DeleteOutlined />} danger disabled={record.occupants && record.occupants.length > 0}>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  
  const breadcrumbItems = [
    { title: <Link href={`/${schoolCode}/portal/dashboard`}>Home</Link> },
    { title: <Link href={`/${schoolCode}/portal/dormitory`}>Dormitories</Link> },
    { title: dormitory ? `Manage Rooms: ${dormitory.name}` : 'Loading...' },
  ];

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Spin size="large" /></div>;
  }
   if (error) {
    return <Alert message="Error" description={error} type="error" showIcon action={<Button onClick={() => router.back()}>Back to Dormitories</Button>} />;
  }

  return (
    <div>
        <Breadcrumb items={breadcrumbItems} className="mb-4" />
        <div className="flex justify-between items-center mb-6">
            <Title level={2} className="!mb-0">
                <AppstoreOutlined className="mr-2"/>Rooms for {dormitory?.name}
            </Title>
             <Space>
                <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(`/${schoolCode}/portal/dormitory`)}>Back to Dormitories</Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRoom}>
                    Add New Room
                </Button>
            </Space>
        </div>

      <Table columns={columns} dataSource={rooms} rowKey="_id" />

      <Modal
        title={editingRoom ? 'Edit Room' : 'Add New Room'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting}
        destroyOnClose
        width={600}
      >
        <Form form={form} layout="vertical" name="roomForm" className="mt-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="roomNumber" label="Room Number/Name" rules={[{ required: true }]}>
                <Input placeholder="e.g., 101, G-05, Blue Room" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="capacity" label="Capacity" rules={[{ required: true, type: 'number', min: 1 }]}>
                <InputNumber min={1} style={{width: "100%"}} placeholder="e.g. 4"/>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Notes (Optional)">
            <Input.TextArea rows={3} placeholder="Any specific notes about this room." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
