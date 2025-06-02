
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Table, Modal, Form, Input, Select, message, Tag, Space, Spin, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, AppstoreAddOutlined } from '@ant-design/icons';
import type { IAlevelCombination } from '@/models/Tenant/AlevelCombination';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import type { ISubject } from '@/models/Tenant/Subject';

const { Title } = Typography;
const { Option } = Select;

interface CombinationDataType extends Omit<IAlevelCombination, 'academicYearId' | 'subjects'> {
  key: string;
  academicYearId: { _id: string; name: string } | string;
  subjects: ({ _id: string; name: string; code?: string } | string)[];
}

interface AlevelCombinationsPageProps {
  params: { schoolCode: string };
}

export default function AlevelCombinationsPage({ params }: AlevelCombinationsPageProps) {
  const { schoolCode } = params;
  const [combinations, setCombinations] = useState<CombinationDataType[]>([]);
  const [academicYears, setAcademicYears] = useState<IAcademicYear[]>([]);
  const [subjects, setSubjects] = useState<ISubject[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCombination, setEditingCombination] = useState<CombinationDataType | null>(null);
  const [form] = Form.useForm();

  const API_URL_BASE = `/api/${schoolCode}/portal/academics/alevel-combinations`;
  const ACADEMIC_YEARS_API = `/api/${schoolCode}/portal/academics/academic-years`;
  const SUBJECTS_API = `/api/${schoolCode}/portal/academics/subjects`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [combinationsRes, yearsRes, subjectsRes] = await Promise.all([
        fetch(API_URL_BASE),
        fetch(ACADEMIC_YEARS_API),
        fetch(SUBJECTS_API)
      ]);

      if (!combinationsRes.ok) throw new Error((await combinationsRes.json()).error || 'Failed to fetch A-Level combinations');
      if (!yearsRes.ok) throw new Error((await yearsRes.json()).error || 'Failed to fetch academic years');
      if (!subjectsRes.ok) throw new Error((await subjectsRes.json()).error || 'Failed to fetch subjects');
      
      const combinationsData: IAlevelCombination[] = await combinationsRes.json();
      const yearsData: IAcademicYear[] = await yearsRes.json();
      const subjectsData: ISubject[] = await subjectsRes.json();

      setCombinations(combinationsData.map(combo => ({ ...combo, key: combo._id } as CombinationDataType)));
      setAcademicYears(yearsData);
      setSubjects(subjectsData);

    } catch (error: any) {
      message.error(error.message || 'Could not load initial data.');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, API_URL_BASE, ACADEMIC_YEARS_API, SUBJECTS_API]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddCombination = () => {
    setEditingCombination(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditCombination = (combo: CombinationDataType) => {
    setEditingCombination(combo);
    form.setFieldsValue({
      ...combo,
      academicYearId: typeof combo.academicYearId === 'object' ? combo.academicYearId._id : combo.academicYearId,
      subjects: combo.subjects.map(sub => typeof sub === 'object' ? sub._id : sub),
    });
    setIsModalVisible(true);
  };

  const handleDeleteCombination = async (combinationId: string) => {
    try {
      const response = await fetch(`${API_URL_BASE}/${combinationId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete combination');
      }
      message.success('A-Level Combination deleted successfully');
      fetchData();
    } catch (error: any) {
      message.error(error.message || 'Could not delete combination.');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values };
      
      const url = editingCombination ? `${API_URL_BASE}/${editingCombination._id}` : API_URL_BASE;
      const method = editingCombination ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingCombination ? 'update' : 'add'} combination`);
      }

      message.success(`A-Level Combination ${editingCombination ? 'updated' : 'added'} successfully`);
      setIsModalVisible(false);
      fetchData();
    } catch (error: any) {
      message.error(error.message || `Could not ${editingCombination ? 'update' : 'add'} combination.`);
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a:CombinationDataType, b:CombinationDataType) => a.name.localeCompare(b.name) },
    { title: 'Code', dataIndex: 'code', key: 'code' },
    { 
      title: 'Subjects', 
      dataIndex: 'subjects', 
      key: 'subjects', 
      render: (subs: CombinationDataType['subjects']) => {
        if (!subs || subs.length === 0) return '-';
        return subs.map(sub => {
          const subjectName = typeof sub === 'object' ? sub.name : (subjects.find(s => s._id === sub)?.name || sub);
          return <Tag key={typeof sub === 'object' ? sub._id : sub}>{subjectName}</Tag>;
        });
      }
    },
    { 
      title: 'Academic Year', 
      dataIndex: 'academicYearId', 
      key: 'academicYearId', 
      render: (ay: CombinationDataType['academicYearId']) => typeof ay === 'object' ? ay.name : (academicYears.find(y => y._id === ay)?.name || ay),
      sorter: (a: CombinationDataType, b: CombinationDataType) => {
        const nameA = typeof a.academicYearId === 'object' ? a.academicYearId.name : (academicYears.find(y => y._id === a.academicYearId)?.name || '');
        const nameB = typeof b.academicYearId === 'object' ? b.academicYearId.name : (academicYears.find(y => y._id === b.academicYearId)?.name || '');
        return nameA.localeCompare(nameB);
      }
    },
    { title: 'Description', dataIndex: 'description', key: 'description', render: (desc?: string) => desc || '-' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: CombinationDataType) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEditCombination(record)}>Edit</Button>
          <Popconfirm
            title="Delete this A-Level Combination?"
            description="This action cannot be undone. Ensure this combination is not in use by students."
            onConfirm={() => handleDeleteCombination(record._id)}
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
        <Title level={2}><AppstoreAddOutlined className="mr-2"/>A-Level Combination Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddCombination}>
          Add New Combination
        </Button>
      </div>
      <Table columns={columns} dataSource={combinations} rowKey="_id" />

      <Modal
        title={editingCombination ? 'Edit A-Level Combination' : 'Add New A-Level Combination'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting}
        destroyOnClose
        width={700}
      >
        <Form form={form} layout="vertical" name="combinationForm" className="mt-4">
          <Form.Item name="name" label="Combination Name" rules={[{ required: true, message: "E.g., 'PCM' (Physics, Chemistry, Maths)" }]}>
            <Input placeholder="e.g., PCM" />
          </Form.Item>
          <Form.Item name="code" label="Combination Code" rules={[{ required: true, message: "Unique code for this combination in an academic year" }]}>
            <Input placeholder="e.g., A01, SC02" />
          </Form.Item>
          <Form.Item name="academicYearId" label="Academic Year" rules={[{ required: true }]}>
            <Select placeholder="Select academic year">
              {academicYears.map(year => <Option key={year._id} value={year._id}>{year.name}</Option>)}
            </Select>
          </Form.Item>
           <Form.Item name="subjects" label="Subjects" rules={[{ required: true, type: 'array', min: 1, message: "Select at least one subject"}]}>
            <Select mode="multiple" placeholder="Select subjects for this combination">
              {subjects
                .filter(subject => subject.forLevel?.includes('A-Level')) // Optionally filter for A-Level subjects
                .map(subject => <Option key={subject._id} value={subject._id}>{subject.name} {subject.code ? `(${subject.code})` : ''}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Description (Optional)">
            <Input.TextArea rows={3} placeholder="Further details about the combination" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
