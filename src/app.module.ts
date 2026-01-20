import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WeatherModule } from './weather/weather.module';

@Module({
  imports: [
    // ConfigModule para manejar variables de entorno desde .env
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // CacheModule con configuración de 10 minutos (600000 ms)
    CacheModule.register({
      isGlobal: true,
      ttl: 600000, // 10 minutos en milisegundos
      max: 100, // máximo de items en caché
    }),
    // HttpModule (Axios) para hacer peticiones HTTP
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    // WeatherModule para el recurso weather
    WeatherModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
