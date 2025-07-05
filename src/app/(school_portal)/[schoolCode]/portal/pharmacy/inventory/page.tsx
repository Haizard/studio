
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Table, Modal, Form, Input, Select, message, Tag, Space, Spin, Popconfirm, InputNumber, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import type { IMedication } from '@/models/Tenant/Medication';

const { Title } = Typography;
const { Option } = Select;

interface MedicationDataType extends IMedication {
  key: string;
}

const unitOptions = ['tablets', 'ml', 'bottles', 'tubes', 'strips'];

export default function MedicationInventoryPage() {
  const params = useParams();
  const schoolCode = params.schoolCode as string;

  const [medications, setMedications] = useState<MedicationDataType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingMedication, setEditingMedication] = useState<MedicationDataType | null>(null);
  const [form] = Form.useForm();

  const API_URL_BASE = `/api/${schoolCode}/portal/pharmacy/medications`;

  const fetchMedications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL_BASE);
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch medications');
      const data: IMedication[] = await response.json();
      setMedications(data.map(med => ({ ...med, key: med._id })));
    } catch (error: any) {
      message.error(error.message || 'Could not load medications.');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, API_URL_BASE]);

  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  const handleAddMedication = () => {
    setEditingMedication(null);
    form.resetFields();
    form.setFieldsValue({ stock: 0, unit: 'tablets' });
    setIsModalVisible(true);
  };

  const handleEditMedication = (med: MedicationDataType) => {
    setEditingMedication(med);
    form.setFieldsValue({ ...med });
    setIsModalVisible(true);
  };

  const handleDeleteMedication = async (medicationId: string) => {
    try {
      const response = await fetch(`${API_URL_BASE}/${medicationId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to delete medication');
      message.success('Medication deleted successfully');
      fetchMedications();
    } catch (error: any) {
      message.error(error.message || 'Could not delete medication.');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values };
      
      const url = editingMedication ? `${API_URL_BASE}/${editingMedication._id}` : API_URL_BASE;
      const method = editingMedication ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error((await response.json()).error || `Failed to ${editingMedication ? 'update' : 'add'} medication`);
      
      message.success(`Medication ${editingMedication ? 'updated' : 'added'} successfully`);
      setIsModalVisible(false);
      fetchMedications();
    } catch (error: any) {
      message.error(error.message || `Could not save medication.`);
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: 'Brand', dataIndex: 'brand', key: 'brand', render: (brand?: string) => brand || '-' },
    { 
      title: 'Stock', 
      dataIndex: 'stock', 
      key: 'stock', 
      sorter: (a, b) => a.stock - b.stock,
      render: (stock: number, record: MedicationDataType) => {
        const isLowStock = record.lowStockThreshold !== undefined && stock <= record.lowStockThreshold;
        return <Tag color={isLowStock ? 'error' : 'success'}>{stock} {record.unit}</Tag>;
      }
    },
    { title: 'Low Stock Threshold', dataIndex: 'lowStockThreshold', key: 'lowStockThreshold', render: (val?: number) => val ?? '-' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: MedicationDataType) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEditMedication(record)}>Edit</Button>
          <Popconfirm
            title="Delete this medication?"
            description="This action cannot be undone. Ensure it has not been dispensed recently."
            onConfirm={() => handleDeleteMedication(record._id)}
            okText="Yes, Delete"
            cancelText="No"
          >
            <Button icon={<DeleteOutlined />} danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={2}><UnorderedListOutlined className="mr-2"/>Medication Inventory</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddMedication}>
          Add Medication
        </Button>
      </div>
      <Spin spinning={loading}>
        <Table columns={columns} dataSource={medications} rowKey="_id" />
      </Spin>

      <Modal
        title={editingMedication ? 'Edit Medication' : 'Add New Medication'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting}
        destroyOnClose
        width={700}
      >
        <Form form={form} layout="vertical" name="medicationForm" className="mt-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Medication Name" rules={[{ required: true }]}>
                <Input placeholder="e.g., Paracetamol 500mg" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="brand" label="Brand (Optional)">
                <Input placeholder="e.g., Panadol" />
              </Form.Item>
            </Col>
          </Row>
           <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="stock" label="Current Stock" rules={[{ required: true, type: 'number', min: 0 }]}>
                <InputNumber min={0} style={{width: "100%"}} placeholder="e.g. 100"/>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unit" label="Unit" rules={[{ required: true }]}>
                <Select placeholder="Select unit">
                  {unitOptions.map(unit => <Option key={unit} value={unit}>{unit.charAt(0).toUpperCase() + unit.slice(1)}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="lowStockThreshold" label="Low Stock Threshold">
                <InputNumber min={0} style={{width: "100%"}} placeholder="e.g. 10"/>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Notes (Optional)">
            <Input.TextArea rows={3} placeholder="e.g., Storage instructions, usage notes" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
