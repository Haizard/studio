
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Table, Modal, Form, Input, Select, DatePicker, message, Space, Spin, Popconfirm, InputNumber, Row, Col, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FilterOutlined, SearchOutlined, FolderOpenOutlined, DollarOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import type { IExpense } from '@/models/Tenant/Expense';
import type { ITenantUser } from '@/models/Tenant/User';
import moment from 'moment';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface ExpenseDataType extends IExpense {
  key: string;
  recordedByUsername?: string;
}

export default function ExpenseTrackingPage() {
  const params = useParams();
  const schoolCode = params.schoolCode as string;

  const [expenses, setExpenses] = useState<ExpenseDataType[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseDataType | null>(null);
  const [form] = Form.useForm();

  // Filter states
  const [filterCategory, setFilterCategory] = useState<string | undefined>();
  const [filterDateRange, setFilterDateRange] = useState<[moment.Moment, moment.Moment] | null>(null);

  const API_URL_BASE = `/api/${schoolCode}/portal/admin/finance/expenses`;

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filterCategory) query.append('category', filterCategory);
      if (filterDateRange) {
        query.append('startDate', filterDateRange[0].format('YYYY-MM-DD'));
        query.append('endDate', filterDateRange[1].format('YYYY-MM-DD'));
      }
      
      const response = await fetch(`${API_URL_BASE}?${query.toString()}`);
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch expenses');
      const data: IExpense[] = await response.json();
      
      const uniqueCategories = Array.from(new Set(data.map(e => e.category))).sort();
      if (!filterCategory) { // Only update all categories when not filtering, to keep the filter list stable
          setAllCategories(uniqueCategories);
      }
      
      setExpenses(data.map(e => ({
        ...e,
        key: e._id.toString(),
        recordedByUsername: (e.recordedById as ITenantUser)?.username || 'N/A',
      })));
    } catch (error: any) {
      message.error(error.message || 'Could not load expenses.');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, API_URL_BASE, filterCategory, filterDateRange]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleAddExpense = () => {
    setEditingExpense(null);
    form.resetFields();
    form.setFieldsValue({ 
        expenseDate: moment(),
        currency: 'TZS',
    });
    setIsModalVisible(true);
  };

  const handleEditExpense = (expense: ExpenseDataType) => {
    setEditingExpense(expense);
    form.setFieldsValue({
      ...expense,
      expenseDate: moment(expense.expenseDate),
    });
    setIsModalVisible(true);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      const response = await fetch(`${API_URL_BASE}/${expenseId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to delete expense');
      message.success('Expense deleted successfully');
      fetchExpenses();
    } catch (error: any) {
      message.error(error.message || 'Could not delete expense.');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = { 
        ...values, 
        expenseDate: values.expenseDate.toISOString(),
      };
      
      const url = editingExpense ? `${API_URL_BASE}/${editingExpense._id}` : API_URL_BASE;
      const method = editingExpense ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingExpense ? 'update' : 'record'} expense`);
      }

      message.success(`Expense ${editingExpense ? 'updated' : 'recorded'} successfully`);
      setIsModalVisible(false);
      fetchExpenses();
    } catch (error: any) {
      message.error(error.message || `Could not ${editingExpense ? 'update' : 'record'} expense.`);
    }
  };

  const columns = [
    { title: 'Date', dataIndex: 'expenseDate', key: 'expenseDate', render: (date: string) => moment(date).format('LL'), sorter: (a:ExpenseDataType, b:ExpenseDataType) => moment(a.expenseDate).unix() - moment(b.expenseDate).unix(), defaultSortOrder: 'descend' as 'descend' },
    { title: 'Category', dataIndex: 'category', key: 'category', sorter: (a:ExpenseDataType, b:ExpenseDataType) => a.category.localeCompare(b.category) },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (amount: number, record: ExpenseDataType) => `${amount?.toLocaleString()} ${record.currency || 'TZS'}`, sorter: (a:ExpenseDataType, b:ExpenseDataType) => a.amount - b.amount },
    { title: 'Recorded By', dataIndex: 'recordedByUsername', key: 'recordedByUsername' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ExpenseDataType) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEditExpense(record)} size="small">Edit</Button>
          <Popconfirm title="Delete this expense record?" onConfirm={() => handleDeleteExpense(record._id)} okText="Yes" cancelText="No">
            <Button icon={<DeleteOutlined />} danger size="small">Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  
  return (
    <div>
      <Title level={2} className="mb-6"><FolderOpenOutlined className="mr-2"/>Expense Tracking</Title>
      <Paragraph>Record and manage all school expenditures.</Paragraph>

      <Card title={<><FilterOutlined className="mr-2" />Filter Expenses</>} className="mb-6">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Text>Category</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Filter by Category"
              value={filterCategory}
              onChange={setFilterCategory}
              allowClear
            >
              {allCategories.map(cat => <Option key={cat} value={cat}>{cat}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12}>
            <Text>Date Range</Text>
            <RangePicker 
              style={{ width: '100%' }} 
              value={filterDateRange}
              onChange={(dates) => setFilterDateRange(dates as [moment.Moment, moment.Moment] | null)}
            />
          </Col>
        </Row>
      </Card>
      
      <div className="mb-4">
         <Button type="primary" icon={<PlusOutlined />} onClick={handleAddExpense}>
            Record New Expense
          </Button>
      </div>

      <Spin spinning={loading}>
        <Table columns={columns} dataSource={expenses} rowKey="_id" scroll={{x: 800}}/>
      </Spin>

      <Modal
        title={editingExpense ? 'Edit Expense Record' : 'Record New Expense'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting}
        destroyOnClose
        width={700}
      >
        <Form form={form} layout="vertical" name="expenseForm" className="mt-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                <Select mode="tags" placeholder="Select or type a category (e.g. Utilities, Salaries)">
                   {allCategories.map(cat => <Option key={cat} value={cat}>{cat}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="expenseDate" label="Expense Date" rules={[{ required: true }]}>
                <DatePicker style={{width: "100%"}} format="YYYY-MM-DD"/>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="e.g., Payment for January electricity bill" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="amount" label="Amount" rules={[{ required: true, type: 'number', min: 0.01 }]}>
                <InputNumber style={{width: "100%"}} placeholder="e.g. 150000" formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value!.replace(/\$\s?|(,*)/g, '')} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="currency" label="Currency" rules={[{ required: true }]}>
                <Input defaultValue="TZS" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="receiptUrl" label="Receipt URL (Optional)">
            <Input placeholder="https://example.com/path/to/receipt.pdf" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
