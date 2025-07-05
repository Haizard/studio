import { getTenantConnection } from '@/lib/db';
import NotificationModel, { INotification, NotificationType } from '@/models/Tenant/Notification';
import StudentModel, { IStudent } from '@/models/Tenant/Student';
import AcademicYearModel, { IAcademicYear } from '@/models/Tenant/AcademicYear';
import ClassModel, { IClass } from '@/models/Tenant/Class';
import { ITenantUser, TenantUserSchemaDefinition } from '@/models/Tenant/User';
import mongoose from 'mongoose';

async function ensureModels(tenantDb: mongoose.Connection) {
  // A simple way to ensure all necessary models are registered on the connection
  if (!tenantDb.models.Notification) tenantDb.model<INotification>('Notification', NotificationModel.schema);
  if (!tenantDb.models.Student) tenantDb.model<IStudent>('Student', StudentModel.schema);
  if (!tenantDb.models.AcademicYear) tenantDb.model<IAcademicYear>('AcademicYear', AcademicYearModel.schema);
  if (!tenantDb.models.Class) tenantDb.model<IClass>('Class', ClassModel.schema);
  if (!tenantDb.models.User) tenantDb.model<ITenantUser>('User', TenantUserSchemaDefinition);
}

interface NotificationPayload {
  title: string;
  message: string;
  link?: string;
  type?: NotificationType;
}

/**
 * Creates notifications for all active students in a specific academic year.
 * If classLevel is provided, it filters students to that level.
 * If classLevel is null/undefined, it sends to ALL active students in the year.
 * @param schoolCode The school's unique code.
 * @param academicYearId The ID of the relevant academic year.
 * @param classLevel Optional: The specific class level (e.g., "Form 1") to target.
 * @param payload The notification content.
 */
async function createNotifications(
  schoolCode: string,
  academicYearId: mongoose.Types.ObjectId,
  classLevel: string | null | undefined,
  payload: NotificationPayload
) {
  const tenantDb = await getTenantConnection(schoolCode);
  await ensureModels(tenantDb);
  
  const Class = tenantDb.models.Class as mongoose.Model<IClass>;
  const Student = tenantDb.models.Student as mongoose.Model<IStudent>;
  const Notification = tenantDb.models.Notification as mongoose.Model<INotification>;

  let studentQuery: any = {
    currentAcademicYearId: academicYearId,
    isActive: true,
  };

  // If a class level is specified, find students in classes of that level
  if (classLevel) {
    const classes = await Class.find({ level: classLevel, academicYearId }).select('_id').lean();
    if (classes.length === 0) {
      console.log(`[NotificationService] No classes found for level "${classLevel}". No notifications sent.`);
      return;
    }
    const classIds = classes.map(c => c._id);
    studentQuery.currentClassId = { $in: classIds };
  }

  const students = await Student.find(studentQuery).select('userId').lean();
  if (students.length === 0) {
    console.log(`[NotificationService] No students found for the specified criteria. No notifications sent.`);
    return;
  }
  const studentUserIds = students.map(s => s.userId);

  const notificationsToCreate = studentUserIds.map(userId => ({
    userId,
    ...payload,
  }));

  if (notificationsToCreate.length > 0) {
    await Notification.insertMany(notificationsToCreate);
    console.log(`[NotificationService] Created ${notificationsToCreate.length} notifications.`);
  }
}

/**
 * A wrapper function that finds the active academic year first.
 * @param schoolCode 
 * @param classLevel 
 * @param payload 
 */
export async function createNotificationsForClassLevel(
  schoolCode: string,
  classLevel: string | null | undefined,
  payload: NotificationPayload
) {
    try {
        const tenantDb = await getTenantConnection(schoolCode);
        await ensureModels(tenantDb);
        const AcademicYear = tenantDb.models.AcademicYear as mongoose.Model<IAcademicYear>;

        const activeYear = await AcademicYear.findOne({ isActive: true }).lean();
        if (!activeYear) {
            console.warn(`[NotificationService] No active academic year found for ${schoolCode}. Cannot create notifications.`);
            return;
        }
        
        await createNotifications(schoolCode, activeYear._id, classLevel, payload);

    } catch (error) {
         console.error(`[NotificationService] Error creating notifications for class level "${classLevel}" in ${schoolCode}:`, error);
    }
}
