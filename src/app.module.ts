import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TelegramModule } from './telegram/telegram.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskEntity } from './task/task.entity';
import { TaskService } from './task/task.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Делаем ConfigModule доступным во всем приложении
    }),
    TelegramModule,
    TypeOrmModule.forRoot({
      type: 'sqlite', // Или 'postgres', 'mysql'
      database: 'database.sqlite', // Или 'postgres://user:pass@localhost:5432/db'
      entities: [TaskEntity],
      synchronize: true, // Только для разработки! В проде миграции
    }),
    TypeOrmModule.forFeature([TaskEntity]), // Подключаем сущность задач
  ],
  controllers: [AppController],
  providers: [AppService, TaskService],
})
export class AppModule {}
