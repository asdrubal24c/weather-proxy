import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';

@Module({
  imports: [
    // HttpModule ya está disponible globalmente, pero se puede importar explícitamente si se necesita configuración específica
    HttpModule,
    // CacheModule ya está disponible globalmente
    CacheModule,
  ],
  controllers: [WeatherController],
  providers: [WeatherService],
  exports: [WeatherService], // Exportar el servicio por si se necesita en otros módulos
})
export class WeatherModule {}
