import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Get configuration values
  const port = configService.get('port');
  const corsConfig = configService.get('cors');
  const appConfig = configService.get('app');

  // Enable CORS with configuration
  app.enableCors({
    origin: corsConfig.origin,
    credentials: corsConfig.credentials,
    methods: corsConfig.methods,
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
    `🚀 ${appConfig.name} v${appConfig.version} is running on: http://localhost:${port}`,
  );
  console.log(`🌍 Environment: ${appConfig.environment}`);
  console.log(`🔧 Debug mode: ${appConfig.debug ? 'enabled' : 'disabled'}`);
}
bootstrap();
