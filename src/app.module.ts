import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskEntity } from './tools/task-manager/task.entity';
import { TelegramService } from './telegram/telegram.service';
import { TaskManagerService } from './tools/task-manager/task-manager.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Делаем ConfigModule доступным во всем приложении
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite', // Или 'postgres', 'mysql'
      database: 'database.sqlite', // Или 'postgres://user:pass@localhost:5432/db'
      entities: [TaskEntity],
      synchronize: true, // Только для разработки! В проде миграции
    }),
    TypeOrmModule.forFeature([TaskEntity]), // Подключаем сущность задач
  ],
  controllers: [AppController],
  providers: [AppService, TelegramService, TaskManagerService],
})
export class AppModule { }
