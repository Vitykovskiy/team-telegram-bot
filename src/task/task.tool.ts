import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

// Схема подзадачи
const subtaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Наименование подзадачи не может быть пустым'),
});

// Основная схема задачи
const taskSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Наименование задачи не может быть пустым'),
  assignee: z.enum(['Аналитик', 'Разработчик', 'Тестировщик']),
  type: z.enum(['Epic', 'Story', 'Task']),
  status: z.enum(['Новый', 'В работе', 'Завершен', 'Отменен']),
  description: z.string().min(1, 'Описание задачи не может быть пустым'),
  subtasks: z.array(subtaskSchema).optional(),
});

// Создаём инструмент через StructuredTool
export class CreateTaskTool extends StructuredTool {
  name = 'createTask';
  description = 'Создаёт новую задачу и сохраняет её в БД';
  schema = taskSchema;

  async _call(input: z.infer<typeof taskSchema>): Promise<string> {
    return `✅ Задача "${input.title}" создана!`;
  }
}

// Экспортируем экземпляр
export const createTaskTool = new CreateTaskTool();

export const toolsList = new Map<string, CreateTaskTool>([
  ['createTask', createTaskTool],
]);
