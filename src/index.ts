import { VK, Keyboard, MessageContext } from 'vk-io';
import { SessionManager } from '@vk-io/session';
import 'dotenv/config';
import { SceneManager, StepScene } from '@vk-io/scenes';
import { createAIClient } from './services/OpenAIClient';

const GROUP_ID = 232031142; // без club

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

const startKeyboard = Keyboard.keyboard([
  Keyboard.textButton({
    label: 'json_mode',
    payload: { command: 'mode', item: 'json' },
    color: Keyboard.POSITIVE_COLOR,
  }),
  Keyboard.textButton({
    label: 'talk_mode',
    payload: { command: 'mode', item: 'talk' },
    color: Keyboard.POSITIVE_COLOR,
  }),
]);

const gptKeyboard = Keyboard.keyboard([
  Keyboard.textButton({
    label: 'stop',
    payload: { command: 'talkMode', item: 'stop' },
    color: Keyboard.NEGATIVE_COLOR,
  }),
]);

vk.updates.on('message_new', sessionManager.middleware);
vk.updates.on('message_new', sceneManager.middleware);
vk.updates.on('message_new', sceneManager.middlewareIntercept);

sceneManager.addScenes([
  new StepScene<MessageContext>('json', [
    async (ctx) => {
      if (ctx.scene.step.firstTime || !ctx.text) {
        return ctx.send('Введите json');
      }
      ctx.scene.state.json = ctx.text;
      return ctx.scene.step.next();
    },
    async (ctx) => {
      if (ctx.scene.step.firstTime || !ctx.text) {
        return ctx.send(
          'Какие поля изменить? Перечисли через запятую или "all" для всех',
        );
      }
      ctx.scene.state.fields = ctx.text;
      return ctx.scene.step.next();
    },
    async (ctx) => {
      if (ctx.scene.step.firstTime || !ctx.text) {
        return ctx.send('Введите количество');
      }
      ctx.scene.state.count = Number(ctx.text);
      return ctx.scene.step.next();
    },
    async (ctx) => {
      const { fields, json, count } = ctx.scene.state as {
        fields: string;
        json: string;
        count: number;
      };
      const changeFields =
        fields === 'all'
          ? 'Измени все поля'
          : `Измени следующие поля: ${fields}`;
      const request = `Сгенерируй массив из ${count} JSON по примеру: ${json}. ${changeFields}`;
      console.log(request);
      await ctx.send('eee');
      return ctx.scene.step.next();
    },
  ]),
]);

vk.updates.on('message_new', async (ctx, next) => {
  // Выбираем идентификатор сессии: чат (peerId) или отправитель
  const sessionId = String(ctx.peerId ?? ctx.senderId ?? 'default');

  if (isTalkMode) {
    if (ctx.text === 'stop') {
      isTalkMode = false;
      // Закрываем (очищаем) сессию при нажатии "stop"
      ai.resetSession(sessionId);

      await ctx.send({ message: 'Выберите режим', keyboard: startKeyboard });
    } else if (ctx.text) {
      try {
        const reply = await ai.askInSession(sessionId, ctx.text);
        await ctx.send(reply);
      } catch (error) {
        console.error('❌ Ошибка при запросе к AI:', error);
        await ctx.send('⚠️ Не удалось получить ответ от AI. Попробуйте позже.');
      }
    }
  } else {
    if (ctx.text === 'json_mode') {
      return ctx.scene.enter('json');
    }
    if (ctx.text === 'talk_mode') {
      await ctx.send({
        message: 'Ну что ж, поговорим.',
        keyboard: gptKeyboard,
      });
      isTalkMode = true;
    }
    if (ctx.text === '/start') {
      await ctx.send({ message: 'Выберите режим', keyboard: startKeyboard });
    }
  }
  return next();
});

(async () => {
  try {
    console.log('🚀 Запуск бота...');
    await vk.updates.start();
    console.log('✅ Бот запущен и слушает события');
  } catch (error) {
    console.error('❌ Ошибка запуска бота:', error);
  }
})();
