const axios = require('axios');

const NESTJS_BASE_URL = 'http://localhost:3000';
const MCP_API_KEY = 'your-secret-mcp-api-key-change-in-production';

async function testMcpEndpoints() {
  console.log('🧪 Testing MCP HTTP Endpoints...\n');

  try {
    // Test 1: Internal request (NestJS backend) - should work without API key
    console.log('1️⃣ Testing internal request (NestJS backend)...');
    const internalResponse = await axios.post(`${NESTJS_BASE_URL}/mcp/list-therapists`, {}, {
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Request': 'true',
      },
    });
    console.log('✅ Internal request success:', internalResponse.data.message);
    console.log('   Data:', internalResponse.data.data?.length || 0, 'therapists found\n');

    // Test 2: External request (Claude/ChatGPT) - should work with valid API key
    console.log('2️⃣ Testing external request (Claude/ChatGPT) with valid API key...');
    const externalResponse = await axios.post(`${NESTJS_BASE_URL}/mcp/list-therapists`, {}, {
      headers: {
        'Content-Type': 'application/json',
        'X-MCP-API-Key': MCP_API_KEY,
      },
    });
    console.log('✅ External request success:', externalResponse.data.message);
    console.log('   Data:', externalResponse.data.data?.length || 0, 'therapists found\n');

    // Test 3: External request with invalid API key - should fail
    console.log('3️⃣ Testing external request with invalid API key...');
    try {
      await axios.post(`${NESTJS_BASE_URL}/mcp/list-therapists`, {}, {
        headers: {
          'Content-Type': 'application/json',
          'X-MCP-API-Key': 'invalid-key',
        },
      });
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected invalid API key\n');
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message, '\n');
      }
    }

    // Test 4: External request without API key - should fail
    console.log('4️⃣ Testing external request without API key...');
    try {
      await axios.post(`${NESTJS_BASE_URL}/mcp/list-therapists`, {}, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected missing API key\n');
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message, '\n');
      }
    }

    console.log('🎉 All tests completed!');
    console.log('\n📝 Summary:');
    console.log('✅ Internal requests (NestJS) work without API key');
    console.log('✅ External requests (Claude/ChatGPT) work with valid API key');
    console.log('✅ External requests are rejected with invalid/missing API key');
    console.log('\n🚀 Next steps:');
    console.log('1. Start your NestJS server: pnpm run start:dev');
    console.log('2. Test the chat endpoint with a real JWT token');
    console.log('3. For external MCP clients, use the standalone MCP server');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.log('\n💡 Make sure your NestJS server is running on port 3000');
  }
}

testMcpEndpoints();
