
'use client';
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import {
  Button, Typography, Table, Modal, Form, Select, DatePicker, message, Tag, Space, Spin, Popconfirm, Row, Col, Descriptions
} from 'antd';
import { PlusOutlined, EyeOutlined, FileProtectOutlined, FilterOutlined, SearchOutlined, UserOutlined, CalendarOutlined, StopOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import type { IInvoice } from '@/models/Tenant/Invoice';
import type { IStudent } from '@/models/Tenant/Student';
import type { ITenantUser } from '@/models/Tenant/User';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import type { ITerm } from '@/models/Tenant/Term';
import moment from 'moment';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

interface InvoiceDataType extends Omit<IInvoice, 'studentId'> {
  key: string;
  studentName: string;
}

function InvoicesPageCore() {
  const params = useParams();
  const schoolCode = params.schoolCode as string;

  const [invoices, setInvoices] = useState<InvoiceDataType[]>([]);
  const [students, setStudents] = useState<(IStudent & { userId: ITenantUser })[]>([]);
  const [academicYears, setAcademicYears] = useState<IAcademicYear[]>([]);
  const [terms, setTerms] = useState<ITerm[]>([]);

  const [filteredTerms, setFilteredTerms] = useState<ITerm[]>([]);

  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDataType | null>(null);
  
  const [form] = Form.useForm();
  
  const selectedAcademicYearInModal = Form.useWatch('academicYearId', form);

  // APIs
  const API_URL_BASE = `/api/${schoolCode}/portal/admin/finance/invoices`;
  const STUDENTS_API = `/api/${schoolCode}/portal/students`;
  const ACADEMIC_YEARS_API = `/api/${schoolCode}/portal/academics/academic-years`;
  const TERMS_API = `/api/${schoolCode}/portal/academics/terms`;

  // Fetch data for filters
  useEffect(() => {
    const fetchSupportData = async () => {
        try {
            const [studentsRes, yearsRes, termsRes] = await Promise.all([
                fetch(STUDENTS_API),
                fetch(ACADEMIC_YEARS_API),
                fetch(TERMS_API),
            ]);
            if (!studentsRes.ok || !yearsRes.ok || !termsRes.ok) throw new Error("Failed to load support data.");
            setStudents((await studentsRes.json()).filter((s: any) => s.userId?.isActive));
            setAcademicYears(await yearsRes.json());
            setTerms(await termsRes.json());
        } catch(err: any) {
            message.error(err.message || "Could not load support data.");
        }
    };
    fetchSupportData();
  }, [schoolCode]);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL_BASE);
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch invoices');
      const data: IInvoice[] = await response.json();
      setInvoices(data.map(inv => ({ 
        ...inv, 
        key: inv._id.toString(),
        studentName: `${(inv.studentId as ITenantUser).firstName} ${(inv.studentId as ITenantUser).lastName}`,
      })));
    } catch (error: any) {
      message.error(error.message || 'Could not load invoices.');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, API_URL_BASE]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    if (selectedAcademicYearInModal) {
      setFilteredTerms(terms.filter(term => (term.academicYearId as any)?._id === selectedAcademicYearInModal || term.academicYearId === selectedAcademicYearInModal));
    } else {
      setFilteredTerms([]);
    }
    if(isModalVisible) form.setFieldsValue({ termId: undefined });
  }, [selectedAcademicYearInModal, terms, form, isModalVisible]);
  
  const handleGenerateInvoice = () => {
    form.resetFields();
    const activeYear = academicYears.find(ay => ay.isActive);
    if(activeYear) form.setFieldsValue({ academicYearId: activeYear._id, issueDate: moment(), dueDate: moment().add(30, 'days') });
    else form.setFieldsValue({ issueDate: moment(), dueDate: moment().add(30, 'days') });
    setIsModalVisible(true);
  };
  
  const handleViewInvoice = (invoice: InvoiceDataType) => {
    setSelectedInvoice(invoice);
    setIsViewModalVisible(true);
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`${API_URL_BASE}/${invoiceId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to cancel invoice');
      message.success('Invoice cancelled successfully');
      fetchInvoices();
    } catch (error: any) {
      message.error(error.message || 'Could not cancel invoice.');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values };
      
      const response = await fetch(API_URL_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error((await response.json()).error || 'Failed to generate invoice');
      
      message.success('Invoice generated successfully');
      setIsModalVisible(false);
      fetchInvoices();
    } catch (error: any) {
      message.error(error.message || 'Could not generate invoice.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'success';
      case 'Partial': return 'processing';
      case 'Unpaid': return 'warning';
      case 'Overdue': return 'error';
      case 'Cancelled': return 'default';
      default: return 'default';
    }
  };

  const columns = [
    { title: 'Invoice #', dataIndex: 'invoiceNumber', key: 'invoiceNumber' },
    { title: 'Student', dataIndex: 'studentName', key: 'studentName', sorter: (a, b) => a.studentName.localeCompare(b.studentName) },
    { title: 'Issue Date', dataIndex: 'issueDate', key: 'issueDate', render: (date: string) => moment(date).format('LL'), sorter: (a,b) => moment(a.issueDate).unix() - moment(b.issueDate).unix(), defaultSortOrder: 'descend' as 'descend'},
    { title: 'Due Date', dataIndex: 'dueDate', key: 'dueDate', render: (date: string) => moment(date).format('LL') },
    { title: 'Total Amount', dataIndex: 'totalAmount', key: 'totalAmount', render: (amount: number) => amount.toLocaleString() },
    { title: 'Amount Paid', dataIndex: 'amountPaid', key: 'amountPaid', render: (amount: number) => amount.toLocaleString() },
    { title: 'Balance', dataIndex: 'outstandingBalance', key: 'outstandingBalance', render: (amount: number) => amount.toLocaleString() },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag color={getStatusColor(status)}>{status}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: InvoiceDataType) => (
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => handleViewInvoice(record)} size="small">View</Button>
          <Popconfirm title="Cancel this invoice?" onConfirm={() => handleCancelInvoice(record._id)} okText="Yes" cancelText="No" disabled={record.status === 'Cancelled' || record.amountPaid > 0}>
            <Button icon={<StopOutlined />} danger size="small" disabled={record.status === 'Cancelled' || record.amountPaid > 0}>Cancel</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2} className="mb-6"><FileProtectOutlined className="mr-2"/>Invoice Management</Title>
      <Paragraph>Generate and manage student fee invoices. Invoices are automatically calculated based on mandatory fee items for the selected term.</Paragraph>
      <div className="mb-4">
         <Button type="primary" icon={<PlusOutlined />} onClick={handleGenerateInvoice}>Generate New Invoice</Button>
      </div>

      <Spin spinning={loading}>
        <Table columns={columns} dataSource={invoices} rowKey="_id" scroll={{x: 1000}}/>
      </Spin>

      <Modal
        title="Generate New Invoice"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting}
        destroyOnClose
        width={700}
      >
        <Form form={form} layout="vertical" name="invoiceForm" className="mt-4">
          <Paragraph type="secondary">This will generate an invoice for the selected student including all mandatory fees applicable to their class for the selected academic year and term.</Paragraph>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="studentId" label="Select Student" rules={[{ required: true }]}>
                <Select showSearch placeholder="Search and select student" filterOption={(input, option) => (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())}>
                  {students.map(s => <Option key={s.userId._id} value={s.userId._id.toString()}>{`${s.userId.firstName} ${s.userId.lastName} (${s.userId.username})`}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="academicYearId" label="Academic Year" rules={[{ required: true }]}>
                <Select placeholder="Select academic year">
                    {academicYears.map(year => <Option key={year._id} value={year._id}>{year.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="termId" label="Term (Optional)" help="If specified, only term-specific fees will be included.">
              <Select placeholder="Select term" allowClear disabled={!selectedAcademicYearInModal || filteredTerms.length === 0}>
                  {filteredTerms.map(term => <Option key={term._id} value={term._id.toString()}>{term.name}</Option>)}
              </Select>
          </Form.Item>
           <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="issueDate" label="Issue Date" rules={[{ required: true }]}>
                  <DatePicker style={{width: "100%"}} format="YYYY-MM-DD"/>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="dueDate" label="Due Date" rules={[{ required: true }]}>
                  <DatePicker style={{width: "100%"}} format="YYYY-MM-DD"/>
                </Form.Item>
              </Col>
           </Row>
          <Form.Item name="notes" label="Notes (Optional)">
            <Input.TextArea rows={2} placeholder="e.g., Early payment discount applies." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Invoice Details: ${selectedInvoice?.invoiceNumber}`}
        open={isViewModalVisible}
        onCancel={() => setIsViewModalVisible(false)}
        footer={[ <Button key="back" onClick={() => setIsViewModalVisible(false)}>Close</Button>, <Button key="print" type="primary" disabled>Print</Button> ]}
        width={800}
      >
        {selectedInvoice && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Student">{selectedInvoice.studentName}</Descriptions.Item>
            <Descriptions.Item label="Status"><Tag color={getStatusColor(selectedInvoice.status)}>{selectedInvoice.status}</Tag></Descriptions.Item>
            <Descriptions.Item label="Issue Date">{moment(selectedInvoice.issueDate).format('LL')}</Descriptions.Item>
            <Descriptions.Item label="Due Date">{moment(selectedInvoice.dueDate).format('LL')}</Descriptions.Item>
            <Descriptions.Item label="Items">
                <Table 
                    dataSource={selectedInvoice.items} 
                    rowKey="feeItemId" 
                    pagination={false} 
                    size="small"
                    columns={[
                        {title: 'Description', dataIndex: 'description', key: 'description'},
                        {title: 'Amount', dataIndex: 'amount', key: 'amount', render: (val) => val.toLocaleString(), align: 'right'},
                    ]}
                />
            </Descriptions.Item>
            <Descriptions.Item label="Total Amount"><b>{selectedInvoice.totalAmount.toLocaleString()}</b></Descriptions.Item>
            <Descriptions.Item label="Amount Paid">{selectedInvoice.amountPaid.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="Outstanding Balance"><b>{selectedInvoice.outstandingBalance.toLocaleString()}</b></Descriptions.Item>
             <Descriptions.Item label="Notes">{selectedInvoice.notes || 'N/A'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}

export default function InvoicesPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Spin size="large" /></div>}>
            <InvoicesPageCore />
        </Suspense>
    );
}
