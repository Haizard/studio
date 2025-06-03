
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Table, Modal, Form, Input, Select, Switch, message, Tag, Space, Spin, Popconfirm, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ScheduleOutlined, CalendarOutlined, TeamOutlined, ProjectOutlined } from '@ant-design/icons';
import Link from 'next/link';
import type { ITimetable } from '@/models/Tenant/Timetable';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import type { IClass } from '@/models/Tenant/Class';
import type { ITerm } from '@/models/Tenant/Term';
import moment from 'moment';

const { Title, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface TimetableDataType extends Omit<ITimetable, 'academicYearId' | 'classId' | 'termId'> {
  key: string;
  _id: string;
  academicYearId: { _id: string; name: string } | string;
  classId: { _id: string; name: string; level?: string } | string;
  termId?: { _id: string; name: string } | string | null;
}

interface TimetableManagementPageProps {
  params: { schoolCode: string };
}

export default function TimetableManagementPage({ params }: TimetableManagementPageProps) {
  const { schoolCode } = params;
  const [timetables, setTimetables] = useState<TimetableDataType[]>([]);
  const [academicYears, setAcademicYears] = useState<IAcademicYear[]>([]);
  const [allClasses, setAllClasses] = useState<IClass[]>([]); // All classes for the school
  const [allTerms, setAllTerms] = useState<ITerm[]>([]); // All terms for the school
  
  const [filteredClasses, setFilteredClasses] = useState<IClass[]>([]); // Classes for selected AY in modal
  const [filteredTerms, setFilteredTerms] = useState<ITerm[]>([]); // Terms for selected AY in modal

  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTimetable, setEditingTimetable] = useState<TimetableDataType | null>(null);
  const [form] = Form.useForm();
  
  const selectedAcademicYearInModal = Form.useWatch('academicYearId', form);

  const API_URL_BASE = `/api/${schoolCode}/portal/admin/academics/timetables`;
  const ACADEMIC_YEARS_API = `/api/${schoolCode}/portal/academics/academic-years`;
  const CLASSES_API = `/api/${schoolCode}/portal/academics/classes`;
  const TERMS_API = `/api/${schoolCode}/portal/academics/terms`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [timetablesRes, yearsRes, classesRes, termsRes] = await Promise.all([
        fetch(API_URL_BASE),
        fetch(ACADEMIC_YEARS_API),
        fetch(CLASSES_API),
        fetch(TERMS_API)
      ]);

      if (!timetablesRes.ok) throw new Error((await timetablesRes.json()).error || 'Failed to fetch timetables');
      if (!yearsRes.ok) throw new Error((await yearsRes.json()).error || 'Failed to fetch academic years');
      if (!classesRes.ok) throw new Error((await classesRes.json()).error || 'Failed to fetch classes');
      if (!termsRes.ok) throw new Error((await termsRes.json()).error || 'Failed to fetch terms');
      
      const timetablesData: ITimetable[] = await timetablesRes.json();
      const yearsData: IAcademicYear[] = await yearsRes.json();
      const classesData: IClass[] = await classesRes.json();
      const termsData: ITerm[] = await termsRes.json();

      setTimetables(timetablesData.map(tt => ({ 
        ...tt, 
        key: tt._id, 
        _id: tt._id,
        academicYearId: tt.academicYearId as any, 
        classId: tt.classId as any,
        termId: tt.termId as any,
      })));
      setAcademicYears(yearsData.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
      setAllClasses(classesData);
      setAllTerms(termsData);

    } catch (error: any) {
      message.error(error.message || 'Could not load initial data.');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, API_URL_BASE, ACADEMIC_YEARS_API, CLASSES_API, TERMS_API]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedAcademicYearInModal) {
      setFilteredClasses(allClasses.filter(cls => 
        (typeof cls.academicYearId === 'string' ? cls.academicYearId : (cls.academicYearId as IAcademicYear)?._id) === selectedAcademicYearInModal
      ));
      setFilteredTerms(allTerms.filter(term => 
        (typeof term.academicYearId === 'string' ? term.academicYearId : (term.academicYearId as IAcademicYear)?._id) === selectedAcademicYearInModal
      ));
    } else {
      setFilteredClasses([]);
      setFilteredTerms([]);
    }
    if (!isModalVisible || (editingTimetable && (typeof editingTimetable.academicYearId === 'object' ? editingTimetable.academicYearId._id : editingTimetable.academicYearId) !== selectedAcademicYearInModal)) {
        form.setFieldsValue({ classId: undefined, termId: undefined });
    }
  }, [selectedAcademicYearInModal, allClasses, allTerms, isModalVisible, form, editingTimetable]);


  const handleAddTimetable = () => {
    setEditingTimetable(null);
    form.resetFields();
    const activeYear = academicYears.find(ay => ay.isActive);
    form.setFieldsValue({ 
        isActive: false,
        academicYearId: activeYear?._id 
    });
    if (activeYear?._id) {
        setFilteredClasses(allClasses.filter(cls => (typeof cls.academicYearId === 'string' ? cls.academicYearId : (cls.academicYearId as IAcademicYear)?._id) === activeYear._id));
        setFilteredTerms(allTerms.filter(term => (typeof term.academicYearId === 'string' ? term.academicYearId : (term.academicYearId as IAcademicYear)?._id) === activeYear._id));
    } else {
        setFilteredClasses([]);
        setFilteredTerms([]);
    }
    setIsModalVisible(true);
  };

  const handleEditTimetable = (timetable: TimetableDataType) => {
    setEditingTimetable(timetable);
    const ayId = typeof timetable.academicYearId === 'object' ? timetable.academicYearId._id : timetable.academicYearId;
    const classIdVal = typeof timetable.classId === 'object' ? timetable.classId._id : timetable.classId;
    const termIdVal = timetable.termId && typeof timetable.termId === 'object' ? timetable.termId._id : timetable.termId;

    if (ayId) {
        setFilteredClasses(allClasses.filter(cls => (typeof cls.academicYearId === 'string' ? cls.academicYearId : (cls.academicYearId as IAcademicYear)?._id) === ayId));
        setFilteredTerms(allTerms.filter(term => (typeof term.academicYearId === 'string' ? term.academicYearId : (term.academicYearId as IAcademicYear)?._id) === ayId));
    }
    
    form.setFieldsValue({
      ...timetable,
      academicYearId: ayId,
      classId: classIdVal,
      termId: termIdVal || undefined,
    });
    setIsModalVisible(true);
  };

  const handleDeleteTimetable = async (timetableId: string) => {
    try {
      const response = await fetch(`${API_URL_BASE}/${timetableId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete timetable');
      }
      message.success('Timetable deleted successfully');
      fetchData();
    } catch (error: any) {
      message.error(error.message || 'Could not delete timetable.');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = { 
          ...values,
          periods: editingTimetable?.periods || [] 
      };
      
      const url = editingTimetable ? `${API_URL_BASE}/${editingTimetable._id}` : API_URL_BASE;
      const method = editingTimetable ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingTimetable ? 'update' : 'add'} timetable`);
      }

      message.success(`Timetable ${editingTimetable ? 'updated' : 'added'} successfully`);
      setIsModalVisible(false);
      fetchData();
    } catch (error: any) {
      message.error(error.message || `Could not ${editingTimetable ? 'update' : 'add'} timetable.`);
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a:TimetableDataType, b:TimetableDataType) => a.name.localeCompare(b.name) },
    { 
      title: 'Academic Year', 
      dataIndex: 'academicYearId', 
      key: 'academicYearId', 
      render: (ay: TimetableDataType['academicYearId']) => typeof ay === 'object' ? ay.name : (academicYears.find(y => y._id === ay)?.name || ay)
    },
    { 
      title: 'Class', 
      dataIndex: 'classId', 
      key: 'classId', 
      render: (cls: TimetableDataType['classId']) => typeof cls === 'object' ? `${cls.name} ${cls.level ? `(${cls.level})` : ''}` : (allClasses.find(c => c._id === cls)?.name || cls)
    },
    { 
      title: 'Term', 
      dataIndex: 'termId', 
      key: 'termId', 
      render: (term?: TimetableDataType['termId']) => {
        if (!term) return '-';
        return typeof term === 'object' ? term.name : (allTerms.find(t => t._id === term)?.name || term);
      }
    },
    { title: 'Status', dataIndex: 'isActive', key: 'isActive', render: (isActive: boolean) => <Tag color={isActive ? 'green' : 'blue'}>{isActive ? 'Active' : 'Inactive'}</Tag> },
    { title: 'Version', dataIndex: 'version', key: 'version' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: TimetableDataType) => (
        <Space>
          <Link href={`/${schoolCode}/portal/admin/academics/timetables/${record._id}/periods`}>
            <Button icon={<ProjectOutlined />}>Manage Periods</Button>
          </Link>
          <Button icon={<EditOutlined />} onClick={() => handleEditTimetable(record)}>Edit Details</Button>
          <Popconfirm
            title="Delete this timetable?"
            description="This action cannot be undone. All associated periods will be lost."
            onConfirm={() => handleDeleteTimetable(record._id)}
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
        <Title level={2}><ScheduleOutlined className="mr-2"/>Timetable Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTimetable}>
          Add New Timetable
        </Button>
      </div>
      <Table columns={columns} dataSource={timetables} rowKey="_id" scroll={{ x: 1300 }} />

      <Modal
        title={editingTimetable ? 'Edit Timetable Details' : 'Add New Timetable'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting}
        destroyOnClose
        width={700}
      >
        <Form form={form} layout="vertical" name="timetableForm" className="mt-4">
          <Form.Item name="name" label="Timetable Name" rules={[{ required: true, message: "E.g., 'Form 1A - Term 1 Regular'" }]}>
            <Input placeholder="e.g., Form 1A - Term 1 Regular" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="academicYearId" label="Academic Year" rules={[{ required: true }]}>
                <Select placeholder="Select academic year">
                  {academicYears.map(year => <Option key={year._id} value={year._id}>{year.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="classId" label="Class" rules={[{ required: true }]}>
                <Select 
                    placeholder="Select class"
                    disabled={!selectedAcademicYearInModal}
                    loading={loading && !selectedAcademicYearInModal}
                >
                  {filteredClasses.map(cls => <Option key={cls._id} value={cls._id}>{cls.name} {cls.level ? `(${cls.level})` : ''}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
               <Form.Item name="termId" label="Term (Optional)">
                <Select 
                    placeholder="Select term" 
                    allowClear 
                    disabled={!selectedAcademicYearInModal}
                    loading={loading && !selectedAcademicYearInModal}
                >
                  {filteredTerms.map(term => <Option key={term._id} value={term._id}>{term.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name="isActive" 
                label="Set as Active Timetable" 
                valuePropName="checked"
                tooltip="Setting this active will deactivate other timetables for the same class/year/term."
              >
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description (Optional)">
            <TextArea rows={3} placeholder="Any specific notes about this timetable version or scope." />
          </Form.Item>
          <Paragraph type="secondary" className="text-sm">
            Detailed period scheduling (days, times, subjects, teachers) will be managed on the next page after creating or selecting a timetable.
          </Paragraph>
        </Form>
      </Modal>
    </div>
  );
}
    

    