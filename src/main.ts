import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..', '..', 'storage', 'hls'), {
    prefix: '/hls',
  });
  app.useStaticAssets(join(__dirname, '..', '..', 'node_modules', 'hls.js', 'dist'), {
    prefix: '/hls.js',
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
