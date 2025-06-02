
import mongoose, { Connection, Mongoose, Model } from 'mongoose';
import SchoolModel, { ISchool } from '@/models/SuperAdmin/School';
import SuperAdminUserModel, { ISuperAdminUser } from '@/models/SuperAdmin/SuperAdminUser';

const SUPERADMIN_MONGO_URI = process.env.SUPERADMIN_MONGO_URI;

if (!SUPERADMIN_MONGO_URI) {
  throw new Error(
    'Please define the SUPERADMIN_MONGO_URI environment variable inside .env.local'
  );
}

interface MongooseGlobal extends NodeJS.Global {
  mongooseSuperAdmin?: { conn: Mongoose | null; promise: Promise<Mongoose> | null };
  mongooseTenants?: Map<string, { conn: Mongoose | null; promise: Promise<Mongoose> | null }>;
}

declare const global: MongooseGlobal;


let cachedSuperAdmin = global.mongooseSuperAdmin;

if (!cachedSuperAdmin) {
  cachedSuperAdmin = global.mongooseSuperAdmin = { conn: null, promise: null };
}

async function connectToSuperAdminDB(): Promise<Mongoose> {
  if (cachedSuperAdmin!.conn) {
    return cachedSuperAdmin!.conn;
  }

  if (!cachedSuperAdmin!.promise) {
    const opts = {
      bufferCommands: false,
    };
    cachedSuperAdmin!.promise = mongoose.connect(SUPERADMIN_MONGO_URI!, opts).then((mongooseInstance) => {
      if (!mongooseInstance.models.School) {
        mongooseInstance.model<ISchool>('School', SchoolModel.schema);
      }
      if (!mongooseInstance.models.SuperAdminUser) {
        mongooseInstance.model<ISuperAdminUser>('SuperAdminUser', SuperAdminUserModel.schema);
      }
      return mongooseInstance;
    });
  }
  try {
    cachedSuperAdmin!.conn = await cachedSuperAdmin!.promise;
    return cachedSuperAdmin!.conn!; 
  } catch (error) {
    cachedSuperAdmin!.promise = null; 
    console.error("[DB connectToSuperAdminDB] Failed to connect to SuperAdmin DB:", error);
    throw error; 
  }
}


if (!global.mongooseTenants) {
  global.mongooseTenants = new Map<string, { conn: Mongoose | null; promise: Promise<Mongoose> | null }>();
}


export async function getTenantConnection(schoolCode: string): Promise<Connection> {
  if (!schoolCode || typeof schoolCode !== 'string' || schoolCode.trim() === '') {
    throw new Error('School code is required and must be a non-empty string to get tenant connection.');
  }
  const normalizedSchoolCode = schoolCode.trim().toLowerCase();

  const tenantConnectionsMap = global.mongooseTenants!;
  
  if (tenantConnectionsMap.has(normalizedSchoolCode)) {
    const cachedTenant = tenantConnectionsMap.get(normalizedSchoolCode)!;
    if (cachedTenant.conn) {
      // @ts-ignore Assuming conn holds a Mongoose-like object with a 'connection' property
      return cachedTenant.conn.connection;
    }
    if (cachedTenant.promise) {
      try {
        const mongooseInstance = await cachedTenant.promise;
        // @ts-ignore
        return mongooseInstance.connection;
      } catch (error) {
        tenantConnectionsMap.delete(normalizedSchoolCode);
        console.error(`[DB getTenantConnection] Cached promise for ${normalizedSchoolCode} failed. Retrying connection. Error:`, error);
      }
    }
  }

  try {
    await connectToSuperAdminDB(); 
    
    const School = mongoose.models.School as Model<ISchool> || mongoose.model<ISchool>('School', SchoolModel.schema);
    const school = await School.findOne({ schoolCode: normalizedSchoolCode }).lean<ISchool>().exec();

    if (!school || !school.mongodbUri) {
      console.error(`[DB getTenantConnection] School not found or MongoDB URI not configured for ${normalizedSchoolCode}`);
      throw new Error(`School not found or MongoDB URI not configured for ${normalizedSchoolCode}`);
    }

    const tenantEntry = { conn: null, promise: null } as { conn: Mongoose | null; promise: Promise<Mongoose> | null };
    tenantConnectionsMap.set(normalizedSchoolCode, tenantEntry);
    
    const opts = {
      bufferCommands: false,
    };

    const newMongooseInstance = new Mongoose();
    tenantEntry.promise = newMongooseInstance.connect(school.mongodbUri, opts).then(() => newMongooseInstance);
    
    const connectedMongooseInstance = await tenantEntry.promise;
    tenantEntry.conn = connectedMongooseInstance;
    return connectedMongooseInstance.connection;

  } catch (error: any) {
    console.error(`[DB getTenantConnection] Error establishing connection for ${normalizedSchoolCode}:`, error.message);
    if (tenantConnectionsMap.has(normalizedSchoolCode)) {
        const entry = tenantConnectionsMap.get(normalizedSchoolCode);
        if (entry?.promise && !entry.conn) { 
            tenantConnectionsMap.delete(normalizedSchoolCode);
        }
    }
    throw error; 
  }
}


export { connectToSuperAdminDB };

export const getSuperAdminModel = <T extends mongoose.Document>(modelName: string): mongoose.Model<T> => {
  if (!cachedSuperAdmin?.conn) {
    console.warn("[DB getSuperAdminModel] SuperAdmin DB not connected. Attempting to connect implicitly. This should ideally be handled by prior explicit connection call.");
    throw new Error("SuperAdmin DB not connected. Call connectToSuperAdminDB first or ensure application initialization handles this.");
  }
  return cachedSuperAdmin.conn.models[modelName] as mongoose.Model<T>;
};

