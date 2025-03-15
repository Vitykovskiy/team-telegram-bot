import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskEntity } from './task.entity';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(TaskEntity)
    private taskRepository: Repository<TaskEntity>,
  ) {}

  async createTask(data: Partial<TaskEntity>): Promise<TaskEntity> {
    const task = this.taskRepository.create(data);
    return await this.taskRepository.save(task);
  }
}
