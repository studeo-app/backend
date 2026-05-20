import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { initializeFirebase } from './config/firebase.config'

async function bootstrap() {
  // Inicializar Firebase antes de arrancar
  initializeFirebase()

  const app = await NestFactory.create(AppModule)

  // Prefijo global
  app.setGlobalPrefix('api')

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  })

  // Validación automática de DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }))

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Studeo API')
    .setDescription('API del salón de estudio colaborativo')
    .setVersion('1.0')
    .addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document)

  await app.listen(process.env.PORT ?? 3000)
  console.log(`Servidor: http://localhost:${process.env.PORT ?? 3000}`)
  console.log(`Swagger:  http://localhost:${process.env.PORT ?? 3000}/api/docs`)
}
bootstrap()