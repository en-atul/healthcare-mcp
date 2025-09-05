import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private readonly configService: NestConfigService) {}

  // Database configuration
  get databaseUrl(): string {
    return (
      this.configService.get<string>('database.uri') ||
      'mongodb://mongoadmin:secret@localhost:27017/healthcare?authSource=admin'
    );
  }

  get databaseName(): string {
    return this.configService.get<string>('database.name') || 'healthcare';
  }

  get databaseUser(): string {
    return this.configService.get<string>('database.user') || 'mongoadmin';
  }

  get databasePassword(): string {
    return this.configService.get<string>('database.password') || 'secret';
  }

  get databaseHost(): string {
    return this.configService.get<string>('database.host') || 'localhost';
  }

  get databasePort(): number {
    return this.configService.get<number>('database.port') || 27017;
  }

  // JWT configuration
  get jwtSecret(): string {
    return (
      this.configService.get<string>('jwt.secret') ||
      'your-super-secret-jwt-key-change-in-production'
    );
  }

  get jwtExpiresIn(): string {
    return this.configService.get<string>('jwt.expiresIn') || '7d';
  }

  get jwtRefreshSecret(): string {
    return (
      this.configService.get<string>('jwt.refreshSecret') ||
      'your-refresh-secret-key'
    );
  }

  get jwtRefreshExpiresIn(): string {
    return this.configService.get<string>('jwt.refreshExpiresIn') || '30d';
  }

  // OpenAI configuration
  get openaiApiKey(): string | undefined {
    return this.configService.get<string>('openai.apiKey');
  }

  get openaiModel(): string {
    return this.configService.get<string>('openai.model') || 'gpt-4o-mini';
  }

  get openaiMaxTokens(): number {
    return this.configService.get<number>('openai.maxTokens') || 500;
  }

  get openaiTemperature(): number {
    return this.configService.get<number>('openai.temperature') || 0.1;
  }

  // MCP configuration
  get mcpServerCommand(): string {
    return this.configService.get<string>('mcp.serverCommand') || 'ts-node';
  }

  get mcpServerArgs(): string[] {
    return (
      this.configService.get<string[]>('mcp.serverArgs') || [
        'src/mcp/mcp-server.ts',
      ]
    );
  }

  get mcpServerPath(): string {
    return (
      this.configService.get<string>('mcp.serverPath') ||
      'src/mcp/mcp-server.ts'
    );
  }

  get mcpConnectionTimeout(): number {
    return this.configService.get<number>('mcp.connectionTimeout') || 10000;
  }

  get mcpApiKey(): string {
    return (
      this.configService.get<string>('mcp.apiKey') ||
      'your-secret-mcp-api-key-change-in-production'
    );
  }

  get nestjsBaseUrl(): string {
    return (
      this.configService.get<string>('nestjs.baseUrl') ||
      'http://localhost:3001'
    );
  }

  // ChromaDB configuration
  get chromaUrl(): string {
    return (
      this.configService.get<string>('chroma.url') || 'http://localhost:8000'
    );
  }

  get chromaCollectionName(): string {
    return (
      this.configService.get<string>('chroma.collectionName') ||
      'healthcare_conversations'
    );
  }

  // CORS configuration
  get corsOrigin(): string | string[] {
    return this.configService.get<string | string[]>('cors.origin') || '*';
  }

  get corsCredentials(): boolean {
    return this.configService.get<boolean>('cors.credentials') || false;
  }

  get corsMethods(): string[] {
    return (
      this.configService.get<string[]>('cors.methods') || [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
      ]
    );
  }

  // Security configuration
  get bcryptRounds(): number {
    return this.configService.get<number>('security.bcryptRounds') || 10;
  }

  get rateLimitWindow(): number {
    return this.configService.get<number>('security.rateLimitWindow') || 900000; // 15 minutes
  }

  get rateLimitMax(): number {
    return this.configService.get<number>('security.rateLimitMax') || 100;
  }

  // Logging configuration
  get logLevel(): string {
    return this.configService.get<string>('logging.level') || 'info';
  }

  get logEnableConsole(): boolean {
    return this.configService.get<boolean>('logging.enableConsole') !== false;
  }

  get logEnableFile(): boolean {
    return this.configService.get<boolean>('logging.enableFile') || false;
  }

  get logFilePath(): string {
    return (
      this.configService.get<string>('logging.logFilePath') || './logs/app.log'
    );
  }

  // App configuration
  get appName(): string {
    return this.configService.get<string>('app.name') || 'Healthcare MCP App';
  }

  get appVersion(): string {
    return this.configService.get<string>('app.version') || '1.0.0';
  }

  get appEnvironment(): string {
    return this.configService.get<string>('app.environment') || 'development';
  }

  get appDebug(): boolean {
    return this.configService.get<boolean>('app.debug') || false;
  }

  // Port configuration
  get port(): number {
    return this.configService.get<number>('port') || 3001;
  }

  get chromaHost(): string {
    return this.configService.get<string>('chroma.host') || 'localhost';
  }
  get chromaPort(): number {
    return this.configService.get<number>('chroma.port') || 8001;
  }

  // Helper method to get nested config values
  get<T>(key: string): T | undefined {
    return this.configService.get<T>(key);
  }

  // Helper method to get nested config values with default
  getOrThrow<T>(key: string): T {
    const value = this.configService.get<T>(key);
    if (value === undefined) {
      throw new Error(`Configuration key "${key}" is required but not set`);
    }
    return value;
  }
}
