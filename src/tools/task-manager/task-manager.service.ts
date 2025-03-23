// task-manager.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskEntity } from './task.entity';
import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

const subtaskSchema = z.object({
  code: z.string().min(1, "Кодовое название подзадачи не может быть пустым"),
  title: z.string().min(1, 'Наименование подзадачи не может быть пустым'),
});

const taskSchema = z.object({
  code: z.string().min(1, "Кодовое название задачи не может быть пустым"),
  title: z.string().min(1, 'Наименование задачи не может быть пустым'),
  assignee: z.enum(['Аналитик', 'Разработчик', 'Тестировщик']),
  type: z.enum(['Epic', 'Story', 'Task']),
  status: z.enum(['Новый', 'В работе', 'Завершен', 'Отменен']),
  description: z.string().min(1, 'Описание задачи не может быть пустым'),
  subtasks_codes: z.array(z.string()).optional().describe("Список кодов задач, которые являются подзадачами текущей задачи")
});

// Схема, принимающая сразу массив задач
const tasksArraySchema = z.object({
  tasks: z.array(taskSchema).min(1, "Должна быть хотя бы одна задача"),
});

@Injectable()
export class TaskManagerService {
  private readonly createTaskToolInstance: StructuredTool;

  constructor(
    @InjectRepository(TaskEntity)
    private taskRepository: Repository<TaskEntity>,
  ) {
    const taskService = this;

    this.createTaskToolInstance = new (class extends StructuredTool {
      name = 'createTasks';
      description = 'Создаёт новые задачи и сохраняет их в БД';
      schema = tasksArraySchema;

      async _call(input: z.infer<typeof tasksArraySchema>): Promise<string> {
        const createdTasks = await taskService._createTasks(input.tasks);
        const taskTitles = createdTasks.map(t => `"${t.title}"`).join(', ');
        return `✅ Созданы задачи: ${taskTitles}`;
      }
    })();
  }

  public get createTaskTool(): StructuredTool {
    return this.createTaskToolInstance;
  }

  public get tools(): StructuredTool[] {
    return [
      this.createTaskToolInstance
    ]
  }

  public get toolsMap(): Map<string, StructuredTool> {
    return new Map<string, StructuredTool>([
      ['createTasks', this.createTaskToolInstance]
    ])
  }

  private async _createTasks(data: Partial<TaskEntity>[]): Promise<TaskEntity[]> {
    console.log('_createTasks', data)
    const tasks = this.taskRepository.create(data);
    return await this.taskRepository.save(tasks);
  }
}
