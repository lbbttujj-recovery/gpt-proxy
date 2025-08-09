import { VK, MessageContext } from 'vk-io';
import { SessionManager } from '@vk-io/session';
import { createAIClient } from '../services/ai/factory';
import 'dotenv/config';
import { SceneManager } from '@vk-io/scenes';
import { getStartKeyboard, getGptKeyboard } from './keyboards';
import { registerScenes } from './scenes';

export async function startBot() {
  const GROUP_ID = Number(process.env.VK_GROUP_ID);

  if (!process.env.VK_API_TOKEN) {
    console.error('❌ Ошибка: переменная VK_API_TOKEN не задана в .env');
    process.exit(1);
  }

  const vk = new VK({
    token: process.env.VK_API_TOKEN,
    pollingGroupId: GROUP_ID,
  });

  const ai = createAIClient();

  let isTalkMode = false;

  const sessionManager = new SessionManager();
  const sceneManager = new SceneManager();

  const startKeyboard = getStartKeyboard();
  const gptKeyboard = getGptKeyboard();

  registerScenes(sceneManager);

  vk.updates.on('message_new', sessionManager.middleware);
  vk.updates.on('message_new', sceneManager.middleware);
  vk.updates.on('message_new', sceneManager.middlewareIntercept);

  vk.updates.on('message_new', async (ctx: MessageContext, next) => {
    // Выбираем идентификатор сессии: чат (peerId) или отправитель
    const sessionId = String(ctx.peerId ?? ctx.senderId ?? 'default');

    // Удобная функция для распознавания команды stop из текста или payload
    const isStopCommand =
      (typeof ctx.text === 'string' &&
        ctx.text.trim().toLowerCase() === 'stop') ||
      (ctx.messagePayload &&
        ctx.messagePayload.command === 'talkMode' &&
        ctx.messagePayload.item === 'stop');

    const isChangeModelCommand =
      (typeof ctx.text === 'string' &&
        ctx.text.trim().toLowerCase() === 'change_model') ||
      (ctx.messagePayload && ctx.messagePayload.command === 'change_model');

    if (isStopCommand) {
      isTalkMode = false;
      // Закрываем (очищаем) сессию при нажатии "stop"
      ai.resetSession(sessionId);

      // Явно отправляем стартовое меню (заменяет предыдущую клавиатуру)
      await ctx.send({ message: 'Выберите режим', keyboard: startKeyboard });
    }

    if (isTalkMode) {
      if (isStopCommand) {
        isTalkMode = false;
        // Закрываем (очищаем) сессию при нажатии "stop"
        ai.resetSession(sessionId);

        // Явно отправляем стартовое меню (заменяет предыдущую клавиатуру)
        await ctx.send({ message: 'Выберите режим', keyboard: startKeyboard });
      } else if (isChangeModelCommand) {
        try {
          const current = ai.getModel();
          const strong = process.env.OPENAI_STRONG_MODEL || 'gpt-4o';
          const def = process.env.OPENAI_MODEL || 'gpt-4o-mini';
          const next = current.includes('mini') ? strong : def;
          ai.setModel(next);
          await ctx.send(`Модель переключена на: ${ai.getModel()}`);
        } catch (err) {
          console.error('❌ Ошибка при смене модели:', err);
          await ctx.send('⚠️ Не удалось переключить модель.');
        }
      } else if (ctx.text) {
        try {
          const reply = await ai.askInSession(sessionId, ctx.text);
          // После ответа — отправляем ответ (gpt-клавиатура задана как one_time и автоматически исчезнет)
          await ctx.send(reply);
        } catch (error) {
          console.error('❌ Ошибка при запросе к AI:', error);
          await ctx.send(
            '⚠️ Не удалось получить ответ от AI. Попробуйте позже.',
          );
        }
      }
    } else {
      if (
        ctx.text === 'json_mode' ||
        (ctx.messagePayload &&
          ctx.messagePayload.command === 'mode' &&
          ctx.messagePayload.item === 'json')
      ) {
        return ctx.scene.enter('json');
      }
      if (
        ctx.text === 'talk_mode' ||
        (ctx.messagePayload &&
          ctx.messagePayload.command === 'mode' &&
          ctx.messagePayload.item === 'talk')
      ) {
        await ctx.send({
          message: 'Ну что ж, поговорим.',
          keyboard: gptKeyboard,
        });
        isTalkMode = true;
      }
      if (isChangeModelCommand) {
        // Смена модели и сообщаем результат (вне talk-mode тоже доступно)
        try {
          const current = ai.getModel();
          const strong = process.env.OPENAI_STRONG_MODEL || 'gpt-4o';
          const def = process.env.OPENAI_MODEL || 'gpt-4o-mini';
          const nextModel = current.includes('mini') ? strong : def;
          ai.setModel(nextModel);
          await ctx.send(`Модель переключена на: ${ai.getModel()}`);
        } catch (err) {
          console.error('❌ Ошибка при смене модели:', err);
          await ctx.send('⚠️ Не удалось переключить модель.');
        }
      }
      if (ctx.text === '/start') {
        await ctx.send({ message: 'Выберите режим', keyboard: startKeyboard });
      }
    }
    return next();
  });

  try {
    console.log('🚀 Запуск бота...');
    await vk.updates.start();
    console.log('✅ Бот запущен и слушает события');
  } catch (error) {
    console.error('❌ Ошибка запуска бота:', error);
    process.exit(1);
  }
}

export default startBot;
