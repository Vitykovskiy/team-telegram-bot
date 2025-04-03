import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import TelegramBot, { Message } from 'node-telegram-bot-api';
import { PM_PROMPT, WELCOME_MESSAGE } from './constants';
import { TaskManagerService } from 'src/tools/task-manager/task-manager.service';
import {
  Runnable,
  RunnableWithMessageHistory,
} from '@langchain/core/runnables';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';
import { ToolCall, ToolMessage } from '@langchain/core/dist/messages/tool';

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: TelegramBot;
  private chain: Runnable;
  private readonly sessions: Map<string, InMemoryChatMessageHistory>;

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
    const model = new ChatOpenAI({
      model: 'gpt-4o-mini',
      temperature: 0,
    });

    const modelWithTools = model.bindTools(this.taskManagerService.tools);

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', PM_PROMPT],
      new MessagesPlaceholder('history'),
      ['human', '{input}'],
    ]);

    this.sessions = new Map<string, InMemoryChatMessageHistory>();

    this.chain = new RunnableWithMessageHistory({
      runnable: prompt.pipe(modelWithTools),
      getMessageHistory: (sessionId: string) => {
        if (!this.sessions.has(sessionId)) {
          this.sessions.set(sessionId, new InMemoryChatMessageHistory());
        }
        return this.sessions.get(sessionId)!;
      },
      inputMessagesKey: 'input',
      historyMessagesKey: 'history',
    });
  }

  onModuleInit() {
    console.log('Telegram-бот запущен');

    this.bot.on('message', async (msg: Message) => {
      try {
        const chatId = msg.chat.id;
        const userMessage = msg.text?.trim() || '';

        if (userMessage === '/start') {
          await this.bot.sendMessage(chatId, WELCOME_MESSAGE);
        } else {
          const response = await this.sendMessageToModel(
            userMessage,
            chatId.toString(),
          );
          await this.bot.sendMessage(chatId, response, {
            parse_mode: 'HTML',
          });
        }
      } catch (error) {
        console.error('Ошибка в Telegram-боте:', (error as Error).message);
      }
    });
  }

  private async sendMessageToModel(
    userMessage: string,
    chatId: string,
  ): Promise<string> {
    try {
      const response = await this.chain.invoke(
        { input: userMessage },
        { configurable: { sessionId: chatId } },
      );

      const toolCalls = response.additional_kwargs?.tool_calls ?? [];

      if (toolCalls.length) {
        const aiResponse: string[] = [];
        const history = this.sessions.get(chatId);

        for (const toolCall of toolCalls) {
          const selectedTool = this.taskManagerService.toolsMap.get(
            toolCall.name,
          );

          if (selectedTool && history) {
            const toolResult = await selectedTool.invoke(toolCall as ToolCall);

            const resultText = Array.isArray(toolResult)
              ? JSON.stringify(toolResult, null, 2)
              : String(toolResult);

            // КРИТИЧЕСКИ ВАЖНО: сохраняем ToolMessage в историю!
            await history.addMessage(
              new ToolMessage({
                tool_call_id: toolCall.id,
                content: resultText,
              }),
            );

            aiResponse.push(resultText);
          } else {
            const errorMsg = `Ошибка инструмента: ${toolCall.name}`;
            aiResponse.push(errorMsg);
          }
        }

        return aiResponse.join('\n\n');
      }

      return response.content;
    } catch (error) {
      console.error('Ошибка модели:', (error as Error).message);
      return 'Произошла ошибка при обращении к AI';
    }
  }
}
