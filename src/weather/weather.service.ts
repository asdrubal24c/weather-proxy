import {
  Injectable,
  Inject,
  NotFoundException,
  BadGatewayException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';

export interface WeatherResponse {
  temp: number;
  feels_like: number;
  humidity: number;
  description: string;
}

@Injectable()
export class WeatherService {
  private readonly openWeatherApiUrl = 'https://api.openweathermap.org/data/2.5/weather';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getWeather(city: string): Promise<WeatherResponse> {
    const cacheKey = `weather:${city.toLowerCase()}`;

    // Verificar si existe en caché
    const cachedData = await this.cacheManager.get<WeatherResponse>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Si no está en caché, llamar a la API
    const apiKey = this.configService.get<string>('OPENWEATHER_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'OPENWEATHER_API_KEY no está configurada en las variables de entorno',
      );
    }

    try {
      const url = `${this.openWeatherApiUrl}?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
      const response = await firstValueFrom(this.httpService.get(url));

      // Filtrar y formatear la respuesta
      const weatherData: WeatherResponse = {
        temp: response.data.main.temp,
        feels_like: response.data.main.feels_like,
        humidity: response.data.main.humidity,
        description: response.data.weather[0].description,
      };

      // Guardar en caché con TTL de 10 minutos (600000 ms)
      await this.cacheManager.set(cacheKey, weatherData, 600000);

      return weatherData;
    } catch (error) {
      // Manejar diferentes tipos de errores
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || 'Error al obtener datos del clima';

        switch (status) {
          case 401:
            throw new UnauthorizedException(
              'API Key inválida. Verifica tu OPENWEATHER_API_KEY en el archivo .env',
            );
          case 404:
            throw new NotFoundException(
              `Ciudad "${city}" no encontrada. Verifica el nombre de la ciudad.`,
            );
          case 429:
            throw new BadGatewayException(
              'Límite de solicitudes excedido. Intenta más tarde.',
            );
          default:
            throw new BadGatewayException(
              `Error al consultar OpenWeather API: ${message}`,
            );
        }
      }

      // Errores de red u otros errores
      throw new BadGatewayException(
        'Error de conexión con el servicio de clima. Intenta más tarde.',
      );
    }
  }
}
