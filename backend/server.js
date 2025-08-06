const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors'); // Для обработки CORS

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // Адрес вашего фронтенда
  credentials: true
}));
app.use(express.json());

// Папка для хранения конфигураций администраторов (в реальном проекте используйте БД)
const CONFIG_DIR = path.join(__dirname, 'admin_configs');
(async () => {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (err) {
    console.error('Не удалось создать папку для конфигов:', err);
  }
})();

// Вспомогательная функция для получения пути к файлу конфига
const getConfigPath = (adminAddress) => {
  // Очищаем адрес от недопустимых символов для имени файла
  const safeAddress = adminAddress.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return path.join(CONFIG_DIR, `${safeAddress}.json`);
};

// --- API Endpoints ---

// GET /api/admin/config - Получить конфигурацию администратора
app.get('/api/admin/config', async (req, res) => {
  const adminAddress = req.headers['x-admin-address'];

  if (!adminAddress) {
    return res.status(400).json({ error: 'Требуется заголовок X-Admin-Address' });
  }

  try {
    const configPath = getConfigPath(adminAddress);
    const data = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(data);
    res.json(config);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Файл не найден - конфигурация отсутствует
      return res.status(404).json({ error: 'Конфигурация не найдена' });
    }
    console.error('Ошибка при чтении конфига:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// POST /api/admin/config - Сохранить/обновить конфигурацию администратора
app.post('/api/admin/config', async (req, res) => {
  const adminAddress = req.headers['x-admin-address'];
  const configData = req.body;

  if (!adminAddress) {
    return res.status(400).json({ error: 'Требуется заголовок X-Admin-Address' });
  }

  if (!configData || typeof configData !== 'object') {
    return res.status(400).json({ error: 'Неверный формат данных конфигурации' });
  }

  try {
    const configPath = getConfigPath(adminAddress);
    await fs.writeFile(configPath, JSON.stringify(configData, null, 2));
    res.status(200).json({ message: 'Конфигурация сохранена' });
  } catch (err) {
    console.error('Ошибка при записи конфига:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// --- Запуск сервера ---
app.listen(PORT, () => {
  console.log(`Сервер админки запущен на порту ${PORT}`);
});