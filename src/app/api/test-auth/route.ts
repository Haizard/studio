import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('=== TEST AUTH ENDPOINT CALLED ===');
    
    const body = await request.json();
    console.log('Request body:', body);
    
    // Test 1: Basic imports
    console.log('Testing imports...');
    const { connectToSuperAdminDB } = await import('@/lib/db');
    console.log('✅ DB import successful');
    
    const SuperAdminUserModel = await import('@/models/SuperAdmin/SuperAdminUser');
    console.log('✅ Model import successful');
    
    // Test 2: Database connection
    console.log('Testing database connection...');
    const dbInstance = await connectToSuperAdminDB();
    console.log('✅ Database connection successful');
    
    // Test 3: Model access
    console.log('Testing model access...');
    const SuperAdminUserOnDB = dbInstance.models.SuperAdminUser || dbInstance.model('SuperAdminUser', SuperAdminUserModel.default.schema);
    console.log('✅ Model access successful');
    
    // Test 4: Simple query
    console.log('Testing simple query...');
    const userCount = await SuperAdminUserOnDB.countDocuments();
    console.log('✅ Query successful, user count:', userCount);
    
    return NextResponse.json({ 
      success: true, 
      message: 'All tests passed',
      userCount,
      receivedData: body 
    });
  } catch (error) {
    console.error('❌ Test auth error:', error);
    console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { 
        error: 'Test endpoint failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack'
      },
      { status: 500 }
    );
  }
}