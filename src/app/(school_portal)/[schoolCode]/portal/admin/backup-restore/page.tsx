
'use client';
import React from 'react';
import { Typography, Card, Row, Col, Button, Alert, List, Upload } from 'antd';
import { SaveOutlined, UploadOutlined, DatabaseOutlined, HistoryOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';

const { Title, Paragraph } = Typography;

const props: UploadProps = {
  name: 'file',
  action: '/api/placeholder-upload', // Placeholder
  headers: {
    authorization: 'authorization-text',
  },
  onChange(info) {
    if (info.file.status !== 'uploading') {
      console.log(info.file, info.fileList);
    }
    if (info.file.status === 'done') {
      message.success(`${info.file.name} file uploaded successfully`);
    } else if (info.file.status === 'error') {
      message.error(`${info.file.name} file upload failed.`);
    }
  },
};

export default function BackupRestorePage() {
  return (
    <div>
      <Title level={2} className="mb-6">
        <DatabaseOutlined className="mr-2" /> Backup & Restore
      </Title>
      <Paragraph className="mb-8">
        Manage your school's data by creating backups or restoring from a previously created file. This is a critical operation and should be performed with caution.
      </Paragraph>

      <Alert
        message="Feature Under Development"
        description="The backend logic for creating and restoring backups is not yet implemented. This UI is a placeholder for the future functionality."
        type="warning"
        showIcon
        className="mb-8"
      />

      <Row gutter={[24, 24]}>
        <Col xs={24} md={12}>
          <Card title={<><SaveOutlined className="mr-2" />Create a New Backup</>} className="h-full">
            <Paragraph>
              Create a complete snapshot of your school's current database. This file can be used to restore your data to this exact point in time. The process may take several minutes depending on the size of your database.
            </Paragraph>
            <Button type="primary" size="large" disabled>
              Create Full System Backup
            </Button>
            <Paragraph type="secondary" className="text-xs mt-4">
              This will generate a secure file and make it available for download.
            </Paragraph>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title={<><UploadOutlined className="mr-2" />Restore from Backup</>} className="h-full">
            <Paragraph className="text-red-600 font-semibold">
              Warning: Restoring from a backup will completely overwrite all current data in your school's database. This action cannot be undone.
            </Paragraph>
            <Paragraph>
              Upload a previously created backup file to restore your system to a past state. Ensure you have selected the correct file.
            </Paragraph>
            <Upload {...props} disabled>
                <Button icon={<UploadOutlined />} size="large" disabled>Select Backup File to Restore</Button>
            </Upload>
          </Card>
        </Col>
      </Row>

      <Card title={<><HistoryOutlined className="mr-2" />Backup History</>} className="mt-8">
        <Paragraph>This section will list previously created backups with timestamps and download links.</Paragraph>
        <List
            bordered
            dataSource={[]}
            renderItem={item => (<List.Item>{item}</List.Item>)}
            locale={{ emptyText: 'No backups have been created yet.' }}
        />
      </Card>
    </div>
  );
}

// Dummy message function for placeholder
const message = {
    success: (msg: string) => console.log(`SUCCESS: ${msg}`),
    error: (msg: string) => console.error(`ERROR: ${msg}`),
};
