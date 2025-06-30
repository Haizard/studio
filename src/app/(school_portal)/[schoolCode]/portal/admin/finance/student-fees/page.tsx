
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Button, Typography, Table, Modal, Form, Input, Select, DatePicker, message, Tag, Space, Spin, Popconfirm, InputNumber, Row, Col
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DollarCircleOutlined, SearchOutlined, FilterOutlined, UserOutlined, ReadOutlined, CalendarOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import type { IFeePayment, PaymentMethod } from '@/models/Tenant/FeePayment';
import type { IStudent } from '@/models/Tenant/Student';
import type { ITenantUser } from '@/models/Tenant/User';
import type { IFeeItem } from '@/models/Tenant/FeeItem';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import type { ITerm } from '@/models/Tenant/Term';
import moment from 'moment';
import mongoose from 'mongoose';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const paymentMethods: PaymentMethod[] = ['Cash', 'Bank Transfer', 'Mobile Money', 'Cheque', 'Online Payment', 'Other'];

interface FeePaymentDataType extends Omit<IFeePayment, 'studentId' | 'feeItemId' | 'academicYearId' | 'termId' | 'recordedById'> {
  key: string;
  _id: string;
  studentName?: string;
  feeItemName?: string;
  academicYearName?: string;
  termName?: string;
  recordedByUsername?: string;
}

