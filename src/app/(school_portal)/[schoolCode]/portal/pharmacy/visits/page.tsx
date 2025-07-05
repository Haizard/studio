
'use client';
import React from 'react';
import { Typography, Empty } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function PharmacyVisitsPage() {
    return (
        <div>
            <Title level={2} className="mb-6"><HistoryOutlined className="mr-2"/>Pharmacy Visit Log</Title>
            <Paragraph>This page will be used to log new student visits and view the history of past visits to the pharmacy.</Paragraph>
            <Empty description="Feature coming soon."/>
        </div>
    );
}
