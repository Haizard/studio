
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
      // Register SuperAdmin models here if not already done through imports ensuring schema registration
      // This is to ensure models are available on the connection.
      // Mongoose generally handles this if models are imported and schema defined before connect.
      // However, explicit registration can be safer in complex setups.
      if (!mongooseInstance.models.School) {
        mongooseInstance.model<ISchool>('School', SchoolModel.schema);
      }
      if (!mongooseInstance.models.SuperAdminUser) {
        mongooseInstance.model<ISuperAdminUser>('SuperAdminUser', SuperAdminUserModel.schema);
      }
      return mongooseInstance;
    });
  }
  cachedSuperAdmin!.conn = await cachedSuperAdmin!.promise;
  return cachedSuperAdmin!.conn;
}


if (!global.mongooseTenants) {
  global.mongooseTenants = new Map<string, { conn: Mongoose | null; promise: Promise<Mongoose> | null }>();
}


export async function getTenantConnection(schoolCode: string): Promise<Connection> {
  if (!schoolCode) {
    throw new Error('School code is required to get tenant connection.');
  }

  const tenantConnectionsMap = global.mongooseTenants!;
  
  if (tenantConnectionsMap.has(schoolCode)) {
    const cachedTenant = tenantConnectionsMap.get(schoolCode)!;
    if (cachedTenant.conn) {
      return cachedTenant.conn.connection;
    }
    if (cachedTenant.promise) {
      const mongooseInstance = await cachedTenant.promise;
      return mongooseInstance.connection;
    }
  }

  await connectToSuperAdminDB(); // Ensure superadmin connection is up for fetching school details
  
  // Use the mongoose.models accessor to ensure we are using the model registered on the superadmin connection
  const School = mongoose.models.School as Model<ISchool> || mongoose.model<ISchool>('School', SchoolModel.schema);

  const school = await School.findOne({ schoolCode }).lean<ISchool>().exec();

  if (!school || !school.mongodbUri) {
    throw new Error(`School not found or MongoDB URI not configured for ${schoolCode}`);
  }

  const tenantEntry = { conn: null, promise: null } as { conn: Mongoose | null; promise: Promise<Mongoose> | null };
  tenantConnectionsMap.set(schoolCode, tenantEntry);
  
  const opts = {
    bufferCommands: false,
  };

  tenantEntry.promise = mongoose.createConnection(school.mongodbUri, opts).asPromise().then(connection => {
     // This is a Connection object, not a Mongoose instance.
     // For models, we'll need to register them directly onto this connection object.
     // Example: connection.model('User', TenantUserSchema);
     // This will be done in API routes or service layers.
    return { connection } as unknown as Mongoose; // A bit of a hack to fit the Mongoose type for caching.
  });
  
  const mongooseInstance = await tenantEntry.promise;
  // @ts-ignore
  tenantEntry.conn = mongooseInstance; // Store the "Mongoose-like" object which holds the connection
  // @ts-ignore
  return mongooseInstance.connection as Connection;
}


export { connectToSuperAdminDB };

// Utility to get models from SuperAdmin DB
export const getSuperAdminModel = <T extends mongoose.Document>(modelName: string): mongoose.Model<T> => {
  if (!cachedSuperAdmin?.conn) {
    throw new Error("SuperAdmin DB not connected. Call connectToSuperAdminDB first.");
  }
  return cachedSuperAdmin.conn.models[modelName] as mongoose.Model<T>;
};
