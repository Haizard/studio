
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
  DesktopOutlined, 
  CalendarOutlined, 
  UnorderedListOutlined, 
  AppstoreOutlined,
  ScheduleOutlined as TimetableIcon,
  FileTextOutlined,
  UsergroupAddOutlined, 
  PictureOutlined,
  IdcardOutlined, 
  CheckSquareOutlined,
  FolderOpenOutlined, 
  ProjectOutlined,
  PercentageOutlined,
  BarsOutlined,
  BookFilled, 
  TeamOutlined as MembersIcon,
  ContainerOutlined,
  HistoryOutlined,
  PieChartOutlined, 
  CreditCardOutlined, 
  SlidersOutlined, 
  AreaChartOutlined,
  RocketOutlined,
  FileProtectOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react'; 
import mongoose from 'mongoose';


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
            { key: `${basePortalPath}/admin/students`, icon: <UserOutlined />, label: <Link href={`${basePortalPath}/admin/students`}>Students</Link> },
            { key: `${basePortalPath}/admin/teachers`, icon: <UsergroupAddOutlined />, label: <Link href={`${basePortalPath}/admin/teachers`}>Teachers</Link> },
            { 
              key: 'admin-academics', 
              icon: <BookOutlined />, 
              label: 'Academics',
              children: [
                { key: `${basePortalPath}/admin/academics`, icon: <DashboardOutlined />, label: <Link href={`${basePortalPath}/admin/academics`}>Overview</Link> },
                { key: `${basePortalPath}/admin/academics/academic-years`, icon: <CalendarOutlined />, label: <Link href={`${basePortalPath}/admin/academics/academic-years`}>Academic Years</Link> },
                { key: `${basePortalPath}/admin/academics/terms`, icon: <TimetableIcon />, label: <Link href={`${basePortalPath}/admin/academics/terms`}>Terms</Link> },
                { key: `${basePortalPath}/admin/academics/subjects`, icon: <UnorderedListOutlined />, label: <Link href={`${basePortalPath}/admin/academics/subjects`}>Subjects</Link> },
                { key: `${basePortalPath}/admin/academics/classes`, icon: <TeamOutlined />, label: <Link href={`${basePortalPath}/admin/academics/classes`}>Classes</Link> },
                { key: `${basePortalPath}/admin/academics/alevel-combinations`, icon: <AppstoreOutlined />, label: <Link href={`${basePortalPath}/admin/academics/alevel-combinations`}>A-Level Combinations</Link> },
                { key: `${basePortalPath}/admin/academics/timetables`, icon: <ProjectOutlined />, label: <Link href={`${basePortalPath}/admin/academics/timetables`}>Timetables</Link> },
                { key: `${basePortalPath}/admin/academics/grading-scales`, icon: <PercentageOutlined />, label: <Link href={`${basePortalPath}/admin/academics/grading-scales`}>Grading Scales</Link> },
                { key: `${basePortalPath}/admin/academics/teacher-assignments`, icon: <SlidersOutlined />, label: <Link href={`${basePortalPath}/admin/academics/teacher-assignments`}>Teacher Assignments</Link> },
              ]
            },
            { key: `${basePortalPath}/admin/exams`, icon: <FileTextOutlined />, label: <Link href={`${basePortalPath}/admin/exams`}>Exams</Link> },
            { key: `${basePortalPath}/admin/attendance`, icon: <TimetableIcon />, label: <Link href={`${basePortalPath}/admin/attendance`}>Attendance Records</Link> },
            { key: `${basePortalPath}/admin/reports`, icon: <BarChartOutlined />, label: <Link href={`${basePortalPath}/admin/reports`}>Reports</Link> },
            { key: `${basePortalPath}/admin/grading-promotion`, icon: <RocketOutlined />, label: <Link href={`${basePortalPath}/admin/grading-promotion`}>Grading & Promotion</Link> },
            { key: `${basePortalPath}/admin/settings`, icon: <SettingOutlined />, label: <Link href={`${basePortalPath}/admin/settings`}>School Settings</Link> },
          ],
        },
        {
          key: 'admin-finance', 
          icon: <DollarCircleOutlined />,
          label: 'Finance',
          children: [
            { key: `${basePortalPath}/admin/finance`, icon: <DashboardOutlined />, label: <Link href={`${basePortalPath}/admin/finance`}>Finance Overview</Link> },
            { key: `${basePortalPath}/admin/finance/fee-structure`, icon: <BarsOutlined />, label: <Link href={`${basePortalPath}/admin/finance/fee-structure`}>Fee Structure</Link> },
            { key: `${basePortalPath}/admin/finance/invoices`, icon: <FileProtectOutlined />, label: <Link href={`${basePortalPath}/admin/finance/invoices`}>Invoices</Link> },
            { key: `${basePortalPath}/admin/finance/student-fees`, icon: <CreditCardOutlined />, label: <Link href={`${basePortalPath}/admin/finance/student-fees`}>Record Payments</Link> },
            { key: `${basePortalPath}/admin/finance/expenses`, icon: <FolderOpenOutlined />, label: <Link href={`${basePortalPath}/admin/finance/expenses`}>Expense Tracking</Link> },
            { key: `${basePortalPath}/admin/finance/reports`, icon: <AreaChartOutlined />, label: <Link href={`${basePortalPath}/admin/finance/reports`}>Financial Reports</Link> },
          ]
        },
        {
          key: 'website-management',
          icon: <DesktopOutlined />,
          label: 'Website Management',
          children: [
            { key: `${basePortalPath}/admin/website-management`, icon: <DashboardOutlined />, label: <Link href={`${basePortalPath}/admin/website-management`}>Overview</Link> },
            { key: `${basePortalPath}/admin/website-management/news`, icon: <ReadOutlined />, label: <Link href={`${basePortalPath}/admin/website-management/news`}>News</Link> },
            { key: `${basePortalPath}/admin/website-management/blog`, icon: <EditOutlined />, label: <Link href={`${basePortalPath}/admin/website-management/blog`}>Blog</Link> },
            { key: `${basePortalPath}/admin/website-management/events`, icon: <CalendarOutlined />, label: <Link href={`${basePortalPath}/admin/website-management/events`}>Events</Link> },
            { key: `${basePortalPath}/admin/website-management/gallery`, icon: <PictureOutlined />, label: <Link href={`${basePortalPath}/admin/website-management/gallery`}>Gallery</Link> },
          ]
        },
        { 
          key: 'library-management', 
          icon: <ReadOutlined />, 
          label: 'Library',
          children: [
            { key: `${basePortalPath}/library`, icon: <DashboardOutlined />, label: <Link href={`${basePortalPath}/library`}>Library Overview</Link> },
            { key: `${basePortalPath}/library/books`, icon: <BookFilled />, label: <Link href={`${basePortalPath}/library/books`}>Book Catalog</Link> },
            { key: `${basePortalPath}/library/members`, icon: <MembersIcon />, label: <Link href={`${basePortalPath}/library/members`}>Member Management</Link> },
            { key: `${basePortalPath}/library/circulation`, icon: <ContainerOutlined />, label: <Link href={`${basePortalPath}/library/circulation`}>Circulation Desk</Link> },
            { key: `${basePortalPath}/library/transactions`, icon: <HistoryOutlined />, label: <Link href={`${basePortalPath}/library/transactions`}>Transactions</Link> },
            { key: `${basePortalPath}/library/inventory`, icon: <PieChartOutlined />, label: <Link href={`${basePortalPath}/library/inventory`}>Inventory & Reports</Link> },
          ]
        },
        { 
          key: `${basePortalPath}/pharmacy`, 
          icon: <MedicineBoxOutlined />, 
          label: 'Pharmacy',
          children: [
            { key: `${basePortalPath}/pharmacy`, icon: <DashboardOutlined />, label: <Link href={`${basePortalPath}/pharmacy`}>Overview</Link> },
            { key: `${basePortalPath}/pharmacy/records`, icon: <IdcardOutlined />, label: <Link href={`${basePortalPath}/pharmacy/records`}>Health Records</Link> },
            { key: `${basePortalPath}/pharmacy/visits`, icon: <HistoryOutlined />, label: <Link href={`${basePortalPath}/pharmacy/visits`}>Visit Log</Link> },
            { key: `${basePortalPath}/pharmacy/inventory`, icon: <UnorderedListOutlined />, label: <Link href={`${basePortalPath}/pharmacy/inventory`}>Inventory</Link> },
          ]
        },
        { key: `${basePortalPath}/admin/data-management`, icon: <FileExcelOutlined />, label: <Link href={`${basePortalPath}/admin/data-management`}>Data Import/Export</Link> },
        { key: `${basePortalPath}/dormitory`, icon: <HomeOutlined />, label: <Link href={`${basePortalPath}/dormitory`}>Dormitory</Link> }
      );
    }
    
    if (role === 'finance') {
      items.push(
        {
          key: 'admin-finance', 
          icon: <DollarCircleOutlined />,
          label: 'Finance Management',
          children: [
            { key: `${basePortalPath}/admin/finance`, icon: <DashboardOutlined />, label: <Link href={`${basePortalPath}/admin/finance`}>Finance Overview</Link> },
            { key: `${basePortalPath}/admin/finance/fee-structure`, icon: <BarsOutlined />, label: <Link href={`${basePortalPath}/admin/finance/fee-structure`}>Fee Structure</Link> },
            { key: `${basePortalPath}/admin/finance/invoices`, icon: <FileProtectOutlined />, label: <Link href={`${basePortalPath}/admin/finance/invoices`}>Invoices</Link> },
            { key: `${basePortalPath}/admin/finance/student-fees`, icon: <CreditCardOutlined />, label: <Link href={`${basePortalPath}/admin/finance/student-fees`}>Record Payments</Link> },
            { key: `${basePortalPath}/admin/finance/reports`, icon: <AreaChartOutlined />, label: <Link href={`${basePortalPath}/admin/finance/reports`}>Financial Reports</Link> },
          ]
        }
      );
    }
    
    if (role === 'librarian') { 
      items.push(
         { 
          key: 'library-management', 
          icon: <ReadOutlined />, 
          label: 'Library Management',
          children: [
            { key: `${basePortalPath}/library`, icon: <DashboardOutlined />, label: <Link href={`${basePortalPath}/library`}>Library Overview</Link> },
            { key: `${basePortalPath}/library/books`, icon: <BookFilled />, label: <Link href={`${basePortalPath}/library/books`}>Book Catalog</Link> },
            { key: `${basePortalPath}/library/members`, icon: <MembersIcon />, label: <Link href={`${basePortalPath}/library/members`}>Member Management</Link> },
            { key: `${basePortalPath}/library/circulation`, icon: <ContainerOutlined />, label: <Link href={`${basePortalPath}/library/circulation`}>Circulation Desk</Link> },
            { key: `${basePortalPath}/library/transactions`, icon: <HistoryOutlined />, label: <Link href={`${basePortalPath}/library/transactions`}>Transactions</Link> },
            { key: `${basePortalPath}/library/inventory`, icon: <PieChartOutlined />, label: <Link href={`${basePortalPath}/library/inventory`}>Inventory & Reports</Link> },
          ]
        }
      );
    }
    
    if (role === 'dormitory_master') {
      items.push(
        { key: `${basePortalPath}/dormitory`, icon: <HomeOutlined />, label: <Link href={`${basePortalPath}/dormitory`}>Dormitory Management</Link> }
      );
    }
    
    if (role === 'pharmacy') {
      items.push(
        { 
            key: `${basePortalPath}/pharmacy`, 
            icon: <MedicineBoxOutlined />, 
            label: 'Pharmacy',
            children: [
                { key: `${basePortalPath}/pharmacy`, icon: <DashboardOutlined />, label: <Link href={`${basePortalPath}/pharmacy`}>Pharmacy Overview</Link> },
                { key: `${basePortalPath}/pharmacy/records`, icon: <IdcardOutlined />, label: <Link href={`${basePortalPath}/pharmacy/records`}>Health Records</Link> },
                { key: `${basePortalPath}/pharmacy/visits`, icon: <HistoryOutlined />, label: <Link href={`${basePortalPath}/pharmacy/visits`}>Visit Log</Link> },
                { key: `${basePortalPath}/pharmacy/inventory`, icon: <UnorderedListOutlined />, label: <Link href={`${basePortalPath}/pharmacy/inventory`}>Inventory</Link> },
            ]
        }
      );
    }


    if (role === 'teacher') {
      items.push(
        { key: `${basePortalPath}/teacher/my-profile`, icon: <IdcardOutlined />, label: <Link href={`${basePortalPath}/teacher/my-profile`}>My Profile</Link> },
        { key: `${basePortalPath}/teacher/my-classes`, icon: <TeamOutlined />, label: <Link href={`${basePortalPath}/teacher/my-classes`}>My Classes</Link> },
        { key: `${basePortalPath}/teacher/my-timetable`, icon: <TimetableIcon />, label: <Link href={`${basePortalPath}/teacher/my-timetable`}>My Timetable</Link> },
        { key: `${basePortalPath}/teacher/attendance`, icon: <CheckSquareOutlined />, label: <Link href={`${basePortalPath}/teacher/attendance`}>Attendance</Link> },
        { key: `${basePortalPath}/teacher/marks-entry`, icon: <EditOutlined />, label: <Link href={`${basePortalPath}/teacher/marks-entry`}>Marks Entry</Link> },
        { key: `${basePortalPath}/teacher/resources`, icon: <FolderOpenOutlined />, label: <Link href={`${basePortalPath}/teacher/resources`}>Resources</Link> },
      );
    }
    
    if (role === 'student') {
      items.push(
        { key: `${basePortalPath}/student/my-profile`, icon: <UserOutlined />, label: <Link href={`${basePortalPath}/student/my-profile`}>My Profile</Link> },
        { key: `${basePortalPath}/student/my-results`, icon: <SolutionOutlined />, label: <Link href={`${basePortalPath}/student/my-results`}>My Results</Link> },
        { key: `${basePortalPath}/student/my-attendance`, icon: <CheckSquareOutlined />, label: <Link href={`${basePortalPath}/student/my-attendance`}>My Attendance</Link> },
        { key: `${basePortalPath}/student/resources`, icon: <FolderOpenOutlined />, label: <Link href={`${basePortalPath}/student/resources`}>Resources</Link> },
        { key: `${basePortalPath}/student/my-timetable`, icon: <TimetableIcon />, label: <Link href={`${basePortalPath}/student/my-timetable`}>My Timetable</Link> },
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
  
  if (!activeKeysResult.selected) {
    if (pathname.includes('/admin/exams/') && pathname.includes('/assessments')) { 
        selectedKey = `/${schoolCode}/portal/admin/exams`; 
    } else if (pathname.includes('/teacher/marks-entry/') && pathname.split('/').length > 6) {
        selectedKey = `/${schoolCode}/portal/teacher/marks-entry`; 
    } else if (pathname.startsWith(`/${schoolCode}/portal/admin/website-management/`)) {
        selectedKey = `/${schoolCode}/portal/admin/website-management`;
    } else if (pathname.startsWith(`/${schoolCode}/portal/admin/academics/timetables`) && pathname.includes('/periods')) {
        selectedKey = `/${schoolCode}/portal/admin/academics/timetables`;
    } else if (pathname.startsWith(`/${schoolCode}/portal/admin/academics/`)) {
        selectedKey = `/${schoolCode}/portal/admin/academics`;
    } else if (pathname.includes('/teacher/my-classes/') && mongoose.Types.ObjectId.isValid(pathname.split('/').pop() || '')) {
        selectedKey = `/${schoolCode}/portal/teacher/my-classes`;
    } else if (pathname.startsWith(`/${schoolCode}/portal/teacher/attendance/entry`)) { 
        selectedKey = `/${schoolCode}/portal/teacher/attendance`;
    } else if (pathname.startsWith(`/${schoolCode}/portal/admin/finance/reports/`)){
        selectedKey = `/${schoolCode}/portal/admin/finance/reports`;
    } else if (pathname.startsWith(`/${schoolCode}/portal/admin/finance/`)){
        selectedKey = `/${schoolCode}/portal/admin/finance`; 
    } else if (pathname.startsWith(`/${schoolCode}/portal/library/`)){
        selectedKey = `/${schoolCode}/portal/library`; 
        if (pathname.includes('/books')) selectedKey = `/${schoolCode}/portal/library/books`;
        if (pathname.includes('/members')) selectedKey = `/${schoolCode}/portal/library/members`;
        if (pathname.includes('/circulation')) selectedKey = `/${schoolCode}/portal/library/circulation`;
        if (pathname.includes('/transactions')) selectedKey = `/${schoolCode}/portal/library/transactions`;
        if (pathname.includes('/inventory')) selectedKey = `/${schoolCode}/portal/library/inventory`;
    } else if (pathname.startsWith(`/${schoolCode}/portal/dormitory/`)){
        selectedKey = `/${schoolCode}/portal/dormitory`;
    } else if (pathname.startsWith(`/${schoolCode}/portal/pharmacy/inventory`)) {
        selectedKey = `/${schoolCode}/portal/pharmacy/inventory`;
    } else if (pathname.startsWith(`/${schoolCode}/portal/pharmacy/records`)) {
        selectedKey = `/${schoolCode}/portal/pharmacy/records`;
    } else if (pathname.startsWith(`/${schoolCode}/portal/pharmacy/visits`)) {
        selectedKey = `/${schoolCode}/portal/pharmacy/visits`;
    } else if (pathname.startsWith(`/${schoolCode}/portal/pharmacy`)) {
        selectedKey = `/${schoolCode}/portal/pharmacy`;
    }
  }
  openKeys = activeKeysResult.open || [];

  if(selectedKey.includes('/admin/academics') || pathname.startsWith(`/${schoolCode}/portal/admin/academics/`)) openKeys.push('admin-academics','admin-management');
  if(selectedKey.includes('/admin/exams') || selectedKey.includes('/admin/attendance') || selectedKey.includes('/admin/reports') || selectedKey.includes('/admin/settings') || selectedKey.includes('/admin/users') || selectedKey.includes('/admin/students') || selectedKey.includes('/admin/teachers') || selectedKey.includes('/admin/grading-promotion')) openKeys.push('admin-management');
  if(selectedKey.includes('/admin/website-management')) openKeys.push('website-management'); 
  if(selectedKey.includes('/admin/finance')) openKeys.push('admin-finance');
  if(selectedKey.includes('/library')) openKeys.push('library-management');
  if(selectedKey.includes('/pharmacy')) openKeys.push(`${schoolCode}/portal/pharmacy`);


  const breadcrumbItemsGen = () => {
    const pathSnippets = pathname.split('/').filter(i => i);
    const portalIndex = pathSnippets.findIndex(p => p === 'portal');
    
    if (portalIndex === -1 || pathSnippets.length <= portalIndex + 1 ) { 
         return [{ title: <Link href={`/${schoolCode}/portal/dashboard`}>Home</Link>, key: `/${schoolCode}/portal/dashboard` }];
    }
    const relevantSnippets = pathSnippets.slice(portalIndex + 1); 


    const items = relevantSnippets.map((snippet, index) => {
      const url = `/${schoolCode}/portal/${relevantSnippets.slice(0, index + 1).join('/')}`;
      let title = snippet.charAt(0).toUpperCase() + snippet.slice(1).replace(/-/g, ' ');
      
      if (mongoose.Types.ObjectId.isValid(snippet)) {
        const prevSegment = relevantSnippets[index-1];
        const secondPrevSegment = relevantSnippets[index-2]; 
        const nextSegment = relevantSnippets[index+1]; 

        if (prevSegment === 'exams' && nextSegment === 'assessments') { 
            title = "Manage Assessments"; 
        } else if (prevSegment === 'marks-entry' && mongoose.Types.ObjectId.isValid(relevantSnippets[index+1])) { 
             title = `Exam Details`; 
        } else if (secondPrevSegment === 'marks-entry' && mongoose.Types.ObjectId.isValid(prevSegment)) { 
             title = "Enter Marks"; 
        } else if (prevSegment === 'my-classes' && mongoose.Types.ObjectId.isValid(snippet)) { 
             title = `Class Roster`; 
        } else if (prevSegment === 'timetables' && nextSegment === 'periods') {
             title = 'Manage Periods';
        } else if (prevSegment === 'dormitory' && nextSegment === 'rooms') {
            title = 'Manage Rooms';
        } else if (prevSegment === 'visits' && mongoose.Types.ObjectId.isValid(snippet)) {
            title = 'Manage Visit';
        }
        else {
            title = "Details"; 
        }
      } else if (snippet === 'entry' && relevantSnippets[index-1] === 'attendance') {
        title = "Record Attendance";
      } else if (snippet === 'student-fees' && relevantSnippets[index-1] === 'finance') {
        title = "Student Fee Collection";
      } else if (snippet === 'expense-summary' && relevantSnippets[index-1] === 'reports') {
        title = "Expense Summary";
      }


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
        <div className="h-16 flex items-center justify-center bg-primary-dark">
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
          defaultOpenKeys={Array.from(new Set(openKeys))} 
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
            <AntButton onClick={() => router.push(`/login?schoolCode=${schoolCode}`)}>"Login"</AntButton>
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
