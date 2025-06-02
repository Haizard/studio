
'use client';

import React from 'react';
import { Layout, Menu, Typography, Avatar, Dropdown, Space, Button as AntButton } from 'antd';
import {
  DashboardOutlined,
  DeploymentUnitOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const SuperAdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

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

  const handleLogout = async () => {
    await signOut({ redirect: false, callbackUrl: '/login' });
    router.push('/login'); // Ensure redirection after signout
  };

  const userMenuItems = [
    // {
    //   key: 'profile',
    //   label: 'My Profile', // Link to a superadmin profile page if needed
    //   icon: <UserOutlined />,
    // },
    // { type: 'divider' as const },
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: handleLogout,
    },
  ];

  const selectedKeys = menuItems.find(item => pathname.startsWith(item.key))?.key || '/dashboard';

  if (status === "loading") {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {/* You can use an AntD Spin component here for a better loading indicator */}
          <p>Loading session...</p> 
        </Content>
      </Layout>
    );
  }

  // if (status === "unauthenticated") {
  //   // router.push('/login'); // Handled by middleware mostly
  //   return null; 
  // }


  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        // trigger={null} // We can add a custom trigger later if needed
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
          {session?.user ? (
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              <a onClick={(e) => e.preventDefault()} className="flex items-center cursor-pointer">
                <Space>
                  <Avatar icon={<UserOutlined />} src={session.user.image || undefined} />
                  <Text>{session.user.name || session.user.email}</Text>
                </Space>
              </a>
            </Dropdown>
          ) : (
             <AntButton onClick={() => router.push('/login')}>Login</AntButton>
          )}
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
