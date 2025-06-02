
'use client';
import React, { useState, useEffect } from 'react';
import { Button, Typography, Table, Modal, Form, Input, DatePicker, Switch, message, Tag, Space, Spin, Popconfirm, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CalendarOutlined } from '@ant-design/icons';
import type { IEvent } from '@/models/Tenant/Event'; 
import moment from 'moment';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface EventDataType extends IEvent {
  key: string;
  startDate: moment.Moment;
  endDate?: moment.Moment;
}

interface EventsManagementPageProps {
  params: { schoolCode: string };
}

// Example categories and audiences, could be fetched or configurable
const eventCategories = ["Academic", "Sports", "Cultural", "Holiday", "Meeting", "Workshop", "Other"];
const eventAudiences = ["All", "Students", "Teachers", "Parents", "Staff", "Public"];


export default function EventsManagementPage({ params }: EventsManagementPageProps) {
  const { schoolCode } = params;
  const [events, setEvents] = useState<EventDataType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventDataType | null>(null);
  const [form] = Form.useForm();

  const API_URL_BASE = `/api/${schoolCode}/website/events`;

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL_BASE}?adminView=true`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch events');
      }
      const data: IEvent[] = await response.json();
      setEvents(data.map(event => ({ 
        ...event, 
        key: event._id,
        startDate: moment(event.startDate),
        endDate: event.endDate ? moment(event.endDate) : undefined,
      })));
    } catch (error: any) {
      message.error(error.message || 'Could not load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [schoolCode]);

  const handleAddEvent = () => {
    setEditingEvent(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, startDate: moment(), audience: ["All"] });
    setIsModalVisible(true);
  };

  const handleEditEvent = (event: EventDataType) => {
    setEditingEvent(event);
    form.setFieldsValue({
      ...event,
      startDate: event.startDate ? moment(event.startDate) : undefined,
      endDate: event.endDate ? moment(event.endDate) : undefined,
      audience: event.audience || [],
    });
    setIsModalVisible(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const response = await fetch(`${API_URL_BASE}/${eventId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete event');
      }
      message.success('Event deleted successfully');
      fetchEvents();
    } catch (error: any) {
      message.error(error.message || 'Could not delete event.');
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
      
      const url = editingEvent ? `${API_URL_BASE}/${editingEvent._id}` : API_URL_BASE;
      const method = editingEvent ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingEvent ? 'update' : 'add'} event`);
      }

      message.success(`Event ${editingEvent ? 'updated' : 'added'} successfully`);
      setIsModalVisible(false);
      fetchEvents();
    } catch (error: any) {
      message.error(error.message || `Could not ${editingEvent ? 'update' : 'add'} event.`);
    }
  };

  const columns = [
    { title: 'Title', dataIndex: 'title', key: 'title', sorter: (a:EventDataType, b:EventDataType) => a.title.localeCompare(b.title) },
    { title: 'Start Date', dataIndex: 'startDate', key: 'startDate', render: (date: moment.Moment) => date ? date.format('YYYY-MM-DD HH:mm') : '-', sorter: (a: EventDataType, b: EventDataType) => moment(a.startDate).unix() - moment(b.startDate).unix()},
    { title: 'End Date', dataIndex: 'endDate', key: 'endDate', render: (date?: moment.Moment) => date ? date.format('YYYY-MM-DD HH:mm') : '-', sorter: (a: EventDataType, b: EventDataType) => moment(a.endDate).unix() - moment(b.endDate).unix()},
    { title: 'Category', dataIndex: 'category', key: 'category' },
    { title: 'Status', dataIndex: 'isActive', key: 'isActive', render: (isActive: boolean) => <Tag color={isActive ? 'green' : 'blue'}>{isActive ? 'Active' : 'Inactive'}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: EventDataType) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEditEvent(record)}>Edit</Button>
          <Popconfirm
            title="Delete this event?"
            description="This action cannot be undone."
            onConfirm={() => handleDeleteEvent(record._id)}
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
        <Title level={2}><CalendarOutlined className="mr-2"/>Event Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddEvent}>
          Add New Event
        </Button>
      </div>
      <Table columns={columns} dataSource={events} rowKey="_id" />

      <Modal
        title={editingEvent ? 'Edit Event' : 'Add New Event'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting}
        destroyOnClose
        width={700}
      >
        <Form form={form} layout="vertical" name="eventForm" className="mt-4">
          <Form.Item name="title" label="Event Title" rules={[{ required: true }]}>
            <Input placeholder="e.g., Annual Sports Day" />
          </Form.Item>
          <Form.Item name="description" label="Description (Optional)">
            <TextArea rows={3} placeholder="Detailed information about the event" />
          </Form.Item>
           <Form.Item name="startDate" label="Start Date & Time" rules={[{ required: true }]}>
            <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{width: "100%"}}/>
          </Form.Item>
          <Form.Item name="endDate" label="End Date & Time (Optional)">
            <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{width: "100%"}}/>
          </Form.Item>
          <Form.Item name="location" label="Location (Optional)">
            <Input placeholder="e.g., School Main Hall, Sports Ground" />
          </Form.Item>
          <Form.Item name="category" label="Category (Optional)">
            <Select placeholder="Select event category" allowClear>
                {eventCategories.map(cat => <Option key={cat} value={cat}>{cat}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="audience" label="Audience (Optional)">
            <Select mode="tags" placeholder="Select or type audience groups" allowClear>
                {eventAudiences.map(aud => <Option key={aud} value={aud}>{aud}</Option>)}
            </Select>
          </Form.Item>
           <Form.Item name="featuredImageUrl" label="Featured Image URL (Optional)">
            <Input placeholder="https://example.com/event-image.jpg" />
          </Form.Item>
          <Form.Item 
            name="isActive" 
            label="Set as Active Event" 
            valuePropName="checked"
            tooltip="Active events will be visible on the public website."
          >
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
