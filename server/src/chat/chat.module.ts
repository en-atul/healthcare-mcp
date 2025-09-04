import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { McpModule } from '../mcp/mcp.module';
import { LlmModule } from '../llm/llm.module';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [McpModule, LlmModule, RagModule],
  controllers: [ChatController],
})
export class ChatModule {}
