import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { WeatherService } from './weather.service';
import { NotFoundException, UnauthorizedException, BadGatewayException } from '@nestjs/common';
import { firstValueFrom, of, throwError } from 'rxjs';

describe('WeatherService', () => {
  let service: WeatherService;
  let httpService: HttpService;
  let configService: ConfigService;
  let cacheManager: any;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockHttpService = {
    get: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeatherService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<WeatherService>(WeatherService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
    cacheManager = module.get(CACHE_MANAGER);

    // Reset mocks
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue('test-api-key');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getWeather', () => {
    const mockWeatherData = {
      temp: 20.5,
      feels_like: 19.8,
      humidity: 65,
      description: 'clear sky',
    };

    const mockApiResponse = {
      data: {
        main: {
          temp: 20.5,
          feels_like: 19.8,
          humidity: 65,
        },
        weather: [
          {
            description: 'clear sky',
          },
        ],
      },
    };

    it('should return cached data if available', async () => {
      mockCacheManager.get.mockResolvedValue(mockWeatherData);

      const result = await service.getWeather('Madrid');

      expect(result).toEqual(mockWeatherData);
      expect(mockCacheManager.get).toHaveBeenCalledWith('weather:madrid');
      expect(mockHttpService.get).not.toHaveBeenCalled();
    });

    it('should fetch from API and cache result if not in cache', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockHttpService.get.mockReturnValue(of(mockApiResponse));
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.getWeather('Madrid');

      expect(result).toEqual(mockWeatherData);
      expect(mockHttpService.get).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'weather:madrid',
        mockWeatherData,
        600000,
      );
    });

    it('should throw NotFoundException when city is not found (404)', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      const error = {
        response: {
          status: 404,
          data: { message: 'city not found' },
        },
      };
      mockHttpService.get.mockReturnValue(throwError(() => error));

      await expect(service.getWeather('InvalidCity')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw UnauthorizedException when API key is invalid (401)', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      const error = {
        response: {
          status: 401,
          data: { message: 'Invalid API key' },
        },
      };
      mockHttpService.get.mockReturnValue(throwError(() => error));

      await expect(service.getWeather('Madrid')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw BadGatewayException on network errors', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      const error = {
        message: 'Network Error',
      };
      mockHttpService.get.mockReturnValue(throwError(() => error));

      await expect(service.getWeather('Madrid')).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('should throw error when OPENWEATHER_API_KEY is not configured', async () => {
      mockConfigService.get.mockReturnValue(null);

      await expect(service.getWeather('Madrid')).rejects.toThrow(
        'OPENWEATHER_API_KEY no está configurada',
      );
    });
  });
});
