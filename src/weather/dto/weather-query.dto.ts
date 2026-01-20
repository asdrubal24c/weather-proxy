import { IsString, IsNotEmpty } from 'class-validator';

export class WeatherQueryDto {
  @IsString({ message: 'El parámetro city debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El parámetro city es obligatorio' })
  city: string;
}
