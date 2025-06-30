
import React from 'react';
import { Typography, Card, Row, Col, Empty, Avatar } from 'antd';
import { UserOutlined, BookOutlined } from '@ant-design/icons';
import Image from 'next/image';
import type { ITeacher } from '@/models/Tenant/Teacher';
import type { ITenantUser } from '@/models/Tenant/User';

interface PublicStaffMember extends Pick<ITeacher, 'specialization'> {
  _id: string;
  userId: Pick<ITenantUser, 'firstName' | 'lastName' | 'profilePictureUrl'>;
}


interface StaffPageProps {
  params: { schoolCode: string };
}

async function getStaff(schoolCode: string): Promise<PublicStaffMember[]> {
  try {
    const apiUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/${schoolCode}/website/staff`;
    const res = await fetch(apiUrl, { cache: 'no-store' });

    if (!res.ok) {
      console.error(`Failed to fetch staff for ${schoolCode}: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    console.error(`Error in getStaff function for ${schoolCode}:`, error);
    return [];
  }
}

export default async function StaffDirectoryPage({ params }: StaffPageProps) {
  const { schoolCode } = params;
  const staff = await getStaff(schoolCode);

  return (
    <div className="container mx-auto px-4 py-8">
      <Typography.Title level={2} className="mb-8 text-center">
        <UserOutlined className="mr-2" /> Our Staff & Faculty
      </Typography.Title>

      <Typography.Paragraph className="text-center text-lg max-w-3xl mx-auto mb-12">
        Meet the dedicated and experienced team of educators and staff members who make our school a center of excellence and a nurturing community for our students.
      </Typography.Paragraph>

      {staff.length === 0 ? (
        <div className="text-center">
          <Empty description="Staff information is not available at the moment. Please check back later." />
        </div>
      ) : (
        <Row gutter={[24, 24]}>
          {staff.map((member) => (
            <Col xs={24} sm={12} md={8} lg={6} key={member._id}>
              <Card hoverable className="h-full text-center shadow-lg rounded-lg">
                <Avatar
                  size={96}
                  src={member.userId.profilePictureUrl || undefined}
                  icon={<UserOutlined />}
                  className="mb-4 border-2 border-primary"
                />
                <Typography.Title level={4} className="!mb-0">
                  {member.userId.firstName} {member.userId.lastName}
                </Typography.Title>
                {member.specialization && (
                  <Typography.Paragraph type="secondary" className="mt-1">
                     <BookOutlined className="mr-2"/> {member.specialization}
                  </Typography.Paragraph>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
