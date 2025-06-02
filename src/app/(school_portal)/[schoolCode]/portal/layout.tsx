
'use client';

import React from 'react';
import { Layout, Menu, Typography, Avatar, Dropdown, Space, Breadcrumb } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  BookOutlined,
  SettingOutlined,
  LogoutOutlined,
  ReadOutlined,
  SolutionOutlined,
  EditOutlined,
  DollarCircleOutlined,
  MedicineBoxOutlined,
  HomeOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

interface SchoolPortalLayoutProps {
  children: React.ReactNode;
  params: { schoolCode: string };
}

const SchoolPortalLayout: React.FC<SchoolPortalLayoutProps> = ({ children, params }) => {
  const { schoolCode } = params;
  const pathname = usePathname();

  // Placeholder user role - this would come from auth context
  const userRole: 'admin' | 'teacher' | 'student' = 'admin'; 

  const getMenuItems = (role: string) => {
    const basePortalPath = `/${schoolCode}/portal`;
    let items = [
      {
        key: `${basePortalPath}/dashboard`,
        icon: <DashboardOutlined />,
        label: <Link href={`${basePortalPath}/dashboard`}>Dashboard</Link>,
      },
    ];

    if (role === 'admin') {
      items.push(
        {
          key: 'admin-management',
          icon: <SettingOutlined />,
          label: 'Administration',
          children: [
            { key: `${basePortalPath}/admin/users`, icon: <TeamOutlined />, label: <Link href={`${basePortalPath}/admin/users`}>Users</Link> },
            { key: `${basePortalPath}/admin/academics`, icon: <BookOutlined />, label: <Link href={`${basePortalPath}/admin/academics`}>Academics</Link> },
            { key: `${basePortalPath}/admin/exams`, icon: <EditOutlined />, label: <Link href={`${basePortalPath}/admin/exams`}>Exams</Link> },
            { key: `${basePortalPath}/admin/reports`, icon: <BarChartOutlined />, label: <Link href={`${basePortalPath}/admin/reports`}>Reports</Link> },
            { key: `${basePortalPath}/admin/website-management`, icon: <ReadOutlined />, label: <Link href={`${basePortalPath}/admin/website-management`}>Website</Link> },
            { key: `${basePortalPath}/admin/settings`, icon: <SettingOutlined />, label: <Link href={`${basePortalPath}/admin/settings`}>Settings</Link> },
          ],
        },
        { key: `${basePortalPath}/finance`, icon: <DollarCircleOutlined />, label: <Link href={`${basePortalPath}/finance`}>Finance</Link> },
        { key: `${basePortalPath}/library`, icon: <ReadOutlined />, label: <Link href={`${basePortalPath}/library`}>Library</Link> },
        { key: `${basePortalPath}/pharmacy`, icon: <MedicineBoxOutlined />, label: <Link href={`${basePortalPath}/pharmacy`}>Pharmacy</Link> },
        { key: `${basePortalPath}/dormitory`, icon: <HomeOutlined />, label: <Link href={`${basePortalPath}/dormitory`}>Dormitory</Link> },
      );
    } else if (role === 'teacher') {
      items.push(
        { key: `${basePortalPath}/teacher/my-classes`, icon: <TeamOutlined />, label: <Link href={`${basePortalPath}/teacher/my-classes`}>My Classes</Link> },
        { key: `${basePortalPath}/teacher/marks-entry`, icon: <EditOutlined />, label: <Link href={`${basePortalPath}/teacher/marks-entry`}>Marks Entry</Link> },
        { key: `${basePortalPath}/teacher/resources`, icon: <BookOutlined />, label: <Link href={`${basePortalPath}/teacher/resources`}>Resources</Link> },
      );
    } else if (role === 'student') {
      items.push(
        { key: `${basePortalPath}/student/my-profile`, icon: <UserOutlined />, label: <Link href={`${basePortalPath}/student/my-profile`}>My Profile</Link> },
        { key: `${basePortalPath}/student/my-results`, icon: <SolutionOutlined />, label: <Link href={`${basePortalPath}/student/my-results`}>My Results</Link> },
        { key: `${basePortalPath}/student/resources`, icon: <BookOutlined />, label: <Link href={`${basePortalPath}/student/resources`}>Resources</Link> },
      );
    }
    return items;
  };
  
  const menuItems = getMenuItems(userRole);

  const userAccountMenuItems = [
    { key: 'profile', label: 'My Profile', icon: <UserOutlined /> },
    { key: 'logout', label: 'Logout', icon: <LogoutOutlined />, danger: true },
  ];

  // Determine selected key and open keys based on current path
  let selectedKey = '';
  let openKeys: string[] = [];

  const findActiveKeys = (items: any[], currentPath: string): { selected?: string, open?: string[] } => {
    for (const item of items) {
      if (item.children) {
        const childResult = findActiveKeys(item.children, currentPath);
        if (childResult.selected) {
          return { selected: childResult.selected, open: [item.key, ...(childResult.open || [])] };
        }
      } else if (item.key && currentPath.startsWith(item.key)) {
        return { selected: item.key, open: [] };
      }
    }
    return {};
  };
  
  const activeKeysResult = findActiveKeys(menuItems, pathname);
  selectedKey = activeKeysResult.selected || `${schoolCode}/portal/dashboard`;
  openKeys = activeKeysResult.open || [];


  const breadcrumbItems = pathname.split('/').filter(p => p && p !== schoolCode && p !== 'portal').map((item, index, arr) => {
    const path = `/${schoolCode}/portal/${arr.slice(0, index + 1).join('/')}`;
    const isLast = index === arr.length - 1;
    const title = item.charAt(0).toUpperCase() + item.slice(1).replace(/-/g, ' ');
    return {
      title: isLast ? title : <Link href={path}>{title}</Link>,
    };
  });
  
  const homeBreadcrumb = {title: <Link href={`/${schoolCode}/portal/dashboard`}>Home</Link>};


  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme="dark"
        className="shadow-lg"
        breakpoint="lg"
        collapsedWidth="0"
      >
        <div className="h-16 flex items-center justify-center">
          <Link href={`/${schoolCode}/portal/dashboard`}>
            <Title level={3} style={{ color: 'white', margin: 0, cursor: 'pointer' }}>{schoolCode.toUpperCase()} Portal</Title>
          </Link>
        </div>
        <Menu 
          theme="dark" 
          mode="inline" 
          selectedKeys={[selectedKey]} 
          defaultOpenKeys={openKeys}
          items={menuItems} 
        />
      </Sider>
      <Layout>
        <Header className="bg-white p-0 px-6 flex justify-between items-center shadow">
          <Breadcrumb items={[homeBreadcrumb, ...breadcrumbItems]} />
          <Dropdown menu={{ items: userAccountMenuItems }} trigger={['click']}>
            <a onClick={(e) => e.preventDefault()} className="flex items-center">
              <Space>
                <Avatar icon={<UserOutlined />} />
                <span>User Name</span> {/* Placeholder */}
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

export default SchoolPortalLayout;
