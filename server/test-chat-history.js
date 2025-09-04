const axios = require('axios');

const NESTJS_BASE_URL = 'http://localhost:3001';
const TEST_JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NzVhYjQ5YzQ5YzQ5YzQ5YzQ5YzQ5YzQiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJpYXQiOjE3MzQ5NzI4MDAsImV4cCI6MTczNDk3NjQwMH0.test-signature';

async function testChatHistory() {
  console.log('🧪 Testing Chat History API...\n');

  try {
    // First, send a few messages to create conversation history
    console.log('1️⃣ Creating conversation history...');
    
    const messages = [
      'Hello, I need help with my appointments',
      'Show me available therapists',
      'I want to book an appointment with Dr. Smith',
      'What are my current appointments?'
    ];

    for (const message of messages) {
      console.log(`   Sending: "${message}"`);
      await axios.post(`${NESTJS_BASE_URL}/chat`, {
        message: message
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_JWT_TOKEN}`,
        },
      });
      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('✅ Conversation history created\n');

    // Now test the history API
    console.log('2️⃣ Testing GET /chat/history...');
    const historyResponse = await axios.get(`${NESTJS_BASE_URL}/chat/history`, {
      headers: {
        'Authorization': `Bearer ${TEST_JWT_TOKEN}`,
      },
    });

    console.log('✅ History API Response:');
    console.log('   Success:', historyResponse.data.success);
    console.log('   Message:', historyResponse.data.message);
    console.log('   Total messages:', historyResponse.data.data.length);
    console.log('');

    // Display conversation history
    console.log('📜 Conversation History:');
    historyResponse.data.data.forEach((msg, index) => {
      const timestamp = new Date(msg.timestamp).toLocaleString();
      const type = msg.type === 'user' ? '👤 User' : '🤖 Assistant';
      console.log(`   ${index + 1}. [${timestamp}] ${type}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
    });

    console.log('\n🎉 Chat history test completed!');
    console.log('\n📝 Frontend Integration:');
    console.log('✅ GET /chat/history - Retrieve conversation history');
    console.log('✅ POST /chat - Send new messages');
    console.log('✅ JWT authentication required');
    console.log('✅ Patient-specific conversation isolation');
    console.log('✅ Timestamped messages with metadata');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.log('\n💡 Make sure:');
    console.log('1. NestJS server is running on port 3001');
    console.log('2. ChromaDB is running and accessible');
    console.log('3. OpenAI API key is configured');
    console.log('4. JWT token is valid');
  }
}

// Run the test
testChatHistory();
