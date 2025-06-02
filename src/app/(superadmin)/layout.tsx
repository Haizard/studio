
'use client';

import React from 'react';
import { Layout, Menu, Typography, Avatar, Dropdown, Space } from 'antd';
import {
  DashboardOutlined,
  DeploymentUnitOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const SuperAdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: <Link href="/dashboard">Dashboard</Link>,
    },
    {
      key: '/schools',
      icon: <DeploymentUnitOutlined />,
      label: <Link href="/schools">Schools</Link>,
    },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      label: 'My Profile',
      icon: <UserOutlined />,
    },
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogoutOutlined />,
      danger: true,
    },
  ];

  // Determine selected key based on current path
  const selectedKeys = menuItems.find(item => pathname.startsWith(item.key))?.key || '/dashboard';


  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        trigger={null} // We can add a custom trigger later if needed
        theme="dark"
        className="shadow-lg"
      >
        <div className="h-16 flex items-center justify-center">
          <Title level={3} style={{ color: 'white', margin: 0 }}>SuperAdmin</Title>
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[selectedKeys]} items={menuItems} />
      </Sider>
      <Layout>
        <Header className="bg-white p-0 px-6 flex justify-end items-center shadow">
          <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
            <a onClick={(e) => e.preventDefault()} className="flex items-center">
              <Space>
                <Avatar icon={<UserOutlined />} />
                <span>Super Admin User</span>
              </Space>
            </a>
          </Dropdown>
        </Header>
        <Content className="m-4">
          <div className="p-6 bg-white rounded-lg shadow min-h-full">
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default SuperAdminLayout;
