
'use client';
import React from 'react';
import { Typography, Empty } from 'antd';
import { UnorderedListOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function MedicationInventoryPage() {
    return (
        <div>
            <Title level={2} className="mb-6"><UnorderedListOutlined className="mr-2"/>Medication Inventory</Title>
            <Paragraph>This page will allow managing the stock of medications and medical supplies.</Paragraph>
            <Empty description="Feature coming soon."/>
        </div>
    );
}
