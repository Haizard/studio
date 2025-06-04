
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Table, Modal, Form, Input, Switch, message, Tag, Space, Spin, Popconfirm, Select, InputNumber, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PercentageOutlined, MinusCircleOutlined } from '@ant-design/icons';
import type { IGradingScale, IGradeDefinition, IDivisionConfig, ScaleType } from '@/models/Tenant/GradingScale';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';

const { Title, Paragraph } = Typography;
const { Option } = Select;

const scaleTypes: ScaleType[] = ['Standard Percentage', 'General GPA', 'O-Level Division Points', 'A-Level Subject Points', 'Primary School Aggregate'];
const passStatuses: IGradeDefinition['passStatus'][] = ['Pass', 'Fail', 'SubsidiaryPass'];


interface GradingScaleDataType extends IGradingScale {
  key: string;
  academicYearName?: string;
}

interface GradingScalesPageProps {
  params: { schoolCode: string };
}

export default function GradingScalesPage({ params }: GradingScalesPageProps) {
  const { schoolCode } = params;
  const [gradingScales, setGradingScales] = useState<GradingScaleDataType[]>([]);
  const [academicYears, setAcademicYears] = useState<IAcademicYear[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingScale, setEditingScale] = useState<GradingScaleDataType | null>(null);
  const [form] = Form.useForm();
  
  const modalScaleType = Form.useWatch('scaleType', form);

  const API_URL_BASE = `/api/${schoolCode}/portal/admin/academics/grading-scales`;
  const ACADEMIC_YEARS_API = `/api/${schoolCode}/portal/academics/academic-years`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [scalesRes, yearsRes] = await Promise.all([
        fetch(API_URL_BASE),
        fetch(ACADEMIC_YEARS_API),
      ]);

      if (!scalesRes.ok) throw new Error((await scalesRes.json()).error || 'Failed to fetch grading scales');
      if (!yearsRes.ok) throw new Error((await yearsRes.json()).error || 'Failed to fetch academic years');
      
      const scalesData: IGradingScale[] = await scalesRes.json();
      const yearsData: IAcademicYear[] = await yearsRes.json();

      setGradingScales(scalesData.map(scale => ({ 
        ...scale, 
        key: scale._id,
        academicYearName: (scale.academicYearId as IAcademicYear)?.name || 'N/A (General)',
      })));
      setAcademicYears(yearsData.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));

    } catch (error: any) {
      message.error(error.message || 'Could not load initial data.');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, API_URL_BASE, ACADEMIC_YEARS_API]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddScale = () => {
    setEditingScale(null);
    form.resetFields();
    form.setFieldsValue({ 
        isDefault: false, 
        grades: [{ grade: '', minScore: 0, maxScore: 0, remarks: '', points: undefined, gpa: undefined, passStatus: undefined }],
        scaleType: 'Standard Percentage',
        divisionConfigs: []
    });
    setIsModalVisible(true);
  };

  const handleEditScale = (scale: GradingScaleDataType) => {
    setEditingScale(scale);
    form.setFieldsValue({
      ...scale,
      academicYearId: typeof scale.academicYearId === 'object' ? (scale.academicYearId as IAcademicYear)?._id : scale.academicYearId,
      grades: scale.grades?.length > 0 ? scale.grades : [{ grade: '', minScore: 0, maxScore: 0 }],
      divisionConfigs: scale.divisionConfigs || [],
    });
    setIsModalVisible(true);
  };

  const handleDeleteScale = async (scaleId: string) => {
    const scaleToDelete = gradingScales.find(s => s._id === scaleId);
    if (scaleToDelete?.isDefault) {
        message.error("Cannot delete the default grading scale. Please set another scale as default first.");
        return;
    }
    try {
      const response = await fetch(`${API_URL_BASE}/${scaleId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete grading scale');
      }
      message.success('Grading scale deleted successfully');
      fetchData();
    } catch (error: any) {
      message.error(error.message || 'Could not delete grading scale.');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values };
      
      const url = editingScale ? `${API_URL_BASE}/${editingScale._id}` : API_URL_BASE;
      const method = editingScale ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingScale ? 'update' : 'add'} grading scale`);
      }

      message.success(`Grading scale ${editingScale ? 'updated' : 'added'} successfully`);
      setIsModalVisible(false);
      fetchData();
    } catch (error: any) {
      message.error(error.message || `Could not ${editingScale ? 'update' : 'add'} grading scale.`);
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', sorter: (a:GradingScaleDataType, b:GradingScaleDataType) => a.name.localeCompare(b.name) },
    { title: 'Type', dataIndex: 'scaleType', key: 'scaleType', render: (type?: ScaleType) => type || 'N/A' },
    { title: 'Level', dataIndex: 'level', key: 'level', render: (level?: string) => level || 'All Levels' },
    { title: 'Academic Year', dataIndex: 'academicYearName', key: 'academicYearName' },
    { title: 'Default', dataIndex: 'isDefault', key: 'isDefault', render: (isDefault: boolean) => <Tag color={isDefault ? 'green' : 'blue'}>{isDefault ? 'Yes' : 'No'}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: GradingScaleDataType) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEditScale(record)}>Edit</Button>
          <Popconfirm
            title="Delete this grading scale?"
            description="This action cannot be undone. Ensure this scale is not in use."
            onConfirm={() => handleDeleteScale(record._id)}
            okText="Yes, Delete"
            cancelText="No"
            disabled={record.isDefault}
          >
            <Button icon={<DeleteOutlined />} danger disabled={record.isDefault}>Delete</Button>
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
        <Title level={2}><PercentageOutlined className="mr-2"/>Grading Scale Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddScale}>
          Add New Grading Scale
        </Button>
      </div>
      <Paragraph>Define and manage grading scales, including O-Level divisions and A-Level points, for different academic contexts.</Paragraph>
      <Table columns={columns} dataSource={gradingScales} rowKey="_id" />

      <Modal
        title={editingScale ? 'Edit Grading Scale' : 'Add New Grading Scale'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting}
        destroyOnClose
        width="80vw"
        style={{maxWidth: '1000px'}}
      >
        <Form form={form} layout="vertical" name="gradingScaleForm" className="mt-4">
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="name" label="Scale Name" rules={[{ required: true, message: "E.g., 'O-Level Scale 2024'" }]}>
                <Input placeholder="e.g., O-Level Standard Scale" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="scaleType" label="Scale Type" rules={[{ required: true }]}>
                <Select placeholder="Select scale type">
                  {scaleTypes.map(type => <Option key={type} value={type}>{type}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
                <Form.Item name="academicYearId" label="Academic Year (Optional)">
                    <Select placeholder="General or select specific year" allowClear>
                    {academicYears.map(year => <Option key={year._id} value={year._id}>{year.name}</Option>)}
                    </Select>
                </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
                <Form.Item name="level" label="Educational Level (Optional)">
                    <Input placeholder="e.g., O-Level, A-Level, Primary 7" />
                </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
                <Form.Item name="isDefault" label="Set as Default Scale" valuePropName="checked" tooltip="Setting this as default will unset any other default scale.">
                    <Switch />
                </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description (Optional)">
            <Input.TextArea rows={2} placeholder="Brief description of when or how this scale is used." />
          </Form.Item>

          <Title level={5} className="mt-6 mb-3">Grade Definitions</Title>
          <Form.List name="grades">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Card key={key} size="small" className="mb-3" bodyStyle={{padding: '12px'}}>
                    <Row gutter={16} align="middle">
                      <Col xs={24} sm={4}><Form.Item {...restField} name={[name, 'grade']} label="Grade" rules={[{ required: true }]} className="!mb-2"><Input placeholder="A" /></Form.Item></Col>
                      <Col xs={12} sm={4}><Form.Item {...restField} name={[name, 'minScore']} label="Min Score" rules={[{ required: true, type: 'number' }]} className="!mb-2"><InputNumber min={0} max={1000} style={{width: '100%'}} placeholder="80"/></Form.Item></Col>
                      <Col xs={12} sm={4}><Form.Item {...restField} name={[name, 'maxScore']} label="Max Score" rules={[{ required: true, type: 'number' }]} className="!mb-2"><InputNumber min={0} max={1000} style={{width: '100%'}} placeholder="100"/></Form.Item></Col>
                      <Col xs={12} sm={3}><Form.Item {...restField} name={[name, 'points']} label="Points" className="!mb-2"><InputNumber style={{width: '100%'}} placeholder="e.g., 1 (O-L), 5 (A-L)"/></Form.Item></Col>
                      <Col xs={12} sm={3}><Form.Item {...restField} name={[name, 'gpa']} label="GPA" className="!mb-2"><InputNumber step={0.1} style={{width: '100%'}} placeholder="5.0"/></Form.Item></Col>
                      <Col xs={24} sm={4}>
                        <Form.Item {...restField} name={[name, 'passStatus']} label="Pass Status" className="!mb-2">
                          <Select placeholder="Optional" allowClear>
                            {passStatuses.map(ps => <Option key={ps} value={ps}>{ps}</Option>)}
                          </Select>
                        </Form.Item>
                      </Col>
                       <Col xs={24} sm={24} md={18}><Form.Item {...restField} name={[name, 'remarks']} label="Remarks" className="!mb-2"><Input placeholder="Excellent"/></Form.Item></Col>
                      <Col xs={24} md={2} className="flex items-end pb-2">
                        {fields.length > 1 ? <MinusCircleOutlined onClick={() => remove(name)} style={{fontSize: '20px', color: 'red'}} /> : null}
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add({ grade: '', minScore: 0, maxScore: 0 })} block icon={<PlusOutlined />}>
                    Add Grade Definition
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          {modalScaleType === 'O-Level Division Points' && (
            <>
              <Title level={5} className="mt-6 mb-3">O-Level Division Configurations</Title>
              <Form.List name="divisionConfigs">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Card key={key} size="small" className="mb-3" bodyStyle={{padding: '12px'}}>
                        <Row gutter={16} align="middle">
                            <Col xs={24} sm={6}><Form.Item {...restField} name={[name, 'division']} label="Division" rules={[{ required: true }]} className="!mb-2"><Input placeholder="I, II, 0" /></Form.Item></Col>
                            <Col xs={12} sm={5}><Form.Item {...restField} name={[name, 'minPoints']} label="Min Points" rules={[{ required: true, type: 'number' }]} className="!mb-2"><InputNumber style={{width: '100%'}} placeholder="7"/></Form.Item></Col>
                            <Col xs={12} sm={5}><Form.Item {...restField} name={[name, 'maxPoints']} label="Max Points" rules={[{ required: true, type: 'number' }]} className="!mb-2"><InputNumber style={{width: '100%'}} placeholder="17"/></Form.Item></Col>
                            <Col xs={24} sm={6}><Form.Item {...restField} name={[name, 'description']} label="Description" className="!mb-2"><Input placeholder="Excellent"/></Form.Item></Col>
                            <Col xs={24} md={2} className="flex items-end pb-2">
                                {fields.length > 0 ? <MinusCircleOutlined onClick={() => remove(name)} style={{fontSize: '20px', color: 'red'}} /> : null}
                            </Col>
                        </Row>
                      </Card>
                    ))}
                    <Form.Item>
                      <Button type="dashed" onClick={() => add({ division: '', minPoints: 0, maxPoints: 0, description: '' })} block icon={<PlusOutlined />}>
                        Add Division Configuration
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
