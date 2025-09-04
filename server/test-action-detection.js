const axios = require('axios');

const NESTJS_BASE_URL = 'http://localhost:3001';
const TEST_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NzVhYjQ5YzQ5YzQ5YzQ5YzQ5YzQ5YzQiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJpYXQiOjE3MzQ5NzI4MDAsImV4cCI6MTczNDk3NjQwMH0.test-signature';

async function testActionDetection() {
  console.log('🧪 Testing Action Detection in RAG...\n');

  try {
    // Test 1: List therapists (should trigger action)
    console.log('1️⃣ Testing: "Show me available therapists"');
    const response = await axios.post(`${NESTJS_BASE_URL}/chat`, {
      message: 'Show me available therapists'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_JWT_TOKEN}`,
      },
    });

    console.log('✅ Response received:');
    console.log('   Answer:', response.data.answer?.substring(0, 100) + '...');
    console.log('   Action:', response.data.action);
    console.log('   Parameters:', response.data.parameters);
    console.log('   ActionResult:', response.data.actionResult ? 'Present' : 'null');
    console.log('   RawData:', response.data.rawData ? 'Present' : 'null');
    console.log('');

    if (response.data.action) {
      console.log('🎉 SUCCESS: Action was detected and executed!');
      console.log('   Action:', response.data.action);
      console.log('   Parameters:', JSON.stringify(response.data.parameters, null, 2));
      
      if (response.data.rawData) {
        console.log('   Raw Data (JSON):', JSON.stringify(response.data.rawData, null, 2));
      }
    } else {
      console.log('❌ ISSUE: No action was detected');
      console.log('   The LLM should have returned ACTION: list_therapists');
    }

    // Test 2: Book appointment using cached data
    if (response.data.rawData && response.data.rawData.length > 0) {
      console.log('\n2️⃣ Testing: "I want to book appointment with Dr. Smith"');
      const bookResponse = await axios.post(`${NESTJS_BASE_URL}/chat`, {
        message: 'I want to book appointment with Dr. Smith for tomorrow at 2 PM'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_JWT_TOKEN}`,
        },
      });

      console.log('✅ Booking response:');
      console.log('   Action:', bookResponse.data.action);
      console.log('   Parameters:', JSON.stringify(bookResponse.data.parameters, null, 2));
      console.log('   Used cached therapist ID:', bookResponse.data.parameters?.therapistId ? 'Yes' : 'No');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.log('\n💡 Make sure:');
    console.log('1. NestJS server is running on port 3001');
    console.log('2. OpenAI API key is configured');
    console.log('3. JWT token is valid');
  }
}

// Run the test
testActionDetection();
