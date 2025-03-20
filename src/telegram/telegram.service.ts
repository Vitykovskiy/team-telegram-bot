import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { BufferMemory } from 'langchain/memory';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { PM_PROMPT } from './constants';
import { createTaskTool, toolsList } from 'src/task/task.tool';
import { MessageContent } from '@langchain/core/messages';
import { ChatCompletionMessageParam } from 'openai/resources';
import { ToolCall } from '@langchain/core/dist/messages/tool';

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: TelegramBot;
  private openai: ChatOpenAI;
  private readonly prompt: string;
  private memory: BufferMemory;

  constructor(private configService: ConfigService) {
    const TELEGRAM_BOT_TOKEN =
      this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    const OPENAI_API_KEY = this.configService.get<string>('OPENAI_API_KEY');

    if (!TELEGRAM_BOT_TOKEN || !OPENAI_API_KEY) {
      throw new Error('Отсутствуют необходимые переменные окружения!');
    }

    this.bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
    this.openai = new ChatOpenAI({
      model: 'gpt-4o-mini',
      temperature: 0,
    });

    this.memory = new BufferMemory({ returnMessages: true });
    this.prompt = PM_PROMPT;
  }

  onModuleInit() {
    console.log('Telegram-бот запущен');

    this.bot.on('message', async (msg: Message) => {
      try {
        const chatId = msg.chat.id;
        const userMessage = msg.text?.trim() || '';

        await this.bot.sendMessage(
          chatId,
          `chatId: ${chatId}, userMessage: ${userMessage}`,
        );

        if (userMessage === '/start') {
          await this.bot.sendMessage(
            chatId,
            '👋 Привет! Опишите проект, и я помогу собрать ТЗ.',
          );
        } else {
          const response = await this.chatWithGPT(userMessage);
          await this.bot.sendMessage(chatId, JSON.stringify(response));
        }
      } catch (error) {
        console.error('Ошибка в Telegram-боте:', (error as Error).message);
      }
    });
  }

  private async chatWithGPT(userMessage: string): Promise<MessageContent> {
    try {
      // Сохраняем сообщение пользователя в памяти
      await this.memory.saveContext(
        { input: userMessage },
        { output: '...' }, // Пока оставляем пустым, но позже заменим на ответ модели
      );

      // Получаем всю историю сообщений
      const chatHistory = await this.memory.loadMemoryVariables({});

      // Явно указываем, что `history` — это массив сообщений OpenAI
      const messages: ChatCompletionMessageParam[] = Array.isArray(
        chatHistory.history,
      )
        ? (chatHistory.history as ChatCompletionMessageParam[])
        : [];

      // Генерируем ответ модели
      const response = await this.openai
        .bindTools([createTaskTool])
        .invoke(JSON.stringify(messages));

      const aiResponse = response.content;

      console.log('response', response);

      if (response.tool_calls) {
        for (const toolCall of response.tool_calls) {
          const selectedTool = toolsList.get(toolCall.name);
          if (selectedTool) {
            const toolMessage = await selectedTool.invoke(toolCall as ToolCall);

            await this.memory.saveContext(
              { input: userMessage },
              { output: aiResponse },
            );

            return toolMessage.content;
          } else {
            return 'Ошибка инструмента:' + toolCall.name;
          }
        }
      }

      await this.memory.saveContext(
        { input: userMessage },
        { output: aiResponse },
      );

      return aiResponse;
    } catch (error) {
      console.error('Ошибка OpenAI:', (error as Error).message);
      return 'Произошла ошибка при обращении к AI';
    }
  }

  /*   createTask(content: string): string {
    try {
      const filePath = 'requirements.md';
      fs.writeFileSync(filePath, content);
      return filePath;
    } catch (error) {
      console.error('Ошибка записи в файл:', (error as Error).message);
      return '';
    }
  } */
}