export default function StudentFeePaymentsPage() {
  const params = useParams();
  const schoolCode = params.schoolCode as string;

  const [payments, setPayments] = useState<FeePaymentDataType[]>([]);
  const [students, setStudents] = useState<(IStudent & { userId: ITenantUser })[]>([]);
  const [feeItems, setFeeItems] = useState<IFeeItem[]>([]);
  const [academicYears, setAcademicYears] = useState<IAcademicYear[]>([]);
  const [terms, setTerms] = useState<ITerm[]>([]);
  
  const [filteredFeeItems, setFilteredFeeItems] = useState<IFeeItem[]>([]);
  const [filteredTerms, setFilteredTerms] = useState<ITerm[]>([]);

  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPayment, setEditingPayment] = useState<FeePaymentDataType | null>(null);
  const [form] = Form.useForm();

  // Filter states
  const [filterStudentId, setFilterStudentId] = useState<string | undefined>();
  const [filterFeeItemId, setFilterFeeItemId] = useState<string | undefined>();
  const [filterAcademicYearId, setFilterAcademicYearId] = useState<string | undefined>();
  const [filterDateRange, setFilterDateRange] = useState<[moment.Moment, moment.Moment] | null>(null);


  const API_URL_BASE = `/api/${schoolCode}/portal/admin/finance/fee-payments`;
  const STUDENTS_API = `/api/${schoolCode}/portal/students`;
  const FEE_ITEMS_API = `/api/${schoolCode}/portal/admin/finance/fee-items`;
  const ACADEMIC_YEARS_API = `/api/${schoolCode}/portal/academics/academic-years`;
  const TERMS_API_BASE = `/api/${schoolCode}/portal/academics/terms`;


  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsRes, feeItemsRes, yearsRes, termsRes] = await Promise.all([
        fetch(STUDENTS_API),
        fetch(FEE_ITEMS_API),
        fetch(ACADEMIC_YEARS_API),
        fetch(TERMS_API_BASE) // Fetch all terms
      ]);

      if (!studentsRes.ok) throw new Error('Failed to fetch students');
      if (!feeItemsRes.ok) throw new Error('Failed to fetch fee items');
      if (!yearsRes.ok) throw new Error('Failed to fetch academic years');
      if (!termsRes.ok) throw new Error('Failed to fetch terms');

      setStudents(await studentsRes.json());
      setFeeItems(await feeItemsRes.json());
      const yearsData: IAcademicYear[] = await yearsRes.json();
      setAcademicYears(yearsData.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
      setTerms(await termsRes.json());

      const activeYear = yearsData.find(y => y.isActive);
      if (activeYear) {
        setFilterAcademicYearId(activeYear._id); // Default filter to active year
        form.setFieldsValue({ academicYearId: activeYear._id });
        // This will trigger the useEffect for filtering terms & fee items if modal is open
      }

    } catch (error: any) {
      message.error(error.message || 'Could not load initial supporting data.');
    } finally {
      setLoading(false); // Set loading to false after initial data fetch
    }
  }, [schoolCode, STUDENTS_API, FEE_ITEMS_API, ACADEMIC_YEARS_API, TERMS_API_BASE, form]);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filterStudentId) query.append('studentId', filterStudentId);
      if (filterFeeItemId) query.append('feeItemId', filterFeeItemId);
      if (filterAcademicYearId) query.append('academicYearId', filterAcademicYearId);
      if (filterDateRange) {
        query.append('startDate', filterDateRange[0].format('YYYY-MM-DD'));
        query.append('endDate', filterDateRange[1].format('YYYY-MM-DD'));
      }
      
      const response = await fetch(`${API_URL_BASE}?${query.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch fee payments');
      const data: IFeePayment[] = await response.json();
      
      setPayments(data.map(p => ({
        ...p,
        key: p._id.toString(),
        _id: p._id.toString(),
        studentName: `${(p.studentId as ITenantUser)?.firstName} ${(p.studentId as ITenantUser)?.lastName} (${(p.studentId as ITenantUser)?.username})`,
        feeItemName: (p.feeItemId as IFeeItem)?.name,
        academicYearName: (p.academicYearId as IAcademicYear)?.name,
        termName: (p.termId as ITerm)?.name || '-',
        recordedByUsername: (p.recordedById as ITenantUser)?.username,
      })));
    } catch (error: any) {
      message.error(error.message || 'Could not load fee payments.');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, API_URL_BASE, filterStudentId, filterFeeItemId, filterAcademicYearId, filterDateRange]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);
  
  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const selectedAcademicYearInModal = Form.useWatch('academicYearId', form);

  useEffect(() => {
    if (selectedAcademicYearInModal) {
      setFilteredFeeItems(feeItems.filter(fi => (fi.academicYearId as IAcademicYear)?._id === selectedAcademicYearInModal || fi.academicYearId.toString() === selectedAcademicYearInModal));
      setFilteredTerms(terms.filter(t => (t.academicYearId as IAcademicYear)?._id === selectedAcademicYearInModal || t.academicYearId.toString() === selectedAcademicYearInModal));
    } else {
      setFilteredFeeItems(feeItems); // Or empty if AY is mandatory for fee items too
      setFilteredTerms(terms); // Or empty
    }
    if (isModalVisible) { // Reset dependent fields if AY changes in modal
        form.setFieldsValue({ feeItemId: undefined, termId: undefined });
    }
  }, [selectedAcademicYearInModal, feeItems, terms, isModalVisible, form]);

  const handleAddPayment = () => {
    setEditingPayment(null);
    form.resetFields();
    const activeYear = academicYears.find(ay => ay.isActive);
    form.setFieldsValue({ 
        paymentDate: moment(),
        academicYearId: activeYear?._id,
        paymentMethod: 'Cash', // Default payment method
    });
    if (activeYear?._id) {
        setFilteredFeeItems(feeItems.filter(fi => (fi.academicYearId as IAcademicYear)?._id === activeYear?._id || fi.academicYearId.toString() === activeYear?._id));
        setFilteredTerms(terms.filter(t => (t.academicYearId as IAcademicYear)?._id === activeYear?._id || t.academicYearId.toString() === activeYear?._id));
    }
    setIsModalVisible(true);
  };

  const handleEditPayment = (payment: FeePaymentDataType) => {
    setEditingPayment(payment);
    const ayId = (payment.academicYearId as unknown as IAcademicYear)?._id || payment.academicYearId;
    if(ayId) {
        setFilteredFeeItems(feeItems.filter(fi => (fi.academicYearId as IAcademicYear)?._id === ayId || fi.academicYearId.toString() === ayId));
        setFilteredTerms(terms.filter(t => (t.academicYearId as IAcademicYear)?._id === ayId || t.academicYearId.toString() === ayId));
    }
    form.setFieldsValue({
      ...payment,
      studentId: (payment.studentId as unknown as ITenantUser)?._id || payment.studentId,
      feeItemId: (payment.feeItemId as unknown as IFeeItem)?._id || payment.feeItemId,
      academicYearId: ayId,
      termId: (payment.termId as unknown as ITerm)?._id || payment.termId,
      paymentDate: moment(payment.paymentDate),
    });
    setIsModalVisible(true);
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      const response = await fetch(`${API_URL_BASE}/${paymentId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete payment');
      message.success('Payment deleted successfully');
      fetchPayments();
    } catch (error: any) {
      message.error(error.message || 'Could not delete payment.');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = { 
        ...values, 
        paymentDate: values.paymentDate.toISOString(),
        amountPaid: Number(values.amountPaid)
      };
      
      const url = editingPayment ? `${API_URL_BASE}/${editingPayment._id}` : API_URL_BASE;
      const method = editingPayment ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingPayment ? 'update' : 'record'} payment`);
      }

      message.success(`Payment ${editingPayment ? 'updated' : 'recorded'} successfully`);
      setIsModalVisible(false);
      fetchPayments();
    } catch (error: any) {
      message.error(error.message || `Could not ${editingPayment ? 'update' : 'record'} payment.`);
    }
  };

  const columns = [
    { title: 'Student', dataIndex: 'studentName', key: 'studentName', sorter: (a,b) => (a.studentName || '').localeCompare(b.studentName || '')},
    { title: 'Fee Item', dataIndex: 'feeItemName', key: 'feeItemName', sorter: (a,b) => (a.feeItemName || '').localeCompare(b.feeItemName || '')},
    { title: 'Amount Paid', dataIndex: 'amountPaid', key: 'amountPaid', render: (amount: number, record: FeePaymentDataType) => `${amount?.toLocaleString()} ${(record.feeItemId as IFeeItem)?.currency || 'TZS'}`},
    { title: 'Payment Date', dataIndex: 'paymentDate', key: 'paymentDate', render: (date: string) => moment(date).format('LL'), sorter: (a,b) => moment(a.paymentDate).unix() - moment(b.paymentDate).unix()},
    { title: 'Method', dataIndex: 'paymentMethod', key: 'paymentMethod' },
    { title: 'Academic Year', dataIndex: 'academicYearName', key: 'academicYearName' },
    { title: 'Term', dataIndex: 'termName', key: 'termName' },
    { title: 'Reference', dataIndex: 'transactionReference', key: 'transactionReference', render: (ref?:string) => ref || '-' },
    { title: 'Recorded By', dataIndex: 'recordedByUsername', key: 'recordedByUsername' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: FeePaymentDataType) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEditPayment(record)} size="small">Edit</Button>
          <Popconfirm title="Delete this payment record?" onConfirm={() => handleDeletePayment(record._id)} okText="Yes" cancelText="No">
            <Button icon={<DeleteOutlined />} danger size="small">Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  
  return (
    <div>
      <Title level={2} className="mb-6"><DollarCircleOutlined className="mr-2"/>Student Fee Collection</Title>
      <Paragraph>Record student payments and track fee collection history.</Paragraph>

       <Card title={<><FilterOutlined className="mr-2" />Filter Payments</>} className="mb-6">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Text>Student</Text>
            <Select
              showSearch
              style={{ width: '100%' }}
              placeholder="Select Student"
              value={filterStudentId}
              onChange={setFilterStudentId}
              loading={loading && students.length === 0}
              filterOption={(input, option) => (option?.children?.toString() ?? '').toLowerCase().includes(input.toLowerCase())}
              allowClear
            >
              {students.map(s => <Option key={s.userId._id} value={s.userId._id.toString()}>{`${s.userId.firstName} ${s.userId.lastName} (${s.userId.username})`}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text>Fee Item</Text>
             <Select
              style={{ width: '100%' }}
              placeholder="Select Fee Item"
              value={filterFeeItemId}
              onChange={setFilterFeeItemId}
              loading={loading && feeItems.length === 0}
              allowClear
            >
              {feeItems.map(fi => <Option key={fi._id} value={fi._id.toString()}>{fi.name} ({(fi.academicYearId as IAcademicYear)?.name})</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text>Academic Year</Text>
             <Select
              style={{ width: '100%' }}
              placeholder="Select Academic Year"
              value={filterAcademicYearId}
              onChange={setFilterAcademicYearId}
              loading={loading && academicYears.length === 0}
              allowClear
            >
              {academicYears.map(ay => <Option key={ay._id} value={ay._id.toString()}>{ay.name}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Text>Payment Date Range</Text>
            <RangePicker 
                style={{ width: '100%' }} 
                value={filterDateRange}
                onChange={(dates) => setFilterDateRange(dates as [moment.Moment, moment.Moment] | null)}
            />
          </Col>
        </Row>
        <Row justify="end" className="mt-4">
            <Col>
                <Button type="primary" icon={<SearchOutlined />} onClick={fetchPayments} loading={loading}>
                    Search Payments
                </Button>
                 <Button onClick={() => {setFilterStudentId(undefined); setFilterFeeItemId(undefined); setFilterAcademicYearId(undefined); setFilterDateRange(null); fetchPayments();}} style={{marginLeft: 8}}>
                    Clear Filters
                </Button>
            </Col>
        </Row>
      </Card>
      
      <div className="mb-4">
         <Button type="primary" icon={<PlusOutlined />} onClick={handleAddPayment}>
            Record New Payment
          </Button>
      </div>

      <Spin spinning={loading}>
        <Table columns={columns} dataSource={payments} rowKey="_id" scroll={{x: 1200}}/>
      </Spin>

      <Modal
        title={editingPayment ? 'Edit Payment Record' : 'Record New Payment'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting}
        destroyOnClose
        width={800}
      >
        <Form form={form} layout="vertical" name="paymentForm" className="mt-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="studentId" label="Student" rules={[{ required: true }]}>
                <Select showSearch placeholder="Select student" filterOption={(input, option) => (option?.children?.toString() ?? '').toLowerCase().includes(input.toLowerCase())}>
                  {students.map(s => <Option key={s.userId._id} value={s.userId._id.toString()}>{`${s.userId.firstName} ${s.userId.lastName} (${s.userId.username})`}</Option>)}
                </Select>
              </Form.Item>
            </Col>
             <Col span={12}>
                <Form.Item name="academicYearId" label="Academic Year" rules={[{ required: true }]}>
                    <Select placeholder="Select academic year for fee context">
                        {academicYears.map(year => <Option key={year._id} value={year._id.toString()}>{year.name}</Option>)}
                    </Select>
                </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
                <Form.Item name="feeItemId" label="Fee Item" rules={[{ required: true }]}>
                    <Select placeholder="Select fee item" disabled={!selectedAcademicYearInModal}>
                        {filteredFeeItems.map(item => <Option key={item._id} value={item._id.toString()}>{item.name} ({item.amount} {(item.currency)})</Option>)}
                    </Select>
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item name="termId" label="Term (Optional)">
                    <Select placeholder="Select term if applicable" allowClear disabled={!selectedAcademicYearInModal}>
                        {filteredTerms.map(term => <Option key={term._id} value={term._id.toString()}>{term.name}</Option>)}
                    </Select>
                </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="amountPaid" label="Amount Paid" rules={[{ required: true, type: 'number', min: 0.01 }]}>
                <InputNumber style={{width: "100%"}} placeholder="e.g. 50000" formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value!.replace(/\$\s?|(,*)/g, '')} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="paymentDate" label="Payment Date" rules={[{ required: true }]}>
                <DatePicker style={{width: "100%"}} format="YYYY-MM-DD"/>
              </Form.Item>
            </Col>
            <Col span={8}>
                <Form.Item name="paymentMethod" label="Payment Method" rules={[{ required: true }]}>
                    <Select placeholder="Select payment method">
                        {paymentMethods.map(method => <Option key={method} value={method}>{method}</Option>)}
                    </Select>
                </Form.Item>
            </Col>
          </Row>
          <Form.Item name="transactionReference" label="Transaction Reference (Optional)">
            <Input placeholder="e.g., Bank Slip No., Mobile Txn ID" />
          </Form.Item>
          <Form.Item name="notes" label="Notes (Optional)">
            <Input.TextArea rows={2} placeholder="Any additional notes for this payment." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
