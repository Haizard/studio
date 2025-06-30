
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Select, Card, Form, Input, message, Spin, Row, Col, Space as AntSpace, Alert } from 'antd';
import { UserOutlined, SaveOutlined, HeartOutlined, IdcardOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import type { IHealthRecord } from '@/models/Tenant/HealthRecord';
import type { IStudent } from '@/models/Tenant/Student';
import type { ITenantUser } from '@/models/Tenant/User';
import mongoose from 'mongoose';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

type HealthRecordFormValues = Omit<IHealthRecord, '_id' | 'createdAt' | 'updatedAt' | 'studentId'>;

export default function HealthRecordsPage() {
  const params = useParams();
  const schoolCode = params.schoolCode as string;
  const [form] = Form.useForm();

  const [students, setStudents] = useState<(IStudent & { userId: ITenantUser })[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>();
  const [healthRecord, setHealthRecord] = useState<IHealthRecord | null>(null);

  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const STUDENTS_API = `/api/${schoolCode}/portal/students`;
  const HEALTH_RECORD_API_BASE = `/api/${schoolCode}/portal/pharmacy/health-records`;

  useEffect(() => {
    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const res = await fetch(STUDENTS_API);
        if (!res.ok) throw new Error('Failed to fetch students');
        const data: (IStudent & { userId: ITenantUser })[] = await res.json();
        setStudents(data.filter(s => s.userId?.isActive).sort((a, b) => a.userId.lastName.localeCompare(b.userId.lastName)));
      } catch (err: any) { message.error(err.message || "Could not load student list."); }
      finally { setLoadingStudents(false); }
    };
    fetchStudents();
  }, [schoolCode, STUDENTS_API]);

  const fetchHealthRecord = useCallback(async (studentUserId: string) => {
    setLoadingRecord(true);
    setError(null);
    setHealthRecord(null);
    form.resetFields();
    try {
      const res = await fetch(`${HEALTH_RECORD_API_BASE}/${studentUserId}`);
      if (res.status === 404) {
        // No record exists, prepare for creation
        setHealthRecord(null);
        form.resetFields(); // Ensure form is clear
      } else if (!res.ok) {
        throw new Error((await res.json()).error || 'Failed to fetch health record');
      } else {
        const data: IHealthRecord = await res.json();
        setHealthRecord(data);
        form.setFieldsValue({
          ...data,
          emergencyContactName: data.emergencyContact.name,
          emergencyContactRelationship: data.emergencyContact.relationship,
          emergencyContactPhone: data.emergencyContact.phone,
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingRecord(false);
    }
  }, [HEALTH_RECORD_API_BASE, form]);

  useEffect(() => {
    if (selectedStudentId) {
      fetchHealthRecord(selectedStudentId);
    } else {
      setHealthRecord(null);
      form.resetFields();
    }
  }, [selectedStudentId, fetchHealthRecord]);

  const handleSave = async (values: any) => {
    if (!selectedStudentId) {
      message.error("Please select a student first.");
      return;
    }
    setSaving(true);
    try {
        const payload = {
            bloodType: values.bloodType,
            allergies: values.allergies || [],
            medicalConditions: values.medicalConditions || [],
            emergencyContact: {
                name: values.emergencyContactName,
                relationship: values.emergencyContactRelationship,
                phone: values.emergencyContactPhone,
            },
            notes: values.notes
        };
        const res = await fetch(`${HEALTH_RECORD_API_BASE}/${selectedStudentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to save health record');
        message.success('Health record saved successfully!');
        fetchHealthRecord(selectedStudentId); // Refresh data after save
    } catch (err: any) {
        message.error(err.message || "Failed to save health record.");
    } finally {
        setSaving(false);
    }
  };

  return (
    <div>
      <Title level={2} className="mb-6"><IdcardOutlined className="mr-2"/>Student Health Records</Title>
      <Paragraph>Select a student to view, create, or update their health record.</Paragraph>
      <Card className="mb-6">
        <AntSpace direction="vertical" style={{ width: '100%' }}>
            <Text>Select Student:</Text>
            <Select
                showSearch
                style={{ width: '100%' }}
                placeholder="Search and select a student"
                value={selectedStudentId}
                onChange={setSelectedStudentId}
                loading={loadingStudents}
                filterOption={(input, option) => (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())}
                suffixIcon={<UserOutlined />}
            >
                {students.map(s => <Option key={s.userId._id} value={s.userId._id.toString()}>{`${s.userId.lastName}, ${s.userId.firstName} (${s.studentIdNumber})`}</Option>)}
            </Select>
        </AntSpace>
      </Card>
      {selectedStudentId && (
        loadingRecord ? <div className="text-center p-8"><Spin tip="Loading health record..." /></div> :
        <Card title={<><HeartOutlined className="mr-2"/>Health Information for {students.find(s => s.userId._id === selectedStudentId)?.userId.firstName} {students.find(s => s.userId._id === selectedStudentId)?.userId.lastName}</>}>
            {error && <Alert message="Error" description={error} type="error" showIcon className="mb-4"/>}
            <Form form={form} layout="vertical" onFinish={handleSave} name="healthRecordForm">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="bloodType" label="Blood Type">
                    <Select placeholder="Select blood type" allowClear>
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => <Option key={bt} value={bt}>{bt}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="allergies" label="Allergies">
                    <Select mode="tags" placeholder="e.g., Peanuts, Penicillin. Type and press enter."/>
                  </Form.Item>
                </Col>
              </Row>
               <Form.Item name="medicalConditions" label="Chronic Medical Conditions">
                 <Select mode="tags" placeholder="e.g., Asthma, Diabetes. Type and press enter."/>
               </Form.Item>
               
               <Title level={5} className="mt-6 mb-3">Emergency Contact</Title>
               <Row gutter={16}>
                <Col span={12}>
                    <Form.Item name="emergencyContactName" label="Full Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g., Jane Doe"/>
                    </Form.Item>
                </Col>
                <Col span={6}>
                    <Form.Item name="emergencyContactRelationship" label="Relationship" rules={[{ required: true }]}>
                        <Input placeholder="e.g., Mother"/>
                    </Form.Item>
                </Col>
                 <Col span={6}>
                    <Form.Item name="emergencyContactPhone" label="Phone Number" rules={[{ required: true }]}>
                        <Input placeholder="e.g., 0712 345 678"/>
                    </Form.Item>
                </Col>
               </Row>
                <Form.Item name="notes" label="Additional Notes">
                    <Input.TextArea rows={4} placeholder="Any other relevant health information."/>
                </Form.Item>
               <Form.Item>
                <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined/>}>
                  {healthRecord ? 'Update Record' : 'Create Record'}
                </Button>
              </Form.Item>
            </Form>
        </Card>
      )}
    </div>
  );
}
