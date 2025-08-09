import 'dotenv/config';
import startBot from './bot';

(async () => {
  try {
    await startBot();
  } catch (err) {
    console.error('❌ Ошибка при запуске бота:', err);
    process.exit(1);
  }
})();
