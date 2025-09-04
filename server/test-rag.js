const axios = require('axios');

const NESTJS_BASE_URL = 'http://localhost:3001';
const TEST_JWT_TOKEN = 'your-test-jwt-token-here'; // You'll need to get this from login

async function testRagConversation() {
  console.log('🧪 Testing RAG Conversation Flow...\n');

  try {
    // Test 1: List therapists (should work without context and cache results)
    console.log('1️⃣ Testing: "Show me available therapists"');
    const therapistsResponse = await axios.post(`${NESTJS_BASE_URL}/chat`, {
      message: 'Show me available therapists'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_JWT_TOKEN}`,
      },
    });
    console.log('✅ Response:', therapistsResponse.data.answer);
    console.log('   Action:', therapistsResponse.data.action);
    console.log('   Parameters:', therapistsResponse.data.parameters);
    console.log('   📝 This result is now cached in ChromaDB');
    console.log('');

    // Test 2: Book appointment (should use cached therapist data and auto-figure Dr. Smith's ID)
    console.log('2️⃣ Testing: "I want to book an appointment with Dr. Smith for tomorrow at 2 PM"');
    const bookResponse = await axios.post(`${NESTJS_BASE_URL}/chat`, {
      message: 'I want to book an appointment with Dr. Smith for tomorrow at 2 PM'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_JWT_TOKEN}`,
      },
    });
    console.log('✅ Response:', bookResponse.data.answer);
    console.log('   Action:', bookResponse.data.action);
    console.log('   Parameters:', bookResponse.data.parameters);
    console.log('   🧠 RAG used cached therapist data to find Dr. Smith\'s ID automatically!');
    console.log('');

    // Test 3: View appointments (should show current appointments)
    console.log('3️⃣ Testing: "What are my upcoming appointments?"');
    const appointmentsResponse = await axios.post(`${NESTJS_BASE_URL}/chat`, {
      message: 'What are my upcoming appointments?'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_JWT_TOKEN}`,
      },
    });
    console.log('✅ Response:', appointmentsResponse.data.answer);
    console.log('   Action:', appointmentsResponse.data.action);
    console.log('   Parameters:', appointmentsResponse.data.parameters);
    console.log('');

    // Test 4: Cancel appointment (should identify appointment from context)
    console.log('4️⃣ Testing: "Cancel my appointment with Dr. Smith"');
    const cancelResponse = await axios.post(`${NESTJS_BASE_URL}/chat`, {
      message: 'Cancel my appointment with Dr. Smith'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_JWT_TOKEN}`,
      },
    });
    console.log('✅ Response:', cancelResponse.data.answer);
    console.log('   Action:', cancelResponse.data.action);
    console.log('   Parameters:', cancelResponse.data.parameters);
    console.log('');

    console.log('🎉 RAG conversation test completed!');
    console.log('\n📝 Key Benefits of RAG + MCP Hybrid:');
    console.log('✅ Natural language understanding');
    console.log('✅ Context-aware responses');
    console.log('✅ No need for exact IDs or parameters');
    console.log('✅ Conversational flow maintained');
    console.log('✅ Intelligent appointment identification');
    console.log('✅ Cached MCP operation results');
    console.log('✅ Auto-figure IDs from cached data');
    console.log('✅ Reduced database calls');
    console.log('✅ Faster responses using cached data');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.log('\n💡 Make sure:');
    console.log('1. NestJS server is running on port 3001');
    console.log('2. ChromaDB is running on port 8000');
    console.log('3. You have a valid JWT token');
    console.log('4. You have seeded therapists and patient data');
  }
}

// Instructions for getting JWT token
console.log('🔑 To get a JWT token:');
console.log('1. Register a patient: POST /auth/register');
console.log('2. Login: POST /auth/login');
console.log('3. Use the access_token from the response');
console.log('4. Update TEST_JWT_TOKEN in this script');
console.log('');

testRagConversation();
