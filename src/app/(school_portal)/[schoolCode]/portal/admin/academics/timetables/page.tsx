
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Table, Modal, Form, Input, Select, Switch, message, Tag, Space, Spin, Popconfirm, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ScheduleOutlined, ProjectOutlined, CopyOutlined, BulbOutlined } from '@ant-design/icons';
import Link from 'next/link';
import type { ITimetable } from '@/models/Tenant/Timetable';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import type { IClass } from '@/models/Tenant/Class';
import type { ITerm } from '@/models/Tenant/Term';
import { generateSchedule, type GenerateScheduleInput } from '@/ai/flows/generate-schedule-flow';

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

type ModalMode = 'add' | 'edit' | 'copy' | 'ai';

export default function TimetableManagementPage({ params }: TimetableManagementPageProps) {
  const { schoolCode } = params;
  const [timetables, setTimetables] = useState<TimetableDataType[]>([]);
  const [academicYears, setAcademicYears] = useState<IAcademicYear[]>([]);
  const [allClasses, setAllClasses] = useState<IClass[]>([]);
  const [allTerms, setAllTerms] = useState<ITerm[]>([]);
  
  const [filteredClasses, setFilteredClasses] = useState<IClass[]>([]);
  const [filteredTerms, setFilteredTerms] = useState<ITerm[]>([]);

  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [editingTimetable, setEditingTimetable] = useState<TimetableDataType | null>(null); // Used for edit and as source for copy
  const [form] = Form.useForm();
  
  const selectedAcademicYearInModal = Form.useWatch('academicYearId', form);
  const [aiLoading, setAiLoading] = useState(false);

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
    // Reset class and term if AY changes to ensure only relevant options are shown/selected
    if (isModalVisible && modalMode !== 'edit') {
        form.setFieldsValue({ classId: undefined, termId: undefined });
    }
  }, [selectedAcademicYearInModal, allClasses, allTerms, isModalVisible, form, modalMode]);


  const handleAddTimetable = () => {
    setEditingTimetable(null);
    setModalMode('add');
    form.resetFields();
    const activeYear = academicYears.find(ay => ay.isActive);
    form.setFieldsValue({ 
        isActive: false,
        academicYearId: activeYear?._id 
    });
    // Trigger filtering for initial active year if set
    if (activeYear?._id) {
        handleAcademicYearChangeInModal(activeYear._id, true);
    } else {
        setFilteredClasses([]);
        setFilteredTerms([]);
    }
    setIsModalVisible(true);
  };

  const handleEditTimetable = (timetable: TimetableDataType) => {
    setEditingTimetable(timetable);
    setModalMode('edit');
    const ayId = typeof timetable.academicYearId === 'object' ? timetable.academicYearId._id : timetable.academicYearId;
    const classIdVal = typeof timetable.classId === 'object' ? timetable.classId._id : timetable.classId;
    const termIdVal = timetable.termId && typeof timetable.termId === 'object' ? timetable.termId._id : timetable.termId;
    
    if (ayId) handleAcademicYearChangeInModal(ayId, false); // Populate filtered lists

    form.setFieldsValue({
      name: timetable.name,
      academicYearId: ayId,
      classId: classIdVal,
      termId: termIdVal || undefined,
      description: timetable.description,
      isActive: timetable.isActive,
    });
    setIsModalVisible(true);
  };
  
  const handleCopyTimetable = (sourceTimetable: TimetableDataType) => {
    setEditingTimetable(sourceTimetable); // Source for copying
    setModalMode('copy');
    const activeYear = academicYears.find(ay => ay.isActive);
    const defaultAYForCopy = activeYear?._id || (typeof sourceTimetable.academicYearId === 'object' ? sourceTimetable.academicYearId._id : sourceTimetable.academicYearId) || (academicYears.length > 0 ? academicYears[0]._id : undefined);

    if (defaultAYForCopy) handleAcademicYearChangeInModal(defaultAYForCopy as string, false);

    form.resetFields(); // Clear previous form values
    form.setFieldsValue({
      name: `${sourceTimetable.name} - Copy`,
      academicYearId: defaultAYForCopy,
      // Class and Term will be set based on selected AY or user interaction
      classId: defaultAYForCopy === (typeof sourceTimetable.academicYearId === 'object' ? sourceTimetable.academicYearId._id : sourceTimetable.academicYearId) ? (typeof sourceTimetable.classId === 'object' ? sourceTimetable.classId._id : sourceTimetable.classId) : undefined,
      termId: defaultAYForCopy === (typeof sourceTimetable.academicYearId === 'object' ? sourceTimetable.academicYearId._id : sourceTimetable.academicYearId) && sourceTimetable.termId ? (typeof sourceTimetable.termId === 'object' ? sourceTimetable.termId._id : sourceTimetable.termId) : undefined,
      description: sourceTimetable.description,
      isActive: false, // Copies are inactive by default
    });
    setIsModalVisible(true);
  };

  const handleAIGenerate = () => {
    setEditingTimetable(null);
    setModalMode('ai');
    form.resetFields();
    const activeYear = academicYears.find(ay => ay.isActive);
    form.setFieldsValue({ academicYearId: activeYear?._id });
    if(activeYear?._id) handleAcademicYearChangeInModal(activeYear._id, true);
    setIsModalVisible(true);
  };


  const handleAcademicYearChangeInModal = (yearId: string, isNew: boolean) => {
     setFilteredClasses(allClasses.filter(cls => (typeof cls.academicYearId === 'string' ? cls.academicYearId : (cls.academicYearId as IAcademicYear)?._id) === yearId));
     setFilteredTerms(allTerms.filter(term => (typeof term.academicYearId === 'string' ? term.academicYearId : (term.academicYearId as IAcademicYear)?._id) === yearId));
     if (isNew || (modalMode !== 'edit' || (editingTimetable && (typeof editingTimetable.academicYearId === 'object' ? editingTimetable.academicYearId._id : editingTimetable.academicYearId) !== yearId))) {
        form.setFieldsValue({ classId: undefined, termId: undefined });
     }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (modalMode === 'ai') {
        setAiLoading(true);
        try {
          const selectedClass = allClasses.find(c => c._id === values.classId);
          if (!selectedClass) throw new Error("Selected class details not found.");
          
          const aiInput: GenerateScheduleInput = {
            classId: values.classId,
            academicYearId: values.academicYearId,
            instructions: values.instructions,
          };
          const generatedPeriods = await generateSchedule(aiInput);

          const newTimetablePayload = {
            name: `${selectedClass.name} - AI Generated`,
            academicYearId: values.academicYearId,
            classId: values.classId,
            termId: values.termId,
            description: `AI generated schedule with instructions: ${values.instructions || 'none'}`.trim(),
            periods: generatedPeriods.periods,
            isActive: false,
          };

          const createResponse = await fetch(API_URL_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTimetablePayload),
          });

          if (!createResponse.ok) {
            const errorData = await createResponse.json();
            throw new Error(errorData.error || "Failed to save the AI-generated timetable.");
          }
          message.success('AI-generated timetable has been successfully created as a new draft!');
          setIsModalVisible(false);
          fetchData();
        } catch (error: any) {
          console.error("AI Generation Error:", error);
          message.error(`AI generation failed: ${error.message}`);
        } finally {
          setAiLoading(false);
        }
        return;
      }
      
      let url = '';
      let method = '';
      let payload: any = {};

      if (modalMode === 'add') {
        url = API_URL_BASE;
        method = 'POST';
        payload = { ...values, periods: [] }; // New timetables start with no periods
      } else if (modalMode === 'edit' && editingTimetable) {
        url = `${API_URL_BASE}/${editingTimetable._id}`;
        method = 'PUT';
        payload = { ...values, periods: editingTimetable.periods || [] }; // Preserve existing periods
      } else if (modalMode === 'copy' && editingTimetable) {
        url = `${API_URL_BASE}/copy`; // Use the new static copy endpoint
        method = 'POST';
        payload = { // Payload for copy includes sourceId and new definition fields
            sourceTimetableId: editingTimetable._id,
            name: values.name,
            academicYearId: values.academicYearId,
            classId: values.classId,
            termId: values.termId,
            description: values.description
        };
      } else {
        message.error("Invalid operation mode.");
        return;
      }
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${modalMode} timetable`);
      }

      message.success(`Timetable ${modalMode === 'add' ? 'added' : (modalMode === 'edit' ? 'updated' : 'copied')} successfully`);
      setIsModalVisible(false);
      fetchData();
    } catch (error: any) {
      message.error(error.message || `Could not ${modalMode} timetable.`);
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
          <Button icon={<CopyOutlined />} onClick={() => handleCopyTimetable(record)}>Copy</Button>
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

  const getModalTitle = () => {
    if (modalMode === 'add') return 'Add New Timetable Definition';
    if (modalMode === 'edit') return 'Edit Timetable Details';
    if (modalMode === 'copy') return 'Copy Timetable As...';
    if (modalMode === 'ai') return 'Generate Timetable with AI';
    return 'Manage Timetable';
  };


  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={2}><ScheduleOutlined className="mr-2"/>Timetable Management</Title>
        <Space>
           <Button type="default" icon={<BulbOutlined />} onClick={handleAIGenerate}>
             AI Generate Schedule
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTimetable}>
              Add New Timetable Definition
            </Button>
        </Space>
      </div>
      <Table columns={columns} dataSource={timetables} rowKey="_id" scroll={{ x: 1300 }} />

      <Modal
        title={getModalTitle()}
        open={isModalVisible}
        onOk={handleModalOk}
        okButtonProps={{ loading: aiLoading || form.isSubmitting }}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={aiLoading || form.isSubmitting}
        destroyOnClose
        width={700}
      >
        <Form form={form} layout="vertical" name="timetableForm" className="mt-4"
          onValuesChange={(changedValues) => {
            if (changedValues.academicYearId !== undefined) {
                handleAcademicYearChangeInModal(changedValues.academicYearId, modalMode === 'add' || modalMode === 'copy');
            }
          }}
        >
          { modalMode !== 'ai' && (
            <Form.Item name="name" label="Timetable Name" rules={[{ required: true, message: "E.g., 'Form 1A - Term 1 Regular'" }]}>
                <Input placeholder="e.g., Form 1A - Term 1 Regular" />
            </Form.Item>
          )}
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
                    loading={loading && !selectedAcademicYearInModal && filteredClasses.length === 0} 
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
                    loading={loading && !selectedAcademicYearInModal && filteredTerms.length === 0}
                >
                  {filteredTerms.map(term => <Option key={term._id} value={term._id}>{term.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              {modalMode === 'edit' && ( 
                <Form.Item 
                    name="isActive" 
                    label="Set as Active Timetable" 
                    valuePropName="checked"
                    tooltip="Setting this active will deactivate other timetables for the same class/year/term."
                >
                    <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                </Form.Item>
              )}
            </Col>
          </Row>
           { modalMode !== 'ai' ? (
                <Form.Item name="description" label="Description (Optional)">
                    <TextArea rows={3} placeholder="Any specific notes about this timetable version or scope." />
                </Form.Item>
           ) : (
                <Form.Item name="instructions" label="AI Instructions (Optional)">
                    <TextArea rows={4} placeholder="Provide special instructions, e.g., 'Prioritize math in the morning. Avoid back-to-back science classes. Physical Education should be in the afternoon.'" />
                </Form.Item>
           )}

          {modalMode !== 'copy' && modalMode !== 'ai' && (
            <Paragraph type="secondary" className="text-sm">
                Detailed period scheduling (days, times, subjects, teachers) will be managed on the next page after creating or selecting a timetable definition.
            </Paragraph>
          )}
           {modalMode === 'copy' && (
            <Paragraph type="warning" className="text-sm">
                You are copying the structure and periods from an existing timetable. Adjust the name and academic context as needed for the new copy. The new timetable will be created as inactive by default.
            </Paragraph>
          )}
           {modalMode === 'ai' && (
            <Alert
                message="AI Generation Note"
                description="The AI will generate a complete, balanced weekly schedule based on the subjects and teachers assigned to the selected class. This process can take up to a minute. The generated timetable will be saved as a new draft, which you can then activate or edit."
                type="info"
                showIcon
            />
          )}
        </Form>
      </Modal>
    </div>
  );
}
    
