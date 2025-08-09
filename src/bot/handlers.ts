import type { MessageContext } from 'vk-io';

/**
 * Создаёт обработчик сообщений с внутренним состоянием isTalkMode.
 * ai — объект, реализующий методы askInSession, resetSession, setModel, getModel.
 * startKeyboard / gptKeyboard — объекты клавиатур (VK Keyboard).
 */
export function createMessageHandler(
  ai: any,
  startKeyboard: any,
  gptKeyboard: any,
) {
  let isTalkMode = false;

  const isStopCommand = (ctx: MessageContext) =>
    (typeof ctx.text === 'string' && ctx.text.trim().toLowerCase() === 'stop') ||
    (ctx.messagePayload &&
      ctx.messagePayload.command === 'talkMode' &&
      ctx.messagePayload.item === 'stop');

  const isChangeModelCommand = (ctx: MessageContext) =>
    (typeof ctx.text === 'string' && ctx.text.trim().toLowerCase() === 'change_model') ||
    (ctx.messagePayload && ctx.messagePayload.command === 'change_model');

  return async function messageHandler(ctx: MessageContext, next: any) {
    const sessionId = String(ctx.peerId ?? ctx.senderId ?? 'default');

    try {
      if (isTalkMode) {
        if (isStopCommand(ctx)) {
          isTalkMode = false;
          ai.resetSession(sessionId);
          await ctx.send({ message: 'Выберите режим', keyboard: startKeyboard });
          return next();
        }

        if (isChangeModelCommand(ctx)) {
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
          return next();
        }

        if (ctx.text) {
          try {
            const reply = await ai.askInSession(sessionId, ctx.text);
            await ctx.send(reply);
          } catch (error) {
            console.error('❌ Ошибка при запросе к AI:', error);
            await ctx.send('⚠️ Не удалось получить ответ от AI. Попробуйте позже.');
          }
        }

        return next();
      } else {
        // вне talk-mode — обрабатываем команды перехода режимов и смены модели
        if (
          ctx.text === 'json_mode' ||
          (ctx.messagePayload && ctx.messagePayload.command === 'mode' && ctx.messagePayload.item === 'json')
        ) {
          return ctx.scene.enter('json');
        }

        if (
          ctx.text === 'talk_mode' ||
          (ctx.messagePayload && ctx.messagePayload.command === 'mode' && ctx.messagePayload.item === 'talk')
        ) {
          await ctx.send({
            message: 'Ну что ж, поговорим.',
            keyboard: gptKeyboard,
          });
          isTalkMode = true;
          return next();
        }

        if (isChangeModelCommand(ctx)) {
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
          return next();
        }

        if (ctx.text === '/start') {
          await ctx.send({ message: 'Выберите режим', keyboard: startKeyboard });
        }

        return next();
      }
    } catch (err) {
      // Глобальная защита от падения хендлера
      console.error('❌ Ошибка в messageHandler:', err);
      return next();
    }
  };
}
