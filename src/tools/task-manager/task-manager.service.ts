import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { TaskEntity } from './task.entity';
import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

const taskSchema = z.object({
  code: z.string().min(1, 'Кодовое название задачи не может быть пустым'),
  title: z.string().min(1, 'Наименование задачи не может быть пустым'),
  assignee: z.enum(['Аналитик', 'Разработчик', 'Тестировщик']),
  type: z.enum(['Epic', 'Story', 'Task']),
  status: z.enum(['Новый', 'В работе', 'Завершен', 'Отменен']),
  description: z.string().min(1, 'Описание задачи не может быть пустым'),
  subtasks_codes: z
    .array(z.string())
    .optional()
    .describe(
      'Список кодов задач, которые являются подзадачами текущей задачи',
    ),
});

const tasksArraySchema = z.object({
  tasks: z.array(taskSchema).min(1, 'Должна быть хотя бы одна задача'),
});

const filterTaskSchema = z.object({
  code: z.string().optional().describe('Номер задачи'),
  assignee: z
    .string()
    .optional()
    .describe(
      'Исполнитель задачи. Варианты значений: Аналитик, Разработчик, Тестировщик',
    ),
  type: z
    .string()
    .optional()
    .describe('Тип задачи. Варианты значений: Epic, Story, Task'),
  status: z
    .string()
    .optional()
    .describe(
      'Статус задачи. Варианты значений: Новый, В работе, Завершен, Отменен',
    ),
});

@Injectable()
export class TaskManagerService {
  private readonly createTaskToolInstance: StructuredTool;
  private readonly searchTasksToolInstance: StructuredTool;

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
        let createdTasks: TaskEntity[] = [];
        try {
          createdTasks = await taskService._createTasks(input.tasks);
        } catch (error) {
          console.error('TaskManager _createTasks:', error);
        }

        const taskTitles = createdTasks
          .map((t) => `\n${t.code} - "${t.title}"`)
          .join(', ');
        return `Созданы задачи: ${taskTitles}`;
      }
    })();

    this.searchTasksToolInstance = new (class extends StructuredTool {
      name = 'searchTasks';
      description =
        'Поиск задач в БД по значению полей. Поля, по которым поиск не происходит, не должны заполняться';
      schema = filterTaskSchema;

      async _call(
        filter: z.infer<typeof filterTaskSchema>,
      ): Promise<TaskEntity[]> {
        let tasks: TaskEntity[] = [];
        try {
          tasks = await taskService._searchTasks(filter);
        } catch (error) {
          console.error('TaskManager _searchTasks:', error);
        }
        return tasks;
      }
    })();
  }

  public get tools(): StructuredTool[] {
    return [this.createTaskToolInstance, this.searchTasksToolInstance];
  }

  public get toolsMap(): Map<string, StructuredTool> {
    return new Map<string, StructuredTool>([
      ['createTasks', this.createTaskToolInstance],
      ['searchTasks', this.searchTasksToolInstance],
    ]);
  }

  private async _createTasks(
    data: Partial<TaskEntity>[],
  ): Promise<TaskEntity[]> {
    const tasks = this.taskRepository.create(data);
    return this.taskRepository.save(tasks);
  }

  private async _searchTasks(
    rawFilter: FindOptionsWhere<TaskEntity>,
  ): Promise<TaskEntity[]> {
    const cleanedFilter: FindOptionsWhere<TaskEntity> = Object.fromEntries(
      Object.entries(rawFilter).filter(
        ([, value]) =>
          value !== undefined &&
          !(typeof value === 'string' && value.trim() === ''),
      ),
    );

    return this.taskRepository.find({
      where: cleanedFilter,
    });
  }
}
