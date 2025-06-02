
import mongoose, { Schema, Document } from 'mongoose';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN_SUCCESS' | 'LOGIN_FAIL' | 'VIEW';

export interface IAuditLog extends Document {
  userId?: mongoose.Schema.Types.ObjectId; // User who performed the action (ref to TenantUser)
  username?: string; // Denormalized username for easier viewing
  action: AuditAction;
  entity: string; // e.g., "Student", "Class", "Exam", "Mark"
  entityId?: mongoose.Schema.Types.ObjectId | string; // ID of the affected entity
  details?: string; // e.g., "Updated student John Doe's class"
  originalValues?: object; // For UPDATE actions, store previous state (optional, can be large)
  newValues?: object; // For UPDATE/CREATE actions, store new state (optional)
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  schoolCode: string; // To associate with the specific school tenant
}

const AuditLogSchema: Schema = new Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: { type: String, trim: true },
    action: { 
      type: String, 
      enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN_SUCCESS', 'LOGIN_FAIL', 'VIEW'], 
      required: true 
    },
    entity: { type: String, required: true, trim: true },
    entityId: { type: Schema.Types.Mixed }, // Can be ObjectId or string
    details: { type: String, trim: true },
    originalValues: { type: Schema.Types.Mixed },
    newValues: { type: Schema.Types.Mixed },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    timestamp: { type: Date, default: Date.now, required: true },
    schoolCode: { type: String, required: true, trim: true }, // Should be indexed
  },
  { 
    timestamps: false, // We use a custom `timestamp` field
    collection: 'auditlogs' // Explicit collection name
  }
);

AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ userId: 1, action: 1 });
AuditLogSchema.index({ entity: 1, entityId: 1 });
AuditLogSchema.index({ schoolCode: 1, timestamp: -1 });

// Note: This model should be registered on the tenant's database connection.
export default mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
