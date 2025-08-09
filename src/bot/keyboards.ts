import { Keyboard } from 'vk-io';

export function getStartKeyboard() {
  // persistent — показываем как основное меню
  const kb = Keyboard.keyboard([
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
    Keyboard.textButton({
      label: 'change_model',
      payload: { command: 'change_model' },
      color: Keyboard.PRIMARY_COLOR,
    }),
  ]);
  // Явно помечаем как не one_time (persistent). Приведение к any нужно из-за сигнатуры библиотеки.
  (kb as any).one_time = false;
  return kb;
}

export function getGptKeyboard() {
  // one_time: true — клавиатура скроется после нажатия,
  // это помогает убрать кнопку "stop" у пользователя, если бот перезапустился
  const kb = Keyboard.keyboard([
    Keyboard.textButton({
      label: 'stop',
      payload: { command: 'talkMode', item: 'stop' },
      color: Keyboard.NEGATIVE_COLOR,
    }),
    Keyboard.textButton({
      label: 'change_model',
      payload: { command: 'change_model' },
      color: Keyboard.PRIMARY_COLOR,
    }),
  ]);
  // Устанавливаем флаг one_time через any, чтобы соответствовать ожидаемой структуре клавиатуры.
  (kb as any).one_time = true;
  return kb;
}
