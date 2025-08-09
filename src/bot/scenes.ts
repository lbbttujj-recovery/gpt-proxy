import { SceneManager, StepScene } from '@vk-io/scenes';
import type { MessageContext } from 'vk-io';

export function registerScenes(sceneManager: SceneManager) {
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
}
