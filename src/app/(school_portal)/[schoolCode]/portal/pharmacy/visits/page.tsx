'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Table, Modal, Form, Select, DatePicker, message, Space, Spin, Input, Tag } from 'antd';
import { PlusOutlined, EditOutlined, HistoryOutlined, UserOutlined } from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import type { IVisit } from '@/models/Tenant/Visit';
import type { IStudent } from '@/models/Tenant/Student';
import type { ITenantUser } from '@/models/Tenant/User';
import moment from 'moment';
import Link from 'next/link';

const { Title, Paragraph } = Typography;
const { Option } = Select;

interface VisitDataType extends IVisit {
  key: string;
  studentName?: string;
  studentUsername?: string;
  recordedByUsername?: string;
}

export default function PharmacyVisitsPage() {
  const params = useParams();
  const schoolCode = params.schoolCode as string;
  const router = useRouter();

  const [visits, setVisits] = useState<VisitDataType[]>([]);
  const [students, setStudents] = useState<(IStudent & { userId: ITenantUser })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  
  const API_VISITS_URL = `/api/${schoolCode}/portal/pharmacy/visits`;
  const API_STUDENTS_URL = `/api/${schoolCode}/portal/students`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [visitsRes, studentsRes] = await Promise.all([
        fetch(API_VISITS_URL),
        fetch(API_STUDENTS_URL),
      ]);
      if (!visitsRes.ok) throw new Error((await visitsRes.json()).error || 'Failed to fetch visits');
      if (!studentsRes.ok) throw new Error((await studentsRes.json()).error || 'Failed to fetch students');

      const visitsData: IVisit[] = await visitsRes.json();
      const studentsData: (IStudent & { userId: ITenantUser })[] = await studentsRes.json();
      
      setVisits(visitsData.map(v => ({
        ...v,
        key: v._id.toString(),
        studentName: (v.studentId as ITenantUser)?.firstName + ' ' + (v.studentId as ITenantUser)?.lastName,
        studentUsername: (v.studentId as ITenantUser)?.username,
        recordedByUsername: (v.recordedById as ITenantUser)?.username,
      })));
      setStudents(studentsData.filter(s => s.userId?.isActive).sort((a,b) => a.userId.lastName.localeCompare(b.userId.lastName)));
      
    } catch (error: any) {
      message.error(error.message || 'Could not load data.');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, API_VISITS_URL, API_STUDENTS_URL]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddVisit = () => {
    form.resetFields();
    form.setFieldsValue({ checkInTime: moment() });
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const response = await fetch(API_VISITS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error((await response.json()).error || `Failed to log visit`);

      message.success(`Visit logged successfully`);
      setIsModalVisible(false);
      fetchData(); // Refresh the list of visits
    } catch (error: any) {
      message.error(error.message || `Could not log visit.`);
    }
  };

  const columns = [
    { title: 'Student Name', dataIndex: 'studentName', key: 'studentName', sorter: (a: VisitDataType, b: VisitDataType) => (a.studentName || '').localeCompare(b.studentName || '') },
    { title: 'Symptoms', dataIndex: 'symptoms', key: 'symptoms', ellipsis: true },
    { title: 'Check-in Time', dataIndex: 'checkInTime', key: 'checkInTime', render: (date: string) => moment(date).format('lll'), sorter: (a: VisitDataType, b: VisitDataType) => moment(a.checkInTime).unix() - moment(b.checkInTime).unix(), defaultSortOrder: 'descend' as 'descend' },
    { title: 'Check-out Time', dataIndex: 'checkOutTime', key: 'checkOutTime', render: (date?: string) => date ? moment(date).format('lll') : <Tag color="blue">Checked In</Tag> },
    { title: 'Recorded By', dataIndex: 'recordedByUsername', key: 'recordedByUsername' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: VisitDataType) => (
        <Space>
          <Link href={`/${schoolCode}/portal/pharmacy/visits/${record._id}`}>
             <Button icon={<EditOutlined />}>Manage Visit</Button>
          </Link>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={2} className="!mb-0"><HistoryOutlined className="mr-2"/>Pharmacy Visit Log</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddVisit}>Log New Visit (Check-in)</Button>
      </div>
      <Paragraph>Record and view student visits to the school pharmacy.</Paragraph>

      <Spin spinning={loading}>
        <Table columns={columns} dataSource={visits} rowKey="_id" />
      </Spin>

      <Modal
        title="Log New Student Visit"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting}
        destroyOnClose
        width={700}
      >
        <Form form={form} layout="vertical" name="visitForm" className="mt-4">
            <Form.Item name="studentId" label="Select Student" rules={[{ required: true }]}>
                <Select
                    showSearch
                    placeholder="Search and select student"
                    loading={loading}
                    filterOption={(input, option) => (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())}
                    suffixIcon={<UserOutlined />}
                >
                    {students.map(s => <Option key={s.userId._id} value={s.userId._id.toString()}>{`${s.userId.lastName}, ${s.userId.firstName} (${s.userId.username})`}</Option>)}
                </Select>
            </Form.Item>
             <Form.Item name="checkInTime" label="Check-in Time" rules={[{ required: true }]}>
                <DatePicker showTime style={{width: '100%'}} />
             </Form.Item>
             <Form.Item name="symptoms" label="Symptoms / Reason for Visit" rules={[{ required: true }]}>
                <Input.TextArea rows={4} placeholder="e.g., Headache and fever" />
             </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
