
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Typography, Table, Modal, Form, Input, Switch, message, Tag, Space, Spin, Popconfirm, Upload, Row, Col, Image as AntImage, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined, UploadOutlined } from '@ant-design/icons';
import type { IGalleryItem } from '@/models/Tenant/GalleryItem';
import moment from 'moment';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface GalleryItemDataType extends IGalleryItem {
  key: string;
}

interface GalleryManagementPageProps {
  params: { schoolCode: string };
}

export default function GalleryManagementPage({ params }: GalleryManagementPageProps) {
  const { schoolCode } = params;
  const [galleryItems, setGalleryItems] = useState<GalleryItemDataType[]>([]);
  const [albums, setAlbums] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItemDataType | null>(null);
  const [form] = Form.useForm();
  const [filterAlbum, setFilterAlbum] = useState<string | undefined>(undefined);

  const API_URL_BASE = `/api/${schoolCode}/website/gallery`;

  const fetchGalleryItems = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_URL_BASE}?adminView=true`;
      if (filterAlbum) {
        url += `&album=${filterAlbum}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch gallery items');
      }
      const data: IGalleryItem[] = await response.json();
      setGalleryItems(data.map(item => ({ ...item, key: item._id })));
      
      // Extract unique albums for filter dropdown if not already filtering
      if (!filterAlbum) {
        const uniqueAlbums = Array.from(new Set(data.map(item => item.album).filter(Boolean))) as string[];
        setAlbums(uniqueAlbums.sort());
      }

    } catch (error: any) {
      message.error(error.message || 'Could not load gallery items.');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, filterAlbum, API_URL_BASE]);

  useEffect(() => {
    fetchGalleryItems();
  }, [fetchGalleryItems]);

  const handleAddItem = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, tags: [] });
    setIsModalVisible(true);
  };

  const handleEditItem = (item: GalleryItemDataType) => {
    setEditingItem(item);
    form.setFieldsValue({
      ...item,
      tags: item.tags || [],
    });
    setIsModalVisible(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const response = await fetch(`${API_URL_BASE}/${itemId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete gallery item');
      }
      message.success('Gallery item deleted successfully');
      fetchGalleryItems(); // Refetch to update list and potentially album filter
    } catch (error: any) {
      message.error(error.message || 'Could not delete gallery item.');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = { 
        ...values,
        tags: Array.isArray(values.tags) ? values.tags : (values.tags ? values.tags.split(',').map((t:string)=>t.trim()) : [])
      };
      
      const url = editingItem ? `${API_URL_BASE}/${editingItem._id}` : API_URL_BASE;
      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingItem ? 'update' : 'add'} gallery item`);
      }

      message.success(`Gallery item ${editingItem ? 'updated' : 'added'} successfully`);
      setIsModalVisible(false);
      // Reset filter if a new album might have been created or items changed significantly
      if (editingItem && editingItem.album !== values.album && filterAlbum) {
        // Do nothing, keep filter
      } else if (!editingItem && values.album && !albums.includes(values.album.toLowerCase())) {
         setFilterAlbum(undefined); // Clear filter to show all including new album
      } else {
        fetchGalleryItems(); // General refetch
      }


    } catch (error: any) {
      message.error(error.message || `Could not ${editingItem ? 'update' : 'add'} gallery item.`);
    }
  };

  const columns = [
    { 
      title: 'Image', 
      dataIndex: 'imageUrl', 
      key: 'imageUrl', 
      render: (url: string) => <AntImage width={80} height={60} src={url} alt="gallery item" className="object-cover rounded"/> 
    },
    { title: 'Title', dataIndex: 'title', key: 'title', sorter: (a:GalleryItemDataType, b:GalleryItemDataType) => (a.title || "").localeCompare(b.title || "") },
    { title: 'Album', dataIndex: 'album', key: 'album', sorter: (a:GalleryItemDataType, b:GalleryItemDataType) => (a.album || "").localeCompare(b.album || ""), render: (album?:string) => album ? <Tag>{album}</Tag> : '-' },
    { title: 'Upload Date', dataIndex: 'uploadDate', key: 'uploadDate', render: (date: string) => moment(date).format('YYYY-MM-DD'), sorter: (a: GalleryItemDataType, b: GalleryItemDataType) => moment(a.uploadDate).unix() - moment(b.uploadDate).unix()},
    { title: 'Status', dataIndex: 'isActive', key: 'isActive', render: (isActive: boolean) => <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Active' : 'Hidden'}</Tag> },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: GalleryItemDataType) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEditItem(record)}>Edit</Button>
          <Popconfirm
            title="Delete this gallery item?"
            description="This action cannot be undone."
            onConfirm={() => handleDeleteItem(record._id)}
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
        <Title level={2}><PictureOutlined className="mr-2"/>Gallery Management</Title>
        <Space>
          <Select
            placeholder="Filter by Album"
            allowClear
            style={{ width: 200 }}
            value={filterAlbum}
            onChange={(value) => setFilterAlbum(value)}
            loading={loading && albums.length === 0}
          >
            {albums.map(album => <Option key={album} value={album}>{album}</Option>)}
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddItem}>
            Add New Image
          </Button>
        </Space>
      </div>
      <Spin spinning={loading}>
        <Table columns={columns} dataSource={galleryItems} rowKey="_id" />
      </Spin>

      <Modal
        title={editingItem ? 'Edit Gallery Item' : 'Add New Gallery Item'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={form.isSubmitting}
        destroyOnClose
        width={700}
      >
        <Form form={form} layout="vertical" name="galleryItemForm" className="mt-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="title" label="Title (Optional)">
                <Input placeholder="e.g., Prize Giving Ceremony" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="album" label="Album Name (Optional)">
                <Input placeholder="e.g., Sports Day 2023. Will be lowercased." />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="imageUrl" label="Image URL" rules={[{ required: true, type: 'url', message: 'Please enter a valid image URL' }]}>
            <Input placeholder="https://example.com/image.jpg" />
          </Form.Item>
          {/* Basic image preview */}
          {form.getFieldValue('imageUrl') && (
             <Form.Item label="Preview">
                <AntImage width={200} src={form.getFieldValue('imageUrl')} alt="preview" fallback="https://placehold.co/200x150.png?text=Invalid+URL"/>
             </Form.Item>
          )}
          <Form.Item name="description" label="Description (Optional)">
            <TextArea rows={3} placeholder="Brief description of the image" />
          </Form.Item>
          <Form.Item name="tags" label="Tags (Optional, comma-separated or use AntD Tag input)">
             <Select mode="tags" style={{ width: '100%' }} tokenSeparators={[',']} placeholder="e.g. students, event, sports. Will be lowercased."/>
          </Form.Item>
          <Form.Item 
            name="isActive" 
            label="Set as Active (Visible on Public Site)" 
            valuePropName="checked"
          >
            <Switch checkedChildren="Active" unCheckedChildren="Hidden" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
