
'use client';
import React from 'react';
import { Typography, Card, Row, Col, Statistic, Spin, Table, Button, Avatar, Progress, Calendar, Badge, List } from 'antd';
import { 
  TeamOutlined, 
  BookOutlined, 
  ProfileOutlined, 
  TrophyOutlined,
  UserOutlined,
  DownloadOutlined,
  EyeOutlined,
  BellOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { useSession } from 'next-auth/react';
import './dashboard.css';

const { Title, Paragraph, Text } = Typography;

interface SchoolPortalDashboardPageProps {
  params: { schoolCode: string };
}

// Mock data for demonstration
const mockStudents = [
  { key: '1', name: 'Alice Johnson', class: 'Grade 10A', status: 'Present', avatar: 'AJ' },
  { key: '2', name: 'Bob Smith', class: 'Grade 10B', status: 'Present', avatar: 'BS' },
  { key: '3', name: 'Carol Davis', class: 'Grade 9A', status: 'Absent', avatar: 'CD' },
  { key: '4', name: 'David Wilson', class: 'Grade 11A', status: 'Present', avatar: 'DW' },
];

const mockPerformers = [
  { rank: 1, name: 'Emma Thompson', score: '98%', avatar: 'ET' },
  { rank: 2, name: 'James Rodriguez', score: '96%', avatar: 'JR' },
  { rank: 3, name: 'Sophia Chen', score: '94%', avatar: 'SC' },
];

const mockNotifications = [
  { id: 1, title: 'Emergency School Closure', time: '5 hours ago', icon: '🚨' },
  { id: 2, title: 'New Extracurricular Clubs', time: '4:00 PM', icon: '🎯' },
  { id: 3, title: 'Parent-Teacher Meeting', time: 'Tomorrow', icon: '👥' },
];

const mockLibraryBooks = [
  { category: 'Literature', count: 245, icon: '📚' },
  { category: 'Science', count: 189, icon: '🔬' },
  { category: 'Mathematics', count: 156, icon: '📐' },
  { category: 'History', count: 203, icon: '📜' },
];

export default function SchoolPortalDashboardPage({ params }: SchoolPortalDashboardPageProps) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-full"><Spin size="large" /></div>;
  }

  const studentColumns = [
    {
      title: 'Student',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <div className="student-info">
          <Avatar className="student-avatar">{record.avatar}</Avatar>
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: 'Class',
      dataIndex: 'class',
      key: 'class',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Badge 
          status={status === 'Present' ? 'success' : 'error'} 
          text={status} 
        />
      ),
    },
  ];

  return (
    <div className="dashboard-content">
      {/* Welcome Section */}
      <div className="welcome-section">
        <Title level={1} className="welcome-title">Welcome.</Title>
        <Paragraph className="welcome-subtitle">
          Navigate the future of education with Schooli.
        </Paragraph>
      </div>

      {/* Stats Cards */}
      <Row gutter={[24, 24]} className="stats-section">
        <Col xs={24} sm={8}>
          <Card className="stat-card students-card" hoverable>
            <div className="stat-content">
              <div className="stat-icon students">
                <TeamOutlined />
              </div>
              <div className="stat-info">
                <Title level={3} className="stat-number">15.00K</Title>
                <Text className="stat-label">Students</Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card teachers-card" hoverable>
            <div className="stat-content">
              <div className="stat-icon teachers">
                <ProfileOutlined />
              </div>
              <div className="stat-info">
                <Title level={3} className="stat-number">200</Title>
                <Text className="stat-label">Teachers</Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card awards-card" hoverable>
            <div className="stat-content">
              <div className="stat-icon awards">
                <TrophyOutlined />
              </div>
              <div className="stat-info">
                <Title level={3} className="stat-number">5.6K</Title>
                <Text className="stat-label">Awards</Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Content Grid */}
      <div className="content-grid">
        {/* Class Routine */}
        <Card className="card class-routine" title="Class Routine" extra={<a href="#">View All</a>}>
          <div className="routine-calendar">
            <div className="calendar-nav">
              <Button type="text" icon={<CalendarOutlined />}>October, 2023</Button>
            </div>
            <Calendar fullscreen={false} />
            <div className="routine-actions">
              <Button type="primary" icon={<DownloadOutlined />} className="btn-primary">
                Download routine (pdf)
              </Button>
              <Button icon={<DownloadOutlined />} className="btn-secondary">
                Download marks (pdf)
              </Button>
            </div>
          </div>
        </Card>

        {/* Library */}
        <Card className="card library" title="Library" extra={<a href="#">View All</a>}>
          <div className="library-books">
            {mockLibraryBooks.map((book, index) => (
              <div key={index} className="book-item">
                <div className="book-icon">{book.icon}</div>
                <div className="book-info">
                  <Title level={5}>{book.category}</Title>
                  <Text>{book.count} books</Text>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Students Table */}
        <Card className="card students" title="Students" extra={<a href="#">View All</a>}>
          <Table 
            dataSource={mockStudents} 
            columns={studentColumns} 
            pagination={false}
            size="small"
            className="students-table"
          />
        </Card>

        {/* Total Exams */}
        <Card className="card total-exams" title="Total Exams">
          <div className="exam-count">24</div>
          <Paragraph>You have 24 exams scheduled for this semester.</Paragraph>
          <a href="#">View exam schedule</a>
        </Card>

        {/* Best Performers */}
        <Card className="card best-performers" title="Best Performers">
          <div className="performers-list">
            {mockPerformers.map((performer) => (
              <div key={performer.rank} className="performer-item">
                <div className="rank">{performer.rank}</div>
                <Avatar className="performer-avatar">{performer.avatar}</Avatar>
                <div className="performer-info">
                  <Text strong>{performer.name}</Text>
                  <Text className="score">{performer.score}</Text>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Notifications */}
        <Card className="card notifications" title="Notifications" extra={<a href="#">View All</a>}>
          <List
            dataSource={mockNotifications}
            renderItem={(item) => (
              <List.Item className="notification-item">
                <div className="notification-avatar">{item.icon}</div>
                <div className="notification-content">
                  <Title level={5}>{item.title}</Title>
                  <Text>{item.time}</Text>
                </div>
              </List.Item>
            )}
          />
        </Card>
      </div>
    </div>
  );
}
