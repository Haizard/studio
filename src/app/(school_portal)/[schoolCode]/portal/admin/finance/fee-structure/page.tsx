
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Table, Modal, Form, Input, Select, Switch, message, Tag, Space, Spin, Popconfirm, InputNumber, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DollarOutlined, TagOutlined } from '@ant-design/icons';
import type { IFeeItem } from '@/models/Tenant/FeeItem';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import type { ITerm } from '@/models/Tenant/Term';
import type { IClass } from '@/models/Tenant/Class';

const { Title } = Typography;
const { Option } = Select;

interface FeeItemDataType extends IFeeItem {
  key: string;
  academicYearName?: string;
  termName?: string;
}

interface FeeStructurePageProps {
  params: { schoolCode: string };
}

export default function FeeStructurePage({ params }: FeeStructurePageProps) {
  const { schoolCode } = params;
  const [feeItems, setFeeItems] = useState<FeeItemDataType[]>([]);
  const [academicYears, setAcademicYears] = useState<IAcademicYear[]>([]);
  const [terms, setTerms] = useState<ITerm[]>([]); // All terms
  const [classes, setClasses] = useState<IClass[]>([]); // All classes
  
  const [filteredTerms, setFilteredTerms] = useState<ITerm[]>([]); // Terms for selected AY in modal
  const [filteredClasses, setFilteredClasses] = useState<IClass[]>([]); // Classes for selected AY in modal

  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingFeeItem, setEditingFeeItem] = useState<FeeItemDataType | null>(null);
  const [form] = Form.useForm();
  
  const selectedAcademicYearInModal = Form.useWatch('academicYearId', form);

  const API_URL_BASE = `/api/${schoolCode}/portal/admin/finance/fee-items`;
  const ACADEMIC_YEARS_API = `/api/${schoolCode}/portal/academics/academic-years`;
  const TERMS_API = `/api/${schoolCode}/portal/academics/terms`;
  const CLASSES_API = `/api/${schoolCode}/portal/academics/classes`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, yearsRes, termsRes, classesRes] = await Promise.all([
        fetch(API_URL_BASE),
        fetch(ACADEMIC_YEARS_API),
        fetch(TERMS_API),
        fetch(CLASSES_API)
      ]);

      if (!itemsRes.ok) throw new Error((await itemsRes.json()).error || 'Failed to fetch fee items');
      if (!yearsRes.ok) throw new Error((await yearsRes.json()).error || 'Failed to fetch academic years');
      if (!termsRes.ok) throw new Error((await termsRes.json()).error || 'Failed to fetch terms');
      if (!classesRes.ok) throw new Error((await classesRes.json()).error || 'Failed to fetch classes');
      
      const itemsData: IFeeItem[] = await itemsRes.json();
      const yearsData: IAcademicYear[] = await yearsRes.json();
      const termsData: ITerm[] = await termsRes.json();
      const classesData: IClass[] = await classesRes.json();

      setFeeItems(itemsData.map(item => ({ 
        ...item, 
        key: item._id,
        academicYearName: (item.academicYearId as IAcademicYear)?.name || 'N/A',
        termName: (item.termId as ITerm)?.name || '-',
      })));
      setAcademicYears(yearsData.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
      setTerms(termsData);
      setClasses(classesData);

    } catch (error: any) {
      message.error(error.message || 'Could not load initial data.');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, API_URL_BASE, ACADEMIC_YEARS_API, TERMS_API, CLASSES_API]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedAcademicYearInModal) {
      setFilteredTerms(terms.filter(term => (typeof term.academicYearId === 'object' ? term.academicYearId._id : term.academicYearId) === selectedAcademicYearInModal));
      setFilteredClasses(classes.filter(cls => (typeof cls.academicYearId === 'object' ? (cls.academicYearId as IAcademicYear)._id : cls.academicYearId) === selectedAcademicYearInModal));
    } else {
      setFilteredTerms([]);
      setFilteredClasses([]);
    }
    // Reset term and class if AY changes to ensure only relevant options are shown/selected
    if (isModalVisible) {
        form.setFieldsValue({ termId: undefined, appliesToClasses: [] });
    }
  }, [selectedAcademicYearInModal, terms, classes, isModalVisible, form]);


  const handleAddFeeItem = () => {
    setEditingFeeItem(null);
    form.resetFields();
    const activeYear = academicYears.find(ay => ay.isActive);
    form.setFieldsValue({ 
        isMandatory: true, 
        currency: 'TZS',
        academicYearId: activeYear?._id,
        appliesToLevels: [],
        appliesToClasses: []
    });
    if (activeYear?._id) {
        // Trigger filtering for terms and classes based on active year
        handleAcademicYearChangeInModal(activeYear._id, true);
    } else {
        setFilteredTerms([]);
        setFilteredClasses([]);
    }
    setIsModalVisible(true);
  };
  
  const handleAcademicYearChangeInModal = (yearId: string, isNew: boolean) => {
     setFilteredTerms(terms.filter(term => (typeof term.academicYearId === 'object' ? term.academicYearId._id : term.academicYearId) === yearId));
     setFilteredClasses(classes.filter(cls => (typeof cls.academicYearId === 'object' ? (cls.academicYearId as IAcademicYear)._id : cls.academicYearId) === yearId));
     if (isNew || (editingFeeItem && (typeof editingFeeItem.academicYearId === 'object' ? editingFeeItem.academicYearId._id : editingFeeItem.academicYearId) !== yearId)) {
        form.setFieldsValue({ termId: undefined, appliesToClasses: [] });
     }
  };

  const handleEditFeeItem = (item: FeeItemDataType) => {
    setEditingFeeItem(item);
    const ayId = typeof item.academicYearId === 'object' ? (item.academicYearId as IAcademicYear)._id : item.academicYearId.toString();
    
    if(ayId) handleAcademicYearChangeInModal(ayId, false);

    form.setFieldsValue({
      ...item,
      academicYearId: ayId,
      termId: item.termId && typeof item.termId === 'object' ? (item.termId as ITerm)._id : item.termId?.toString(),
      appliesToLevels: Array.isArray(item.appliesToLevels) ? item.appliesToLevels : [],
      appliesToClasses: Array.isArray(item.appliesToClasses) ? item.appliesToClasses.map(cls => typeof cls === 'object' ? (cls as IClass)._id : cls) : [],
    });
    setIsModalVisible(true);
  };

  const handleDeleteFeeItem = async (itemId: string) => {
    try {
      const response = await fetch(`${API_URL_BASE}/${itemId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete fee item');
      }
      message.success('Fee item deleted successfully');
      fetchData();
    } catch (error: any) {
      message.error(error.message || 'Could not delete fee item.');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values };
      
      const url = editingFeeItem ? `${API_URL_BASE}/${editingFeeItem._id}` : API_URL_BASE;
      const method = editingFeeItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingFeeItem ? 'update' : 'add'} fee item`);
      }

      message.success(`Fee item ${editingFeeItem ? 'updated' : 'added'} successfully`);
      setIsModalVisible(false);
      fetchData();
    } catch (error: any) {
      message.error(error.message || `Could not ${editingFeeItem ? 'update' : 'add'} fee item.`);
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a:FeeItemDataType, b:FeeItemDataType) => a.name.localeCompare(b.name) },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (amount: number, record: FeeItemDataType) => `${amount.toLocaleString()} ${record.currency}` },
    { title: 'Academic Year', dataIndex: 'academicYearName', key: 'academicYearName' },
    { title: 'Term', dataIndex: 'termName', key: 'termName' },
    { title: 'Category', dataIndex: 'category', key: 'category', render: (cat?: string) => cat ? <Tag color="blue">{cat}</Tag> : '-' },
    { title: 'Levels', dataIndex: 'appliesToLevels', key: 'appliesToLevels', render: (levels?: string[]) => levels && levels.length > 0 ? levels.map(l => <Tag key={l}>{l}</Tag>) : <Tag>All Levels</Tag> },
    { title: 'Mandatory', dataIndex: 'isMandatory', key: 'isMandatory', render: (isMandatory: boolean) => <Tag color={isMandatory ? 'green' : 'orange'}>{isMandatory ? 'Yes' : 'No'}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: FeeItemDataType) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEditFeeItem(record)}>Edit</Button>
          <Popconfirm
            title="Delete this fee item?"
            description="This action cannot be undone. Ensure this item is not currently in use."
            onConfirm={() => handleDeleteFeeItem(record._id)}
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
        <Title level={2}><DollarOutlined className="mr-2"/>Fee Structure Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddFeeItem}>
          Add New Fee Item
        </Button>
      </div>
      <Table columns={columns} dataSource={feeItems} rowKey="_id" />

      <Modal
        title={editingFeeItem ? 'Edit Fee Item' : 'Add New Fee Item'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting}
        destroyOnClose
        width={800}
      >
        <Form 
            form={form} 
            layout="vertical" 
            name="feeItemForm" 
            className="mt-4"
            onValuesChange={(changedValues) => {
                if (changedValues.academicYearId !== undefined) {
                    handleAcademicYearChangeInModal(changedValues.academicYearId, !editingFeeItem);
                }
            }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Fee Item Name" rules={[{ required: true, message: "E.g., 'Term 1 Tuition'" }]}>
                <Input placeholder="e.g., Term 1 Tuition" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category" label="Category (Optional)">
                <Input placeholder="e.g., Tuition, Activity, Development" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description (Optional)">
            <Input.TextArea rows={2} placeholder="Further details about this fee item." />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="amount" label="Amount" rules={[{ required: true, type: 'number', min: 0 }]}>
                <InputNumber style={{width: "100%"}} placeholder="e.g. 500000" formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => value!.replace(/\$\s?|(,*)/g, '')}/>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="currency" label="Currency" rules={[{ required: true }]}>
                <Input defaultValue="TZS" />
              </Form.Item>
            </Col>
             <Col span={8}>
                <Form.Item name="isMandatory" label="Is Mandatory?" valuePropName="checked">
                    <Switch checkedChildren="Yes" unCheckedChildren="No" />
                </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
             <Col span={12}>
                <Form.Item name="academicYearId" label="Academic Year" rules={[{ required: true }]}>
                    <Select placeholder="Select academic year">
                    {academicYears.map(year => <Option key={year._id} value={year._id}>{year.name}</Option>)}
                    </Select>
                </Form.Item>
            </Col>
            <Col span={12}>
                 <Form.Item name="termId" label="Term (Optional, if term-specific)">
                    <Select placeholder="Select term" allowClear disabled={!selectedAcademicYearInModal || filteredTerms.length === 0}>
                    {filteredTerms.map(term => <Option key={term._id} value={term._id}>{term.name}</Option>)}
                    </Select>
                </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
                <Form.Item name="appliesToLevels" label="Applies to Levels (Optional)">
                    <Select mode="tags" placeholder="Type levels e.g., Form 1, O-Level, All. Default is All Levels if empty.">
                        {/* You can pre-populate with common levels if desired */}
                    </Select>
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item name="appliesToClasses" label="Applies to Specific Classes (Optional)">
                    <Select mode="multiple" placeholder="Select classes" allowClear disabled={!selectedAcademicYearInModal || filteredClasses.length === 0}>
                    {filteredClasses.map(cls => <Option key={cls._id} value={cls._id}>{cls.name} {cls.level ? `(${cls.level})` : ''}</Option>)}
                    </Select>
                </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
