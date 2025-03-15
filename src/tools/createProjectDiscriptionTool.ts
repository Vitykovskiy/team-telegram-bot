import z from 'zod';
import { StructuredToolParams, tool } from '@langchain/core/tools';

// Схема подзадачи
const SubtaskSchema = z.object({
  id: z.string(), // Уникальный номер, можно сгенерировать
  title: z.string().min(1, 'Наименование подзадачи не может быть пустым'),
});

// Основная схема задачи
const TaskSchema = z.object({
  id: z.string().uuid().optional(), // Уникальный номер, можно сгенерировать
  title: z.string().min(1, 'Наименование задачи не может быть пустым'), // Краткая суть
  assignee: z.enum(['Аналитик', 'Разработчик', 'Тестировщик']), // Исполнитель
  type: z.enum(['Аналитик', 'Разработчик', 'Тестировщик']), // Тип задачи (может быть уточнен)
  status: z.enum(['Новый', 'В работе', 'Завершен', 'Отменен']), // Статус задачи
  description: z.string().min(1, 'Описание задачи не может быть пустым'), // Описание с ссылками
  subtasks: z.array(SubtaskSchema).optional(), // Подзадачи (если есть)
});

export const createTaskTool = tool(
  async (input: z.infer<typeof TaskSchema>): Promise<string> => {
    console.log(`Created task ${input.id}: ${input.title}`);
    return `Created task ${input.id}: ${input.title}`;
  },
  {
    name: 'createTask',
    description: 'Create task to llm-agent',
    schema: TaskSchema,
  },
);
