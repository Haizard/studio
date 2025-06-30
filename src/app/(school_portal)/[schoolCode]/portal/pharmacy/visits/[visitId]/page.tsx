
'use client';
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Button, Typography, Form, Input, message, Spin, Row, Col, Card, Descriptions, Alert, Breadcrumb, Popconfirm, List, Modal, Select, InputNumber } from 'antd';
import { SaveOutlined, ArrowLeftOutlined, MedicineBoxOutlined, LogoutOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import type { IVisit } from '@/models/Tenant/Visit';
import type { ITenantUser } from '@/models/Tenant/User';
import type { IDispensation } from '@/models/Tenant/Dispensation';
import type { IMedication } from '@/models/Tenant/Medication';
import mongoose from 'mongoose';
import moment from 'moment';
import Link from 'next/link';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

interface PopulatedDispensation extends Omit<IDispensation, 'medicationId' | 'dispensedById'> {
    medicationId: IMedication;
    dispensedById: ITenantUser;
}

interface VisitDetails extends IVisit {
    studentId: ITenantUser;
    recordedById: ITenantUser;
    dispensations: PopulatedDispensation[];
}

function ManageVisitCore() {
    const params = useParams();
    const router = useRouter();
    const schoolCode = params.schoolCode as string;
    const visitId = params.visitId as string;
    const [form] = Form.useForm();
    const [dispenseForm] = Form.useForm();

    const [visit, setVisit] = useState<VisitDetails | null>(null);
    const [medications, setMedications] = useState<IMedication[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [loadingMeds, setLoadingMeds] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isDispenseModalVisible, setIsDispenseModalVisible] = useState(false);

    const [error, setError] = useState<string | null>(null);
    
    const API_VISIT_URL = `/api/${schoolCode}/portal/pharmacy/visits/${visitId}`;
    const API_MEDICATIONS_URL = `/api/${schoolCode}/portal/pharmacy/medications`;
    const API_DISPENSATIONS_URL = `/api/${schoolCode}/portal/pharmacy/dispensations`;

    const fetchVisit = useCallback(async () => {
        if (!mongoose.Types.ObjectId.isValid(visitId)) {
            setError("Invalid visit ID provided.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(API_VISIT_URL);
            if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch visit details");
            const data: VisitDetails = await res.json();
            setVisit(data);
            form.setFieldsValue({
                diagnosis: data.diagnosis,
                treatment: data.treatment,
                notes: data.notes,
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [visitId, schoolCode, API_VISIT_URL, form]);

    const fetchMedications = useCallback(async () => {
        setLoadingMeds(true);
        try {
            const res = await fetch(API_MEDICATIONS_URL);
            if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch medications");
            setMedications(await res.json());
        } catch(err: any) {
            message.error(err.message || "Could not load medication list.");
        } finally {
            setLoadingMeds(false);
        }
    }, [schoolCode, API_MEDICATIONS_URL]);

    useEffect(() => {
        fetchVisit();
        fetchMedications();
    }, [fetchVisit, fetchMedications]);

    const handleSave = async (checkout: boolean = false) => {
        setSaving(true);
        try {
            const values = await form.validateFields();
            const payload = { ...values, performCheckout: checkout };
            const res = await fetch(API_VISIT_URL, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error((await res.json()).error || "Failed to save visit details");
            message.success(`Visit details ${checkout ? 'and checkout' : ''} saved successfully!`);
            fetchVisit(); // Refresh data
        } catch (err: any) {
            message.error(err.message || "Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };
    
    const handleDispenseModalOpen = () => {
        dispenseForm.resetFields();
        setIsDispenseModalVisible(true);
    };

    const handleDispenseSubmit = async () => {
        try {
            const values = await dispenseForm.validateFields();
            const payload = {
                visitId,
                medicationId: values.medicationId,
                quantityDispensed: values.quantityDispensed,
                notes: values.notes,
            };
            const res = await fetch(API_DISPENSATIONS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error((await res.json()).error || "Failed to record dispensation");
            message.success("Medication dispensed successfully!");
            setIsDispenseModalVisible(false);
            fetchVisit(); // Refresh visit data to show new dispensation
            fetchMedications(); // Refresh medication list for stock update
        } catch (err: any) {
            message.error(err.message || "Failed to dispense medication.");
        }
    };
    
    const handleDeleteDispensation = async (dispensationId: string) => {
        try {
            const res = await fetch(`${API_DISPENSATIONS_URL}/${dispensationId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error((await res.json()).error || "Failed to delete dispensation");
            message.success("Dispensation record deleted successfully.");
            fetchVisit(); // Refresh visit data
            fetchMedications(); // Refresh medication list for stock update
        } catch (err: any) {
            message.error(err.message || "Failed to delete dispensation record.");
        }
    };

    const breadcrumbItems = [
        { title: <Link href={`/${schoolCode}/portal/dashboard`}>Dashboard</Link> },
        { title: <Link href={`/${schoolCode}/portal/pharmacy`}>Pharmacy</Link> },
        { title: <Link href={`/${schoolCode}/portal/pharmacy/visits`}>Visit Log</Link> },
        { title: visit ? `Visit: ${visit.studentId.firstName} ${visit.studentId.lastName}` : 'Loading...' },
    ];

    if (loading) return <div className="flex justify-center items-center h-64"><Spin tip="Loading visit details..." /></div>;
    if (error) return <Alert message="Error" description={error} type="error" showIcon action={<Button onClick={() => router.back()} icon={<ArrowLeftOutlined/>}>Back to Visit Log</Button>} />;
    if (!visit) return <Alert message="Not Found" description="The visit record could not be found." type="warning" showIcon />;

    return (
        <div>
            <Breadcrumb items={breadcrumbItems} className="mb-4" />
            <div className="flex justify-between items-center mb-4">
                 <Title level={2} className="!mb-0">Manage Pharmacy Visit</Title>
                 <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(`/${schoolCode}/portal/pharmacy/visits`)}>Back to Log</Button>
            </div>
           
            <Card className="mb-6">
                <Descriptions title="Visit Information" bordered>
                    <Descriptions.Item label="Student">{`${visit.studentId.firstName} ${visit.studentId.lastName} (${visit.studentId.username})`}</Descriptions.Item>
                    <Descriptions.Item label="Check-in Time">{moment(visit.checkInTime).format('llll')}</Descriptions.Item>
                    <Descriptions.Item label="Status">{visit.checkOutTime ? <Tag color="green">Checked Out</Tag> : <Tag color="blue">Checked In</Tag>}</Descriptions.Item>
                    <Descriptions.Item label="Check-out Time">{visit.checkOutTime ? moment(visit.checkOutTime).format('llll') : 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Initial Symptoms" span={2}>{visit.symptoms}</Descriptions.Item>
                </Descriptions>
            </Card>

            <Form form={form} layout="vertical" onFinish={() => handleSave(false)}>
                <Row gutter={24}>
                    <Col xs={24} md={12}>
                        <Card title="Diagnosis & Treatment" className="h-full">
                            <Form.Item name="diagnosis" label="Diagnosis">
                                <Input.TextArea rows={3} placeholder="e.g., Common cold" disabled={!!visit.checkOutTime}/>
                            </Form.Item>
                             <Form.Item name="treatment" label="Treatment Given">
                                <Input.TextArea rows={3} placeholder="e.g., Advised rest, dispensed Paracetamol" disabled={!!visit.checkOutTime}/>
                            </Form.Item>
                             <Form.Item name="notes" label="Additional Notes">
                                <Input.TextArea rows={3} placeholder="Any other notes for this visit" disabled={!!visit.checkOutTime}/>
                            </Form.Item>
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Card 
                            title={<><MedicineBoxOutlined className="mr-2"/>Medication Dispensed</>}
                            extra={!visit.checkOutTime && <Button icon={<PlusOutlined/>} onClick={handleDispenseModalOpen}>Add Dispensation</Button>}
                            className="h-full"
                        >
                           {visit.dispensations.length === 0 ? <Empty description="No medication dispensed for this visit."/> :
                            <List
                                itemLayout="horizontal"
                                dataSource={visit.dispensations}
                                renderItem={item => (
                                <List.Item
                                    actions={[
                                        <Popconfirm
                                            title="Delete this dispensation?"
                                            description="This will add the stock back to inventory. This action cannot be undone."
                                            onConfirm={() => handleDeleteDispensation(item._id.toString())}
                                            okText="Yes"
                                            cancelText="No"
                                            disabled={!!visit.checkOutTime}
                                        >
                                            <Button type="text" danger icon={<DeleteOutlined />} disabled={!!visit.checkOutTime} />
                                        </Popconfirm>
                                    ]}
                                >
                                    <List.Item.Meta
                                    title={`${item.medicationId.name} ${item.medicationId.brand ? `(${item.medicationId.brand})`: ''}`}
                                    description={
                                        <>
                                            <Text>Quantity: {item.quantityDispensed} {item.medicationId.unit}</Text>
                                            <br />
                                            <Text type="secondary">Dispensed on: {moment(item.dispensationDate).format('lll')}</Text>
                                            {item.notes && <><br/><Text type="secondary">Notes: {item.notes}</Text></>}
                                        </>
                                    }
                                    />
                                </List.Item>
                                )}
                            />
                           }
                        </Card>
                    </Col>
                </Row>
                 <Row justify="end" className="mt-6">
                    <Col>
                        <Space>
                            <Button type="primary" onClick={() => handleSave(false)} loading={saving} disabled={!!visit.checkOutTime}>
                                <SaveOutlined/> Save Details
                            </Button>
                             <Popconfirm
                                title="Check Out Student?"
                                description="This will finalize the visit record. You cannot edit details after checkout. Proceed?"
                                onConfirm={() => handleSave(true)}
                                okText="Yes, Check Out"
                                cancelText="No"
                                disabled={!!visit.checkOutTime}
                            >
                                <Button type="primary" danger icon={<LogoutOutlined />} loading={saving} disabled={!!visit.checkOutTime}>
                                    Save & Check Out
                                </Button>
                            </Popconfirm>
                        </Space>
                    </Col>
                </Row>
            </Form>

            <Modal
                title="Dispense Medication"
                open={isDispenseModalVisible}
                onCancel={() => setIsDispenseModalVisible(false)}
                onOk={handleDispenseSubmit}
                confirmLoading={saving}
                destroyOnClose
            >
                <Form form={dispenseForm} layout="vertical" className="mt-4">
                    <Form.Item name="medicationId" label="Medication" rules={[{required: true}]}>
                        <Select
                            showSearch
                            placeholder="Search and select medication"
                            loading={loadingMeds}
                            filterOption={(input, option) => (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())}
                        >
                            {medications.map(med => (
                                <Option key={med._id} value={med._id} disabled={med.stock <= 0}>
                                    {med.name} {med.brand ? `(${med.brand})` : ''} - (Stock: {med.stock} {med.unit})
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="quantityDispensed" label="Quantity Dispensed" rules={[{required: true, type: 'number', min: 1}]}>
                        <InputNumber style={{width: '100%'}} placeholder="e.g., 2"/>
                    </Form.Item>
                     <Form.Item name="notes" label="Notes (Optional)">
                        <Input.TextArea rows={2} placeholder="e.g., Dosage instructions"/>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

export default function ManageVisitPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Spin size="large" /></div>}>
            <ManageVisitCore />
        </Suspense>
    );
}
