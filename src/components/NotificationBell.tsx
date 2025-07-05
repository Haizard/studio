
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Badge, Dropdown, List, Spin, Avatar, Button, Empty, Tooltip, message } from 'antd';
import { Bell } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import type { INotification } from '@/models/Tenant/Notification';
import moment from 'moment';

const getNotificationIcon = (type: INotification['type']) => {
    switch (type) {
        case 'success':
            return <Avatar style={{ backgroundColor: '#52c41a' }}>✓</Avatar>;
        case 'warning':
            return <Avatar style={{ backgroundColor: '#faad14' }}>!</Avatar>;
        case 'error':
            return <Avatar style={{ backgroundColor: '#f5222d' }}>✗</Avatar>;
        default:
            return <Avatar style={{ backgroundColor: '#1677ff' }}>i</Avatar>;
    }
};

export default function NotificationBell() {
    const { data: session } = useSession();
    const params = useParams();
    const router = useRouter();
    const schoolCode = params.schoolCode as string;

    const [notifications, setNotifications] = useState<INotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [dropdownVisible, setDropdownVisible] = useState(false);

    const API_BASE = `/api/${schoolCode}/portal/notifications`;

    const fetchNotifications = useCallback(async () => {
        if (!session?.user || !schoolCode) return;
        setLoading(true);
        try {
            const res = await fetch(API_BASE);
            if (!res.ok) throw new Error('Failed to fetch notifications');
            const data: INotification[] = await res.json();
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.isRead).length);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            // message.error('Could not load notifications.'); // Maybe too noisy
        } finally {
            setLoading(false);
        }
    }, [session, schoolCode, API_BASE]);
    
    // Fetch notifications initially and then on an interval
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000); // Poll every 60 seconds
        return () => clearInterval(interval);
    }, [fetchNotifications]);
    
    const handleNotificationClick = async (notification: INotification) => {
        // Mark as read optimistic update
        const originalNotifications = [...notifications];
        setNotifications(notifications.map(n => n._id === notification._id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => prev > 0 ? prev - 1 : 0);
        setDropdownVisible(false);

        // Navigate if link exists
        if (notification.link) {
            router.push(notification.link);
        }

        // API call to mark as read
        try {
            if (!notification.isRead) {
                await fetch(`${API_BASE}/${notification._id}/read`, { method: 'PUT' });
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            // Revert optimistic update on failure
            setNotifications(originalNotifications);
            setUnreadCount(originalNotifications.filter(n => !n.isRead).length);
            message.error("Failed to update notification status.");
        }
    };

    const handleMarkAllAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.isRead).map(n => n._id);
        if (unreadIds.length === 0) return;

        const originalNotifications = [...notifications];
        setNotifications(notifications.map(n => ({...n, isRead: true})));
        setUnreadCount(0);

        try {
            await Promise.all(
                unreadIds.map(id => fetch(`${API_BASE}/${id}/read`, { method: 'PUT' }))
            );
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
            setNotifications(originalNotifications);
            setUnreadCount(originalNotifications.filter(n => !n.isRead).length);
            message.error("Failed to mark all as read.");
        }
    };

    const notificationMenu = (
        <div className="bg-white rounded-md shadow-lg border border-gray-200 w-80 sm:w-96">
            <div className="p-3 flex justify-between items-center border-b">
                <h3 className="font-semibold text-base">Notifications</h3>
                <Button type="link" onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
                    Mark all as read
                </Button>
            </div>
            {loading ? (
                <div className="p-4 text-center"><Spin /></div>
            ) : notifications.length === 0 ? (
                <div className="p-4">
                    <Empty description="You have no notifications."/>
                </div>
            ) : (
                <List
                    itemLayout="horizontal"
                    dataSource={notifications}
                    className="max-h-96 overflow-y-auto"
                    renderItem={item => (
                        <List.Item
                            onClick={() => handleNotificationClick(item)}
                            className={`cursor-pointer hover:bg-gray-50 ${!item.isRead ? 'bg-blue-50' : ''}`}
                            style={{ padding: '12px 16px' }}
                        >
                            <List.Item.Meta
                                avatar={getNotificationIcon(item.type)}
                                title={<span className={`font-semibold ${!item.isRead ? 'text-gray-800' : 'text-gray-600'}`}>{item.title}</span>}
                                description={<p className="text-sm text-gray-500 mb-0">{item.message}</p>}
                            />
                             <div className="text-xs text-gray-400 self-start pt-1">{moment(item.createdAt).fromNow(true)}</div>
                        </List.Item>
                    )}
                />
            )}
            <div className="p-2 text-center border-t">
                 {/* Footer if needed */}
            </div>
        </div>
    );

    return (
        <Dropdown
            dropdownRender={() => notificationMenu}
            trigger={['click']}
            open={dropdownVisible}
            onOpenChange={setDropdownVisible}
        >
            <a onClick={e => e.preventDefault()} className="flex items-center">
                <Badge count={unreadCount} size="small">
                    <Bell className="h-6 w-6 text-gray-600 hover:text-primary transition-colors" />
                </Badge>
            </a>
        </Dropdown>
    );
}
