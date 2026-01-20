import { Test, TestingModule } from '@nestjs/testing';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';

describe('WeatherController', () => {
  let controller: WeatherController;
  let service: WeatherService;

  const mockWeatherService = {
    getWeather: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WeatherController],
      providers: [
        {
          provide: WeatherService,
          useValue: mockWeatherService,
        },
      ],
    }).compile();

    controller = module.get<WeatherController>(WeatherController);
    service = module.get<WeatherService>(WeatherService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getWeather', () => {
    it('should return weather data', async () => {
      const mockWeatherData = {
        temp: 20.5,
        feels_like: 19.8,
        humidity: 65,
        description: 'clear sky',
      };

      mockWeatherService.getWeather.mockResolvedValue(mockWeatherData);

      const result = await controller.getWeather({ city: 'Madrid' });

      expect(result).toEqual(mockWeatherData);
      expect(service.getWeather).toHaveBeenCalledWith('Madrid');
    });
  });
});
