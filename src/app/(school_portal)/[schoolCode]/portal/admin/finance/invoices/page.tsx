
'use client';
import React from 'react';
import { Typography, Empty } from 'antd';
import { FileProtectOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function InvoicesPage() {
  return (
    <div>
      <Title level={2} className="mb-6">
        <FileProtectOutlined className="mr-2" /> Invoicing
      </Title>
      <Paragraph>
        This section will be used to generate, view, and manage student fee invoices.
      </Paragraph>
      <Empty description="Invoice management user interface is under development." />
    </div>
  );
}
