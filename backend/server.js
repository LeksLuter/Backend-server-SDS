// backend/server.js
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001; // Используем PORT из env, если задан

// Middleware
app.use(cors({
  origin: '*', // Для упрощения разрешаем CORS со всех origins
  // origin: 'http://localhost:3000', // Можно раскомментировать и указать точный origin фронтенда
  credentials: true
}));
app.use(express.json());

// Папка для хранения конфигураций администраторов
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
  const safeAddress = adminAddress.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return path.join(CONFIG_DIR, `${safeAddress}.json`);
};

// --- НОВЫЙ ENDPOINT: Страница-заглушка ---
// Обрабатывает GET-запросы к корневому пути '/'
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Сервер бэкенда админки</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #1a2a6c, #2c3e50);
                color: #fff;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                text-align: center;
            }
            .container {
                background-color: rgba(0, 0, 0, 0.7);
                padding: 2rem;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                max-width: 90%;
                width: 500px;
            }
            h1 {
                color: #4CAF50; /* Зеленый цвет для статуса "работает" */
                margin-bottom: 1rem;
            }
            p {
                font-size: 1.1rem;
                margin-bottom: 1.5rem;
            }
            .status {
                display: inline-block;
                padding: 0.5rem 1rem;
                background-color: #4CAF50;
                color: white;
                border-radius: 20px;
                font-weight: bold;
                margin-top: 1rem;
            }
            .api-info {
                background-color: rgba(255, 255, 255, 0.1);
                padding: 1rem;
                border-radius: 10px;
                margin-top: 1.5rem;
                text-align: left;
                font-size: 0.9rem;
            }
            .api-info h2 {
                margin-top: 0;
                color: #3498db;
                text-align: center;
            }
            .api-info ul {
                padding-left: 1.2rem;
            }
            .api-info li {
                margin-bottom: 0.5rem;
            }
            .api-info code {
                background-color: rgba(0, 0, 0, 0.3);
                padding: 0.2rem 0.4rem;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Сервер бэкенда админки</h1>
            <p>Этот сервер предоставляет API для синхронизации настроек администратора.</p>
            <div class="status">✅ Сервер запущен и работает</div>

            <div class="api-info">
                <h2>Доступные API-endpoints:</h2>
                <ul>
                    <li><strong>GET</strong> <code>/api/admin/config</code> - Получить настройки администратора (требуется заголовок <code>X-Admin-Address</code>)</li>
                    <li><strong>POST</strong> <code>/api/admin/config</code> - Сохранить настройки администратора (требуется заголовок <code>X-Admin-Address</code> и JSON-тело)</li>
                </ul>
            </div>
        </div>
    </body>
    </html>
  `);
});
// --- КОНЕЦ НОВОГО ENDPOINT'А ---

// --- СУЩЕСТВУЮЩИЕ API Endpoints ---

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
app.listen(PORT, '0.0.0.0', () => { // Слушаем на всех интерфейсах '0.0.0.0' для работы в контейнерах/на хостингах
  console.log(`✅ Сервер админки запущен и слушает на порту ${PORT}`);
  console.log(`🔗 Локальный доступ: http://localhost:${PORT}`);
  // console.log(`🔗 Сетевой доступ (если настроен): http://<ваш_IP>:${PORT}`); // Опционально
});
