import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskEntity } from './task-manager/task.entity';

@Injectable()
export class ToolsService {
  constructor(
    @InjectRepository(TaskEntity)
    private taskRepository: Repository<TaskEntity>,
  ) { }

  async createTasks(data: Partial<TaskEntity>): Promise<TaskEntity> {
    const task = this.taskRepository.create(data);
    return await this.taskRepository.save(task);
  }
}