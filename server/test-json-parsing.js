// Test the JSON parsing fix
const testResponse = `ACTION: book_appointment
PARAMETERS: {
  "therapist_id": "68b96133abdf06eea36ada2f",
  "date": "2023-09-12T09:00:00"
}`;

console.log('🧪 Testing JSON parsing fix...\n');

// Simulate the parsing logic
const actionMatch = testResponse.match(/ACTION:\s*(.+)/i);
const parametersMatch = testResponse.match(/PARAMETERS:\s*([\s\S]+?)(?=\n\n|\n[A-Z]|$)/i);

console.log('Action match:', actionMatch ? actionMatch[1] : 'null');
console.log('Parameters match:', parametersMatch ? parametersMatch[1] : 'null');

if (actionMatch && parametersMatch) {
  try {
    const action = actionMatch[1].trim();
    let parametersString = parametersMatch[1].trim();
    
    // Clean up the parameters string - remove newlines and fix formatting
    parametersString = parametersString
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // If it's not wrapped in braces, wrap it
    if (!parametersString.startsWith('{')) {
      parametersString = `{${parametersString}}`;
    }
    
    console.log('Cleaned parameters string:', parametersString);
    const parameters = JSON.parse(parametersString);
    console.log('✅ Parsed successfully:', { action, parameters });
  } catch (error) {
    console.error('❌ Parsing failed:', error.message);
  }
}

console.log('\n🎉 JSON parsing fix test completed!');
