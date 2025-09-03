import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { McpServerService } from '../mcp/mcp-server.service';

async function testMcpServer() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const mcpService = app.get(McpServerService);

  try {
    console.log('Testing MCP Server...');
    console.log('MCP Server should be running and ready to accept connections');
    console.log('You can now connect MCP clients to interact with the healthcare system');
    
    // Keep the app running to test MCP connections
    console.log('Press Ctrl+C to stop the MCP server');
    
    // Wait indefinitely
    await new Promise(() => {});
  } catch (error) {
    console.error('Error testing MCP server:', error);
  } finally {
    await app.close();
  }
}

testMcpServer();
