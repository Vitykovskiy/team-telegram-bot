import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ToolsModule } from './tools/tools.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskEntity } from './tools/task-manager/task.entity';
import { TelegramService } from './telegram/telegram.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Делаем ConfigModule доступным во всем приложении
    }),
    ToolsModule,
    TypeOrmModule.forRoot({
      type: 'sqlite', // Или 'postgres', 'mysql'
      database: 'database.sqlite', // Или 'postgres://user:pass@localhost:5432/db'
      entities: [TaskEntity],
      synchronize: true, // Только для разработки! В проде миграции
    }),
  ],
  controllers: [],
  providers: [TelegramService],
})
export class AppModule {}
