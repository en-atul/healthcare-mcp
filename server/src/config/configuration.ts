export default () => ({
  port: parseInt(process.env.PORT || '3000', 10) || 3000,
  database: {
    uri:
      process.env.MONGODB_URI ||
      'mongodb://mongoadmin:secret@localhost:27017/healthcare?authSource=admin',
    name: process.env.MONGODB_NAME || 'healthcare',
    user: process.env.MONGODB_USER || 'mongoadmin',
    password: process.env.MONGODB_PASSWORD || 'secret',
    host: process.env.MONGODB_HOST || 'localhost',
    port: parseInt(process.env.MONGODB_PORT || '27017', 10) || 27017,
  },
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '500', 10) || 500,
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.1') || 0.1,
  },
  mcp: {
    serverCommand: process.env.MCP_SERVER_COMMAND || 'ts-node',
    serverArgs: process.env.MCP_SERVER_ARGS
      ? process.env.MCP_SERVER_ARGS.split(' ')
      : ['src/mcp/mcp-server.ts'],
    serverPath: process.env.MCP_SERVER_PATH || 'src/mcp/mcp-server.ts',
    connectionTimeout:
      parseInt(process.env.MCP_CONNECTION_TIMEOUT || '10000', 10) || 10000,
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: process.env.CORS_METHODS
      ? process.env.CORS_METHODS.split(',')
      : ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10) || 10,
    rateLimitWindow:
      parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10) || 900000, // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10) || 100,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
    enableFile: process.env.LOG_ENABLE_FILE === 'true',
    logFilePath: process.env.LOG_FILE_PATH || './logs/app.log',
  },
  app: {
    name: process.env.APP_NAME || 'Healthcare MCP App',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    debug: process.env.DEBUG === 'true',
  },
});
