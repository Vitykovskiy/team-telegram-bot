import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import * as fs from 'fs';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';
import { PM_PROMPT } from './constants';

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: TelegramBot;
  private openai: OpenAI;
  private readonly prompt: string;
  private chatHistory: Map<number, ChatCompletionMessageParam[]>;

  constructor(private configService: ConfigService) {
    const TELEGRAM_BOT_TOKEN =
      this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    const OPENAI_API_KEY = this.configService.get<string>('OPENAI_API_KEY');

    if (!TELEGRAM_BOT_TOKEN || !OPENAI_API_KEY) {
      throw new Error('Отсутствуют необходимые переменные окружения!');
    }

    this.bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
    this.openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    this.chatHistory = new Map();
    this.prompt = PM_PROMPT;
  }

  onModuleInit() {
    console.log('Telegram-бот запущен');

    this.bot.on('message', async (msg: Message) => {
      try {
        const chatId = msg.chat.id;
        const userMessage = msg.text?.trim() || '';

        if (userMessage === '/start') {
          this.chatHistory.set(chatId, [
            { role: 'system', content: this.prompt },
          ]);

          await this.bot.sendMessage(
            chatId,
            '👋 Привет! Опишите проект, и я помогу собрать ТЗ.',
          );

          const response = await this.chatWithGPT(userMessage);

          if (response.includes('##READY_FOR_SAVE##')) {
            this.saveRequirementsToFile(response);
            await this.bot.sendMessage(
              chatId,
              '❓ Вас устраивает ТЗ? Ответьте *да* или *нет*.',
              { parse_mode: 'Markdown' },
            );
          } else {
            await this.bot.sendMessage(chatId, response);
          }
        }
      } catch (error) {
        console.error('Ошибка в Telegram-боте:', (error as Error).message);
      }
    });
  }

  private async chatWithGPT(
    chatId: number,
    userMessage: string,
  ): Promise<string> {
    try {
      // Получаем историю чата или создаём новую
      const history = this.chatHistory.get(chatId) || [
        { role: 'system', content: this.prompt },
      ];
      history.push({ role: 'user', content: userMessage });

      // Отправляем историю в OpenAI
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: history,
      });

      const aiResponse =
        response.choices[0]?.message?.content || 'Ошибка в ответе от ChatGPT';

      // Добавляем ответ AI в историю
      history.push({ role: 'assistant', content: aiResponse });

      // Сохраняем обновлённую историю
      this.chatHistory.set(chatId, history.slice(-10)); // Храним только последние 10 сообщений

      return aiResponse;
    } catch (error) {
      console.error('Ошибка OpenAI:', (error as Error).message);
      return 'Произошла ошибка при обращении к AI 😔';
    }
  }

  createTask(content: string): string {
    try {
      const filePath = 'requirements.md';
      fs.writeFileSync(filePath, content);
      return filePath;
    } catch (error) {
      console.error('Ошибка записи в файл:', (error as Error).message);
      return '';
    }
  }
}
