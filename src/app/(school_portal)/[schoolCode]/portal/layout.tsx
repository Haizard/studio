
'use client';

import React from 'react';
import { Layout, Menu, Typography, Avatar, Dropdown, Space, Breadcrumb, Button as AntButton, Spin } from 'antd';
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
  BarChartOutlined,
  DesktopOutlined, // For Website Management
  CalendarOutlined, // For Academic Years
  UnorderedListOutlined, // For Subjects
  AppstoreAddOutlined // For A-Level Combinations
} from '@ant-design/icons';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react'; 

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

interface SchoolPortalLayoutProps {
  children: React.ReactNode;
  params: { schoolCode: string };
}

const SchoolPortalLayout: React.FC<SchoolPortalLayoutProps> = ({ children, params }) => {
  const { schoolCode } = params;
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession(); 

  const userRole = (session?.user as any)?.role || 'student'; 
  const userName = (session?.user as any)?.name || (session?.user as any)?.email || 'User';
  const userAvatar = (session?.user as any)?.image;

  const getMenuItems = (role: string) => {
    const basePortalPath = `/${schoolCode}/portal`;
    let items = [
      {
        key: `${basePortalPath}/dashboard`,
        icon: <DashboardOutlined />,
        label: <Link href={`${basePortalPath}/dashboard`}>Dashboard</Link>,
      },
    ];

    if (role === 'admin' || role === 'superadmin') { 
      items.push(
        {
          key: 'admin-management',
          icon: <SettingOutlined />,
          label: 'School Administration',
          children: [
            { key: `${basePortalPath}/admin/users`, icon: <TeamOutlined />, label: <Link href={`${basePortalPath}/admin/users`}>Users</Link> },
            { 
              key: 'admin-academics', 
              icon: <BookOutlined />, 
              label: 'Academics',
              children: [
                { key: `${basePortalPath}/admin/academics`, icon: <DashboardOutlined />, label: <Link href={`${basePortalPath}/admin/academics`}>Overview</Link> },
                { key: `${basePortalPath}/admin/academics/academic-years`, icon: <CalendarOutlined />, label: <Link href={`${basePortalPath}/admin/academics/academic-years`}>Academic Years</Link> },
                { key: `${basePortalPath}/admin/academics/subjects`, icon: <UnorderedListOutlined />, label: <Link href={`${basePortalPath}/admin/academics/subjects`}>Subjects</Link> },
                { key: `${basePortalPath}/admin/academics/classes`, icon: <TeamOutlined />, label: <Link href={`${basePortalPath}/admin/academics/classes`}>Classes</Link> },
                { key: `${basePortalPath}/admin/academics/alevel-combinations`, icon: <AppstoreAddOutlined />, label: <Link href={`${basePortalPath}/admin/academics/alevel-combinations`}>A-Level Combinations</Link> },
              ]
            },
            { key: `${basePortalPath}/admin/exams`, icon: <EditOutlined />, label: <Link href={`${basePortalPath}/admin/exams`}>Exams</Link> },
            { key: `${basePortalPath}/admin/reports`, icon: <BarChartOutlined />, label: <Link href={`${basePortalPath}/admin/reports`}>Reports</Link> },
            { key: `${basePortalPath}/admin/settings`, icon: <SettingOutlined />, label: <Link href={`${basePortalPath}/admin/settings`}>School Settings</Link> },
          ],
        },
        {
          key: 'website-management',
          icon: <DesktopOutlined />,
          label: 'Website Management',
          children: [
            { key: `${basePortalPath}/admin/website-management`, icon: <DashboardOutlined />, label: <Link href={`${basePortalPath}/admin/website-management`}>Overview</Link> },
            { key: `${basePortalPath}/admin/website-management/news`, icon: <ReadOutlined />, label: <Link href={`${basePortalPath}/admin/website-management/news`}>News</Link> },
            // Add more links here for Events, Gallery, Website Settings etc.
            // { key: `${basePortalPath}/admin/website-management/events`, icon: <CalendarOutlined />, label: <Link href={`${basePortalPath}/admin/website-management/events`}>Events</Link> },
            // { key: `${basePortalPath}/admin/website-management/gallery`, icon: <PictureOutlined />, label: <Link href={`${basePortalPath}/admin/website-management/gallery`}>Gallery</Link> },
            // { key: `${basePortalPath}/admin/website-management/settings`, icon: <SettingOutlined />, label: <Link href={`${basePortalPath}/admin/website-management/settings`}>Settings</Link> },
          ]
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

  const handleLogout = async () => {
    await signOut({ redirect: false, callbackUrl: `/login?schoolCode=${schoolCode}` });
    router.push(`/login?schoolCode=${schoolCode}`);
  };

  const userAccountMenuItems = [
    { key: 'logout', label: 'Logout', icon: <LogoutOutlined />, danger: true, onClick: handleLogout },
  ];

  let selectedKey = '';
  let openKeys: string[] = [];

  const findActiveKeys = (items: any[], currentPath: string): { selected?: string, open?: string[] } => {
    for (const item of items) {
      if (item.children) {
        const childResult = findActiveKeys(item.children, currentPath);
        if (childResult.selected) {
          return { selected: childResult.selected, open: [item.key, ...(childResult.open || [])].filter(Boolean) as string[] };
        }
      } else if (item.key && currentPath.startsWith(item.key)) {
        if (currentPath === item.key || currentPath.startsWith(item.key + '/')) {
           return { selected: item.key, open: [] };
        }
      }
    }
    return {};
  };
  
  const activeKeysResult = findActiveKeys(menuItems, pathname);
  selectedKey = activeKeysResult.selected || `/${schoolCode}/portal/dashboard`;
  openKeys = activeKeysResult.open || [];


  const breadcrumbItemsGen = () => {
    const pathSnippets = pathname.split('/').filter(i => i);
    const portalIndex = pathSnippets.findIndex(p => p === 'portal');
    const relevantSnippets = pathSnippets.slice(portalIndex + 1);

    const items = relevantSnippets.map((snippet, index) => {
      const url = `/${schoolCode}/portal/${relevantSnippets.slice(0, index + 1).join('/')}`;
      const title = snippet.charAt(0).toUpperCase() + snippet.slice(1).replace(/-/g, ' ');
      const isLast = index === relevantSnippets.length - 1;
      return {
        title: isLast ? title : <Link href={url}>{title}</Link>,
        key: url
      };
    });
    return [{ title: <Link href={`/${schoolCode}/portal/dashboard`}>Home</Link>, key: `/${schoolCode}/portal/dashboard` }, ...items];
  }
  const breadcrumbItems = breadcrumbItemsGen();

  if (status === "loading") {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Spin size="large" tip="Loading session..." />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme="dark"
        className="shadow-lg"
        breakpoint="lg"
        collapsedWidth="0"
      >
        <div className="h-16 flex items-center justify-center bg-primary-dark"> {/* Use a theme color */}
          <Link href={`/${schoolCode}/portal/dashboard`}>
            <Title level={3} style={{ color: 'white', margin: 0, cursor: 'pointer', padding: '0 10px', textAlign: 'center' }}>
              {schoolCode.toUpperCase()} Portal
            </Title>
          </Link>
        </div>
        <Menu 
          theme="dark" 
          mode="inline" 
          selectedKeys={[selectedKey]} 
          defaultOpenKeys={openKeys}
          items={menuItems} 
          className="mt-2"
        />
      </Sider>
      <Layout>
        <Header className="bg-white p-0 px-6 flex justify-between items-center shadow">
          <Breadcrumb items={breadcrumbItems} className="text-sm" />
          {session?.user ? (
            <Dropdown menu={{ items: userAccountMenuItems }} trigger={['click']}>
              <a onClick={(e) => e.preventDefault()} className="flex items-center cursor-pointer p-2 hover:bg-gray-100 rounded">
                <Space>
                  <Avatar icon={<UserOutlined />} src={userAvatar} />
                  <Text>{userName}</Text>
                </Space>
              </a>
            </Dropdown>
          ) : (
            <AntButton onClick={() => router.push(`/login?schoolCode=${schoolCode}`)}>Login</AntButton>
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

export default SchoolPortalLayout;
