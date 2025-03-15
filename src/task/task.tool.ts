import z from 'zod';
import { tool } from '@langchain/core/tools';
import { TaskService } from './task.service';

// Схема подзадачи
const SubtaskSchema = z.object({
  id: z.string(), // Уникальный номер, можно сгенерировать
  title: z.string().min(1, 'Наименование подзадачи не может быть пустым'),
});

// Основная схема задачи
const TaskSchema = z.object({
  id: z.string(), // Уникальный номер, можно сгенерировать
  title: z.string().min(1, 'Наименование задачи не может быть пустым'), // Краткая суть
  assignee: z.enum(['Аналитик', 'Разработчик', 'Тестировщик']), // Исполнитель
  type: z.enum(['Аналитик', 'Разработчик', 'Тестировщик']), // Тип задачи (может быть уточнен)
  status: z.enum(['Новый', 'В работе', 'Завершен', 'Отменен']), // Статус задачи
  description: z.string().min(1, 'Описание задачи не может быть пустым'), // Описание с ссылками
  subtasks: z.array(SubtaskSchema).optional(), // Подзадачи (если есть)
});

export const createTaskTool = (taskService: TaskService) =>
  tool(
    async (input: z.infer<typeof TaskSchema>): Promise<string> => {
      try {
        const newTask = await taskService.createTask({
          id: input.id || undefined, // UUID генерируется автоматически
          title: input.title,
          assignee: input.assignee,
          type: input.type,
          status: input.status,
          description: input.description,
          subtasks: input.subtasks || [],
        });

        return `✅ Task ${newTask.id} сохранена в БД!`;
      } catch (error) {
        return `❌ Ошибка: ${error.message}`;
      }
    },
    {
      name: 'createTask',
      description: 'Создаёт новую задачу и сохраняет в БД',
      schema: TaskSchema,
    },
  );
