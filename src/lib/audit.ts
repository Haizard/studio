
import { getTenantConnection } from './db';
import AuditLogModel, { IAuditLog, AuditAction } from '@/models/Tenant/AuditLog';
import type { ITenantUser } from '@/models/Tenant/User';
import mongoose from 'mongoose';
import type { NextRequest } from 'next/server';

interface AuditLogData {
    userId?: mongoose.Types.ObjectId | string;
    username?: string;
    action: AuditAction;
    entity: string;
    entityId?: mongoose.Types.ObjectId | string;
    details?: string;
    originalValues?: object;
    newValues?: object;
    req?: NextRequest; // Pass the request object to get IP and user agent
}

async function ensureModelsRegistered(tenantDb: mongoose.Connection) {
    if (!tenantDb.models.AuditLog) {
      tenantDb.model<IAuditLog>('AuditLog', AuditLogModel.schema);
    }
}

export async function logAudit(schoolCode: string, data: AuditLogData) {
    try {
        const tenantDb = await getTenantConnection(schoolCode);
        await ensureModelsRegistered(tenantDb);
        const AuditLog = tenantDb.models.AuditLog as mongoose.Model<IAuditLog>;

        const ipAddress = data.req?.ip || data.req?.headers.get('x-forwarded-for');
        const userAgent = data.req?.headers.get('user-agent');
        
        const logEntry = new AuditLog({
            ...data,
            schoolCode: schoolCode,
            timestamp: new Date(),
            ipAddress,
            userAgent,
        });

        await logEntry.save();
    } catch (error) {
        console.error(`[AUDIT LOG FAILED] for school ${schoolCode}:`, error);
        // We don't throw an error here because audit logging should not break the main functionality.
    }
}

export function safeObject(obj: any) {
    if (!obj) return undefined;
    const newObj = { ...obj };
    delete newObj.passwordHash;
    delete newObj._id;
    delete newObj.__v;
    delete newObj.createdAt;
    delete newObj.updatedAt;
    return newObj;
}
