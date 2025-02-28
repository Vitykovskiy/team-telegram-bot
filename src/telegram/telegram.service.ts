import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist/config.service';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import * as fs from 'fs';
import OpenAI from 'openai';

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: TelegramBot;
  private openai: OpenAI;
  private readonly prompt: string;

  constructor(private configService: ConfigService) {
    // Загружаем переменные окружения
    const TELEGRAM_BOT_TOKEN =
      this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    const OPENAI_API_KEY = this.configService.get<string>('OPENAI_API_KEY');

    if (!TELEGRAM_BOT_TOKEN || !OPENAI_API_KEY) {
      throw new Error('Отсутствуют необходимые переменные окружения!');
    }

    this.bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
    this.openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    this.prompt = `
    Ты — AI-менеджер проекта. Твоя задача — уточнять требования у пользователя, 
    формировать подробное техническое задание (ТЗ) и сохранять его.
    
    🔹 Как ты работаешь:
    1️⃣ Анализируешь запрос пользователя.
    2️⃣ Задаешь уточняющие вопросы.
    3️⃣ Создаешь структурированное ТЗ.
    4️⃣ Добавляешь маркер "##READY_FOR_SAVE##" в конце.
    
    🔹 Пример формата ТЗ:
    """
    ## 📌 Техническое задание
    
    ### 1️⃣ Описание проекта
    - ...
    
    ### 2️⃣ Основные функции
    - ...
    
    ### 3️⃣ API (если требуется)
    - ...
    
    ### 4️⃣ Технологический стек
    - ...
    
    ##READY_FOR_SAVE##
    """
        `;
  }

  onModuleInit() {
    console.log('🚀 Telegram-бот запущен!');

    this.bot.on('message', async (msg: Message) => {
      try {
        const chatId = msg.chat.id;
        const userMessage = msg.text?.trim() || '';

        if (userMessage === '/start') {
          await this.bot.sendMessage(
            chatId,
            '👋 Привет! Опишите проект, и я помогу собрать ТЗ.',
          );
          return;
        }

        await this.bot.sendChatAction(chatId, 'typing');
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
      } catch (error) {
        console.error('Ошибка в Telegram-боте:', (error as Error).message);
      }
    });
  }

  private async chatWithGPT(message: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: this.prompt },
          { role: 'user', content: message },
        ],
      });

      return (
        response.choices[0]?.message?.content || 'Ошибка в ответе от ChatGPT'
      );
    } catch (error) {
      console.error('Ошибка OpenAI:', (error as Error).message);
      return 'Произошла ошибка при обращении к AI 😔';
    }
  }

  saveRequirementsToFile(content: string): string {
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
