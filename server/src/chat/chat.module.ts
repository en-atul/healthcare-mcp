import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { McpModule } from '../mcp/mcp.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [McpModule, LlmModule],
  controllers: [ChatController],
})
export class ChatModule {}
