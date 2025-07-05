
'use client';
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Button, Typography, Table, Modal, Form, Select, DatePicker, message, Tag, Space, Spin, Popconfirm, Input } from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined, HistoryOutlined } from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import type { IVisit } from '@/models/Tenant/Visit';
import type { ITenantUser } from '@/models/Tenant/User';
import type { IStudent } from '@/models/Tenant/Student';
import moment from 'moment';

const { Title, Paragraph } = Typography;
const { Option } = Select;

interface VisitDataType extends Omit<IVisit, 'studentId'> {
  key: string;
  studentName?: string;
}

function PharmacyVisitsCore() {
    const params = useParams();
    const router = useRouter();
    const schoolCode = params.schoolCode as string;

    const [visits, setVisits] = useState<VisitDataType[]>([]);
    const [students, setStudents] = useState<(IStudent & { userId: ITenantUser })[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    const VISITS_API = `/api/${schoolCode}/portal/pharmacy/visits`;
    const STUDENTS_API = `/api/${schoolCode}/portal/students`;

    const fetchVisits = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(VISITS_API);
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch visits');
            const data: IVisit[] = await response.json();
            setVisits(data.map(v => ({
                ...v,
                key: v._id,
                studentName: v.studentId ? `${(v.studentId as ITenantUser).firstName} ${(v.studentId as ITenantUser).lastName}` : 'N/A',
            })));
        } catch (error: any) {
            message.error(error.message || 'Could not load visit logs.');
        } finally {
            setLoading(false);
        }
    }, [schoolCode, VISITS_API]);

    const fetchStudents = useCallback(async () => {
        try {
            const res = await fetch(STUDENTS_API);
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch students');
            setStudents((await res.json()).filter((s:any) => s.userId?.isActive));
        } catch(err:any) {
            message.error(err.message || 'Could not load students');
        }
    }, [schoolCode, STUDENTS_API]);

    useEffect(() => {
        fetchVisits();
        fetchStudents();
    }, [fetchVisits, fetchStudents]);

    const handleLogVisit = () => {
        form.resetFields();
        form.setFieldsValue({ checkInTime: moment() });
        setIsModalVisible(true);
    };

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            const payload = {
                ...values,
                checkInTime: values.checkInTime.toISOString(),
            };
            const response = await fetch(VISITS_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to log visit');
            const newVisit = await response.json();
            message.success('Visit logged successfully. Redirecting to manage visit...');
            setIsModalVisible(false);
            router.push(`/${schoolCode}/portal/pharmacy/visits/${newVisit._id}`);
        } catch (error: any) {
            message.error(error.message || 'Could not log visit.');
        }
    };

    const columns = [
        { title: 'Student', dataIndex: 'studentName', key: 'studentName', sorter: (a, b) => (a.studentName || '').localeCompare(b.studentName || '') },
        { title: 'Check-in Time', dataIndex: 'checkInTime', key: 'checkInTime', render: (date: string) => moment(date).format('llll'), defaultSortOrder: 'descend' as 'descend', sorter: (a,b) => moment(a.checkInTime).unix() - moment(b.checkInTime).unix() },
        { title: 'Symptoms', dataIndex: 'symptoms', key: 'symptoms', ellipsis: true },
        { title: 'Status', key: 'status', render: (_: any, record: VisitDataType) => (
            <Tag color={record.checkOutTime ? 'green' : 'blue'}>
                {record.checkOutTime ? 'Checked Out' : 'Checked In'}
            </Tag>
        )},
        { title: 'Check-out Time', dataIndex: 'checkOutTime', key: 'checkOutTime', render: (date?: string) => date ? moment(date).format('llll') : 'N/A' },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: VisitDataType) => (
                <Button icon={<EyeOutlined />} onClick={() => router.push(`/${schoolCode}/portal/pharmacy/visits/${record._id}`)}>
                    Manage Visit
                </Button>
            ),
        },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <Title level={2}><HistoryOutlined className="mr-2"/>Pharmacy Visit Log</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleLogVisit}>Log New Visit</Button>
            </div>
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
            >
                <Form form={form} layout="vertical" name="visitForm" className="mt-4">
                    <Form.Item name="studentId" label="Select Student" rules={[{ required: true }]}>
                        <Select
                            showSearch
                            placeholder="Search and select student"
                            filterOption={(input, option) => (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())}
                        >
                            {students.map(s => <Option key={s.userId._id} value={s.userId._id.toString()}>{`${s.userId.firstName} ${s.userId.lastName} (${s.userId.username})`}</Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item name="checkInTime" label="Check-in Time" rules={[{ required: true }]}>
                        <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{width: '100%'}}/>
                    </Form.Item>
                    <Form.Item name="symptoms" label="Presenting Symptoms" rules={[{ required: true }]}>
                        <Input.TextArea rows={4} placeholder="e.g., Headache, fever, stomach ache" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

export default function PharmacyVisitsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Spin size="large" /></div>}>
            <PharmacyVisitsCore />
        </Suspense>
    );
}
