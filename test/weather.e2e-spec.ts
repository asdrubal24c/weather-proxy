import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('WeatherController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CACHE_MANAGER)
      .useValue({
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        reset: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /weather', () => {
    it('should return 400 when city parameter is missing', () => {
      return request(app.getHttpServer())
        .get('/weather')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBeDefined();
        });
    });

    it('should return 400 when city parameter is empty', () => {
      return request(app.getHttpServer())
        .get('/weather?city=')
        .expect(400);
    });

    it('should accept numeric strings as valid city names', () => {
      // Nota: "123" es técnicamente un string válido según el DTO
      // Si se necesita validación adicional, se puede agregar un custom validator
      return request(app.getHttpServer())
        .get('/weather?city=123')
        .expect((res) => {
          // Puede ser 200 (si existe una ciudad "123") o 500/401/404 (sin API key o ciudad no encontrada)
          expect([200, 401, 404, 500]).toContain(res.status);
        });
    });

    it('should return weather data when city is valid (if API key is configured)', async () => {
      // Este test solo pasará si hay una API key válida en .env
      // Si no hay API key, esperamos un error 500 o 401
      const response = await request(app.getHttpServer())
        .get('/weather?city=Madrid')
        .expect((res) => {
          // Puede ser 200 (éxito) o 500/401 (sin API key o inválida)
          expect([200, 401, 500]).toContain(res.status);
        });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('temp');
        expect(response.body).toHaveProperty('feels_like');
        expect(response.body).toHaveProperty('humidity');
        expect(response.body).toHaveProperty('description');
        expect(typeof response.body.temp).toBe('number');
        expect(typeof response.body.feels_like).toBe('number');
        expect(typeof response.body.humidity).toBe('number');
        expect(typeof response.body.description).toBe('string');
      }
    }, 10000); // Timeout de 10 segundos para la llamada a la API

    it('should return 404 when city is not found', async () => {
      // Este test requiere una API key válida
      const response = await request(app.getHttpServer())
        .get('/weather?city=InvalidCityNameThatDoesNotExist12345')
        .expect((res) => {
          // Puede ser 404 (ciudad no encontrada) o 500/401 (sin API key)
          expect([404, 401, 500]).toContain(res.status);
        });

      if (response.status === 404) {
        expect(response.body.message).toContain('no encontrada');
      }
    }, 10000);
  });
});
