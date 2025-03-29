import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { BufferMemory } from 'langchain/memory';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { PM_PROMPT, WELCOME_MESSAGE } from './constants';
import { TaskManagerService } from 'src/tools/task-manager/task-manager.service';
import { MessageContent } from '@langchain/core/messages';
import { ChatCompletionMessageParam } from 'openai/resources';
import { ToolCall } from '@langchain/core/dist/messages/tool';
import { Runnable } from '@langchain/core/runnables';
import { ChatPromptTemplate } from '@langchain/core/prompts';

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: TelegramBot;
  private model: Runnable;
  private memory: BufferMemory;

  constructor(
    private configService: ConfigService,
    private taskManagerService: TaskManagerService,
  ) {
    this.taskManagerService = taskManagerService;

    const TELEGRAM_BOT_TOKEN =
      this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    const OPENAI_API_KEY = this.configService.get<string>('OPENAI_API_KEY');

    if (!TELEGRAM_BOT_TOKEN || !OPENAI_API_KEY) {
      throw new Error('Отсутствуют необходимые переменные окружения!');
    }


    this.bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
    this.model = new ChatOpenAI({
      model: 'gpt-4o-mini',
      temperature: 0,
    }).bindTools(this.taskManagerService.tools)

    this.memory = new BufferMemory({ returnMessages: true });

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
          await this.bot.sendMessage(chatId, WELCOME_MESSAGE);
        } else {
          const response = await this.sendMessageToModel(userMessage);
          await this.bot.sendMessage(chatId, String(response));
        }
      } catch (error) {
        console.error('Ошибка в Telegram-боте:', (error as Error).message);
      }
    });
  }

  private async sendMessageToModel(
    userMessage: string,
  ): Promise<MessageContent> {
    try {
      // Получаем историю
      const chatHistory = await this.memory.loadMemoryVariables({});
      const messages: ChatCompletionMessageParam[] = Array.isArray(
        chatHistory.history,
      )
        ? chatHistory.history
        : [];

      // Добавляем текущее сообщение пользователя
      messages.push(
        { role: 'user', content: userMessage }
      );

      // Генерируем ответ модели
      const response = await this.model.invoke(messages);
      console.log('Model response', response)

      let aiResponse = response.content ?? '';

      // Проверяем вызовы инструментов
      if (response.tool_calls) {
        for (const toolCall of response.tool_calls) {
          const selectedTool = this.taskManagerService.toolsMap.get(
            toolCall.name,
          );
          if (selectedTool) {
            const toolMessage = await selectedTool.invoke(toolCall as ToolCall);
            aiResponse += '\n ' + toolMessage.content;
          } else {
            aiResponse += '\n Ошибка инструмента: ' + toolCall.name;
          }
        }
      }

      await this.memory.saveContext(
        { input: userMessage },
        { output: aiResponse },
      );

      return aiResponse;
    } catch (error) {
      console.error('Ошибка модели:', (error as Error).message);
      return 'Произошла ошибка при обращении к AI';
    }
  }
}