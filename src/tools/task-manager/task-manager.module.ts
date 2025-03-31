import { Module } from '@nestjs/common';
import { TaskManagerService } from './task-manager.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskEntity } from './task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TaskEntity])],
  exports: [TaskManagerService],
  providers: [TaskManagerService],
})
export class TaskManagerModule {}
