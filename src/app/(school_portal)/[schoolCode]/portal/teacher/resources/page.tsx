
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Table, Modal, Form, Input, Select, Switch, message, Tag, Space, Spin, Popconfirm, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, LinkOutlined, FileTextOutlined, VideoOutlined, PictureOutlined, FolderOpenOutlined, PaperClipOutlined } from '@ant-design/icons';
import type { ITeacherResource, ResourceFileType } from '@/models/Tenant/TeacherResource';
import type { IAcademicYear } from '@/models/Tenant/AcademicYear';
import type { ISubject } from '@/models/Tenant/Subject';

const { Title, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const fileTypes: ResourceFileType[] = ['PDF', 'Document', 'Spreadsheet', 'Presentation', 'Image', 'Video', 'Audio', 'Link', 'Other'];

interface ResourceDataType extends ITeacherResource {
  key: string;
  academicYearName?: string;
  subjectName?: string;
}

interface TeacherResourcesPageProps {
  params: { schoolCode: string };
}

export default function TeacherResourcesPage({ params }: TeacherResourcesPageProps) {
  const { schoolCode } = params;
  const [resources, setResources] = useState<ResourceDataType[]>([]);
  const [academicYears, setAcademicYears] = useState<IAcademicYear[]>([]);
  const [subjects, setSubjects] = useState<ISubject[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceDataType | null>(null);
  const [form] = Form.useForm();

  const API_URL_BASE = `/api/${schoolCode}/portal/teacher/resources`;
  const ACADEMIC_YEARS_API = `/api/${schoolCode}/portal/academics/academic-years`;
  const SUBJECTS_API = `/api/${schoolCode}/portal/academics/subjects`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resourcesRes, yearsRes, subjectsRes] = await Promise.all([
        fetch(API_URL_BASE), // Fetches resources for the logged-in teacher
        fetch(ACADEMIC_YEARS_API),
        fetch(SUBJECTS_API)
      ]);

      if (!resourcesRes.ok) throw new Error((await resourcesRes.json()).error || 'Failed to fetch resources');
      if (!yearsRes.ok) throw new Error((await yearsRes.json()).error || 'Failed to fetch academic years');
      if (!subjectsRes.ok) throw new Error((await subjectsRes.json()).error || 'Failed to fetch subjects');
      
      const resourcesData: ITeacherResource[] = await resourcesRes.json();
      const yearsData: IAcademicYear[] = await yearsRes.json();
      const subjectsData: ISubject[] = await subjectsRes.json();

      setResources(resourcesData.map(res => ({ 
        ...res, 
        key: res._id,
        academicYearName: (res.academicYearId as IAcademicYear)?.name || 'N/A',
        subjectName: (res.subjectId as ISubject)?.name || 'N/A (General)',
      })));
      setAcademicYears(yearsData.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
      setSubjects(subjectsData.sort((a,b) => a.name.localeCompare(b.name)));

    } catch (error: any) {
      message.error(error.message || 'Could not load initial data.');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, API_URL_BASE, ACADEMIC_YEARS_API, SUBJECTS_API]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddResource = () => {
    setEditingResource(null);
    form.resetFields();
    const activeYear = academicYears.find(ay => ay.isActive);
    form.setFieldsValue({ 
        isPublic: false, 
        academicYearId: activeYear ? activeYear._id : (academicYears.length > 0 ? academicYears[0]._id : undefined),
        fileType: 'Link' 
    });
    setIsModalVisible(true);
  };

  const handleEditResource = (resource: ResourceDataType) => {
    setEditingResource(resource);
    form.setFieldsValue({
      ...resource,
      academicYearId: typeof resource.academicYearId === 'object' ? resource.academicYearId._id : resource.academicYearId,
      subjectId: resource.subjectId && typeof resource.subjectId === 'object' ? (resource.subjectId as ISubject)._id : resource.subjectId,
    });
    setIsModalVisible(true);
  };

  const handleDeleteResource = async (resourceId: string) => {
    try {
      const response = await fetch(`${API_URL_BASE}/${resourceId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete resource');
      }
      message.success('Resource deleted successfully');
      fetchData();
    } catch (error: any) {
      message.error(error.message || 'Could not delete resource.');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values };
      
      const url = editingResource ? `${API_URL_BASE}/${editingResource._id}` : API_URL_BASE;
      const method = editingResource ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingResource ? 'update' : 'add'} resource`);
      }

      message.success(`Resource ${editingResource ? 'updated' : 'added'} successfully`);
      setIsModalVisible(false);
      fetchData();
    } catch (error: any) {
      message.error(error.message || `Could not ${editingResource ? 'update' : 'add'} resource.`);
    }
  };
  
  const getFileTypeIcon = (fileType?: ResourceFileType) => {
    switch(fileType) {
      case 'PDF': return <FileTextOutlined className="text-red-500" />;
      case 'Document': return <FileTextOutlined className="text-blue-500" />;
      case 'Spreadsheet': return <FileTextOutlined className="text-green-500" />;
      case 'Presentation': return <VideoOutlined className="text-orange-500" />;
      case 'Image': return <PictureOutlined className="text-purple-500" />;
      case 'Video': return <VideoOutlined className="text-red-700" />;
      case 'Audio': return <PaperClipOutlined className="text-indigo-500" />;
      case 'Link': return <LinkOutlined className="text-sky-500" />;
      default: return <FolderOpenOutlined />;
    }
  };

  const columns = [
    { title: 'Title', dataIndex: 'title', key: 'title', sorter: (a:ResourceDataType, b:ResourceDataType) => a.title.localeCompare(b.title) },
    { title: 'Type', dataIndex: 'fileType', key: 'fileType', render: (type?: ResourceFileType) => <Space>{getFileTypeIcon(type)} {type || 'N/A'}</Space>},
    { title: 'Subject', dataIndex: 'subjectName', key: 'subjectName' },
    { title: 'Class Level', dataIndex: 'classLevel', key: 'classLevel', render: (level?:string)=> level || '-' },
    { title: 'Academic Year', dataIndex: 'academicYearName', key: 'academicYearName' },
    { title: 'Public', dataIndex: 'isPublic', key: 'isPublic', render: (isPublic: boolean) => <Tag color={isPublic ? 'green' : 'orange'}>{isPublic ? 'Yes' : 'No'}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ResourceDataType) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEditResource(record)}>Edit</Button>
          <Popconfirm
            title="Delete this resource?"
            description="This action cannot be undone."
            onConfirm={() => handleDeleteResource(record._id)}
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
        <Title level={2}><FolderOpenOutlined className="mr-2"/>My Teaching Resources</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddResource}>
          Add New Resource
        </Button>
      </div>
      <Table columns={columns} dataSource={resources} rowKey="_id" />

      <Modal
        title={editingResource ? 'Edit Resource' : 'Add New Resource'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting}
        destroyOnClose
        width={700}
      >
        <Form form={form} layout="vertical" name="resourceForm" className="mt-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="title" label="Resource Title" rules={[{ required: true }]}>
                <Input placeholder="e.g., Chapter 1 Notes" />
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
          <Form.Item name="description" label="Description (Optional)">
            <TextArea rows={3} placeholder="Brief description of the resource" />
          </Form.Item>
           <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="fileUrl" label="File URL or Link" rules={[{ required: true, type: 'url', message:'Please enter a valid URL' }]}>
                <Input placeholder="https://example.com/resource.pdf or https://youtube.com/watch?v=..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="fileType" label="File Type">
                <Select placeholder="Select file type">
                    {fileTypes.map(type => <Option key={type} value={type}>{type}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="subjectId" label="Subject (Optional)">
                <Select placeholder="Select subject if applicable" allowClear>
                  {subjects.map(subject => <Option key={subject._id} value={subject._id}>{subject.name} {subject.code ? `(${subject.code})` : ''}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="classLevel" label="Class Level (Optional)">
                <Input placeholder="e.g., Form 1, S.5, All O-Level" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item 
            name="isPublic" 
            label="Make Public for Students?" 
            valuePropName="checked"
            tooltip="If checked, students may see this resource if it matches their class/subject context."
          >
            <Switch checkedChildren="Public" unCheckedChildren="Private" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
