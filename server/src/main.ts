import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from './config/config.service';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  const configService = app.get(ConfigService);

  // Get configuration values using typed getters
  const port = configService.port;
  const corsOrigin = configService.corsOrigin;
  const corsCredentials = configService.corsCredentials;
  const corsMethods = configService.corsMethods;
  const appName = configService.appName;
  const appVersion = configService.appVersion;
  const appEnvironment = configService.appEnvironment;
  const appDebug = configService.appDebug;

  // Enable CORS with configuration
  app.enableCors({
    origin: corsOrigin,
    credentials: corsCredentials,
    methods: corsMethods,
  });

  // Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(port);
  console.log(
    `🚀 ${appName} v${appVersion} is running on: http://localhost:${port}`,
  );
  console.log(`🌍 Environment: ${appEnvironment}`);
  console.log(`🔧 Debug mode: ${appDebug ? 'enabled' : 'disabled'}`);
}
bootstrap();
