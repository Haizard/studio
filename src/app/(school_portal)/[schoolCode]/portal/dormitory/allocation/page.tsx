
'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Typography, Select, Card, Form, message, Spin, Row, Col, Space as AntSpace, Alert, Transfer } from 'antd';
import type { TransferDirection } from 'antd/es/transfer';
import { HomeOutlined, SwapOutlined, TeamOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import type { IDormitory } from '@/models/Tenant/Dormitory';
import type { IRoom } from '@/models/Tenant/Room';
import type { IStudent } from '@/models/Tenant/Student';
import type { ITenantUser } from '@/models/Tenant/User';
import type { IClass } from '@/models/Tenant/Class';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface StudentOption {
  key: string; // student's userId
  title: string;
  description: string;
}

export default function StudentAllocationPage() {
    const params = useParams();
    const router = useRouter();
    const schoolCode = params.schoolCode as string;

    const [dormitories, setDormitories] = useState<IDormitory[]>([]);
    const [selectedDormitory, setSelectedDormitory] = useState<string | undefined>();
    
    const [rooms, setRooms] = useState<(IRoom & { occupants: ITenantUser[] })[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<(IRoom & { occupants: ITenantUser[] }) | undefined>();

    const [unallocatedStudents, setUnallocatedStudents] = useState<StudentOption[]>([]);
    const [targetKeys, setTargetKeys] = useState<string[]>([]); // student userIds in the selected room

    const [loadingDorms, setLoadingDorms] = useState(true);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [saving, setSaving] = useState(false);

    const DORMITORIES_API = `/api/${schoolCode}/portal/dormitory/dormitories`;
    const ROOMS_API_BASE = `/api/${schoolCode}/portal/dormitory/rooms`;
    const UNALLOCATED_STUDENTS_API = `/api/${schoolCode}/portal/dormitory/unallocated-students`;

    // Fetch dormitories
    useEffect(() => {
        const fetchDorms = async () => {
            setLoadingDorms(true);
            try {
                const res = await fetch(DORMITORIES_API);
                if (!res.ok) throw new Error('Failed to fetch dormitories');
                setDormitories(await res.json());
            } catch (err: any) { message.error(err.message); }
            finally { setLoadingDorms(false); }
        };
        fetchDorms();
    }, [schoolCode, DORMITORIES_API]);

    // Fetch rooms when dormitory changes
    useEffect(() => {
        if (!selectedDormitory) {
            setRooms([]);
            setSelectedRoom(undefined);
            return;
        }
        const fetchRooms = async () => {
            setLoadingRooms(true);
            try {
                const res = await fetch(`${ROOMS_API_BASE}?dormitoryId=${selectedDormitory}`);
                if (!res.ok) throw new Error('Failed to fetch rooms');
                setRooms(await res.json());
            } catch (err: any) { message.error(err.message); }
            finally { setLoadingRooms(false); }
        };
        fetchRooms();
    }, [selectedDormitory, ROOMS_API_BASE]);

    // Fetch unallocated students
    const fetchUnallocatedStudents = useCallback(async () => {
        setLoadingStudents(true);
        try {
            const res = await fetch(UNALLOCATED_STUDENTS_API);
            if (!res.ok) throw new Error('Failed to fetch unallocated students');
            const data: (IStudent & { userId: ITenantUser; currentClassId?: IClass })[] = await res.json();
            setUnallocatedStudents(data.map(s => ({
                key: s.userId._id.toString(),
                title: `${s.userId.firstName} ${s.userId.lastName} (${s.userId.username})`,
                description: `Class: ${s.currentClassId?.name || 'N/A'}`,
            })));
        } catch (err: any) { message.error(err.message); }
        finally { setLoadingStudents(false); }
    }, [UNALLOCATED_STUDENTS_API]);

    useEffect(() => {
        fetchUnallocatedStudents();
    }, [fetchUnallocatedStudents]);
    
    // Set target keys when a room is selected
    useEffect(() => {
        if (selectedRoom) {
            setTargetKeys(selectedRoom.occupants.map(user => user._id.toString()));
        } else {
            setTargetKeys([]);
        }
    }, [selectedRoom]);

    const combinedStudentDataSource = useMemo(() => {
        // Map current room occupants (which are populated User objects) to StudentOption format
        const roomOccupantsAsOptions: StudentOption[] = (selectedRoom?.occupants || []).map((occupant: ITenantUser) => ({
            key: occupant._id.toString(),
            title: `${occupant.firstName} ${occupant.lastName} (${occupant.username})`,
            description: `Currently in Room ${selectedRoom?.roomNumber || ''}`,
        }));

        // Create a Map of all unique students by their user ID (key)
        const allStudentsMap = new Map<string, StudentOption>();
        unallocatedStudents.forEach(s => allStudentsMap.set(s.key, s));
        roomOccupantsAsOptions.forEach(o => {
            if (!allStudentsMap.has(o.key)) {
                allStudentsMap.set(o.key, o);
            }
        });
        
        return Array.from(allStudentsMap.values());
    }, [unallocatedStudents, selectedRoom]);


    const handleChange = (newTargetKeys: string[], direction: TransferDirection, moveKeys: string[]) => {
        if (selectedRoom) {
            const newCount = newTargetKeys.length;
            if (newCount > selectedRoom.capacity) {
                message.warning(`Cannot exceed room capacity of ${selectedRoom.capacity}. Please uncheck some students.`);
                const validKeys = newTargetKeys.slice(0, selectedRoom.capacity);
                setTargetKeys(validKeys);
                return;
            }
        }
        setTargetKeys(newTargetKeys);
    };

    const handleSaveChanges = async () => {
        if (!selectedRoom) {
            message.error("Please select a room first.");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`${ROOMS_API_BASE}/${selectedRoom._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ occupants: targetKeys })
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to save changes');
            message.success('Room allocation saved successfully!');
            // Refetch data to get updated state
            fetchUnallocatedStudents();
            if (selectedDormitory) {
                 const roomsRes = await fetch(`${ROOMS_API_BASE}?dormitoryId=${selectedDormitory}`);
                 const updatedRooms: IRoom[] = await roomsRes.json();
                 setRooms(updatedRooms as (IRoom & { occupants: ITenantUser[] })[]);
                 const updatedSelectedRoom = updatedRooms.find(r => r._id === selectedRoom._id);
                 setSelectedRoom(updatedSelectedRoom as (IRoom & { occupants: ITenantUser[] }));
            }
        } catch(err: any) {
            message.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <Title level={2}><SwapOutlined className="mr-2"/>Student Room Allocation</Title>
            <Paragraph>Select a dormitory and a room, then transfer students between the "Unallocated" and "Room Occupants" lists. The room's capacity will be enforced.</Paragraph>
            <Card className="mb-6">
                <Row gutter={16}>
                    <Col xs={24} md={12}>
                        <AntSpace direction="vertical" style={{ width: '100%' }}>
                            <Text>1. Select Dormitory</Text>
                            <Select
                                style={{ width: '100%' }}
                                placeholder="Select a dormitory"
                                loading={loadingDorms}
                                value={selectedDormitory}
                                onChange={val => { setSelectedDormitory(val); setSelectedRoom(undefined); }}
                                suffixIcon={<HomeOutlined />}
                            >
                                {dormitories.map(d => <Option key={d._id.toString()} value={d._id.toString()}>{d.name}</Option>)}
                            </Select>
                        </AntSpace>
                    </Col>
                    <Col xs={24} md={12}>
                        <AntSpace direction="vertical" style={{ width: '100%' }}>
                            <Text>2. Select Room</Text>
                            <Select
                                style={{ width: '100%' }}
                                placeholder="Select a room"
                                loading={loadingRooms}
                                value={selectedRoom?._id.toString()}
                                onChange={val => setSelectedRoom(rooms.find(r => r._id.toString() === val))}
                                disabled={!selectedDormitory}
                                suffixIcon={<AppstoreOutlined />}
                            >
                                {rooms.map(r => <Option key={r._id.toString()} value={r._id.toString()}>{`${r.roomNumber} (Occupants: ${r.occupants.length}/${r.capacity})`}</Option>)}
                            </Select>
                        </AntSpace>
                    </Col>
                </Row>
            </Card>

            <Spin spinning={loadingStudents || saving}>
                {selectedRoom ? (
                    <Card>
                        <Alert 
                            message={`Allocating for Room: ${selectedRoom.roomNumber} in ${dormitories.find(d => d._id.toString() === selectedDormitory)?.name}`}
                            description={`Capacity: ${selectedRoom.capacity} | Current Occupants: ${targetKeys.length}`}
                            type="info"
                            showIcon
                            className="mb-4"
                        />
                        <Transfer
                            dataSource={combinedStudentDataSource}
                            targetKeys={targetKeys}
                            onChange={handleChange}
                            render={item => item.title}
                            listStyle={{ width: '100%', height: 400 }}
                            titles={['Unallocated Students', 'Room Occupants']}
                            showSearch
                            filterOption={(inputValue, option) => option.title.toLowerCase().indexOf(inputValue.toLowerCase()) > -1}
                        />
                         <AntSpace className="mt-4">
                            <Button type="primary" onClick={handleSaveChanges} loading={saving}>Save Changes</Button>
                        </AntSpace>
                    </Card>
                ) : (
                    <Empty description="Please select a dormitory and a room to begin allocation." />
                )}
            </Spin>
        </div>
    );
}
