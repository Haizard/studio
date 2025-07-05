
'use client';
import React from 'react';
import { Typography, Empty } from 'antd';
import { IdcardOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function HealthRecordsPage() {
    return (
        <div>
            <Title level={2} className="mb-6"><IdcardOutlined className="mr-2"/>Student Health Records</Title>
            <Paragraph>This page will be used to view and manage student health records, including allergies and chronic conditions.</Paragraph>
            <Empty description="Feature coming soon."/>
        </div>
    );
}
