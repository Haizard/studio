
import React from 'react';
import { Typography, Card, Row, Col, Button, Empty, Tag } from 'antd';
import Link from 'next/link'; // For potential future single event pages
import Image from 'next/image';
import type { IEvent } from '@/models/Tenant/Event';
import { CalendarOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { getTenantConnection } from '@/lib/db';
import EventModel from '@/models/Tenant/Event';
import { TenantUserSchemaDefinition, ITenantUser } from '@/models/Tenant/User';
import mongoose from 'mongoose';

interface EventsPageProps {
  params: { schoolCode: string };
}

async function getEvents(schoolCode: string): Promise<IEvent[]> {
  try {
    const tenantDb = await getTenantConnection(schoolCode);
    if (!tenantDb.models.Event) {
        tenantDb.model<IEvent>('Event', EventModel.schema);
    }
     if (!tenantDb.models.User) {
      tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
    }
    const Event = tenantDb.models.Event as mongoose.Model<IEvent>;
    
    const events = await Event.find({ isActive: true })
      .populate<{ authorId: ITenantUser }>({
        path: 'authorId', 
        model: 'User',
        select: 'firstName lastName username'
      })
      .sort({ startDate: 1 }) 
      .lean(); 

    return events as IEvent[];
  } catch (error: any) {
    console.error(`Error fetching events for ${schoolCode}:`, error);
    return [];
  }
}

export default async function EventsListingPage({ params }: EventsPageProps) {
  const { schoolCode } = params;
  const events = await getEvents(schoolCode);

  const upcomingEvents = events.filter(event => new Date(event.startDate) >= new Date());
  const pastEvents = events.filter(event => new Date(event.startDate) < new Date()).sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).slice(0, 5); // Show last 5 past events

  return (
    <div className="container mx-auto px-4 py-8">
      <Typography.Title level={2} className="mb-8 text-center">
        <CalendarOutlined className="mr-2" /> School Events Calendar
      </Typography.Title>

      <Typography.Title level={3} className="mb-6">Upcoming Events</Typography.Title>
      {upcomingEvents.length === 0 ? (
        <div className="text-center mb-8">
          <Empty description="No upcoming events found at the moment. Please check back later." />
        </div>
      ) : (
        <Row gutter={[24, 24]} className="mb-12">
          {upcomingEvents.map((event) => (
            <Col xs={24} sm={12} md={8} key={event._id as string}>
              <Card
                hoverable
                className="h-full flex flex-col shadow-lg rounded-lg overflow-hidden"
                cover={
                  event.featuredImageUrl ? (
                    <Image
                      alt={event.title}
                      src={event.featuredImageUrl}
                      width={600}
                      height={300}
                      className="w-full h-48 object-cover"
                      data-ai-hint="event students meeting"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-400">
                      <CalendarOutlined style={{ fontSize: '48px' }} />
                    </div>
                  )
                }
              >
                <Card.Meta
                  title={<span className="text-lg font-semibold text-primary">{event.title}</span>}
                />
                <div className="my-3 space-y-1">
                  <p className="text-sm text-gray-700">
                    <CalendarOutlined className="mr-2 text-secondary-default" /> 
                    {new Date(event.startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    {event.endDate && ` - ${new Date(event.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`}
                    <br/>
                    Time: {new Date(event.startDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    {event.endDate && ` - ${new Date(event.endDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
                  </p>
                  {event.location && (
                    <p className="text-sm text-gray-600">
                      <EnvironmentOutlined className="mr-2 text-secondary-default" /> {event.location}
                    </p>
                  )}
                </div>
                {event.description && (
                    <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} className="text-sm">
                      {event.description}
                    </Typography.Paragraph>
                )}
                <div className="mt-3">
                  {event.category && <Tag color="blue" className="mr-1 mb-1">{event.category}</Tag>}
                  {event.audience && event.audience.map(aud => <Tag key={aud} className="text-xs mb-1">{aud}</Tag>)}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Typography.Title level={3} className="mb-6">Recent Past Events</Typography.Title>
      {pastEvents.length === 0 ? (
        <div className="text-center">
          <Empty description="No recent past events to display." />
        </div>
      ) : (
        <Row gutter={[24, 24]}>
          {pastEvents.map((event) => (
             <Col xs={24} sm={12} md={8} key={event._id as string}>
              <Card
                className="h-full flex flex-col shadow-md rounded-lg overflow-hidden opacity-75"
                cover={
                  event.featuredImageUrl ? (
                    <Image
                      alt={event.title}
                      src={event.featuredImageUrl}
                      width={600}
                      height={300}
                      className="w-full h-40 object-cover"
                       data-ai-hint="event students celebration"
                    />
                  ) : (
                     <div className="w-full h-40 bg-gray-200 flex items-center justify-center text-gray-400">
                      <CalendarOutlined style={{ fontSize: '36px' }} />
                    </div>
                  )
                }
              >
                <Card.Meta
                  title={<span className="text-md font-semibold text-gray-700">{event.title}</span>}
                />
                 <p className="text-xs text-gray-500 mt-1">
                    {new Date(event.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                {event.category && <Tag className="mt-2 text-xs">{event.category}</Tag>}
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
