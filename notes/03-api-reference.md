# API Reference

Этот документ описывает API Schedge, включая доступные эндпоинты, методы и параметры.

## Структура объектов

Подробная структура объектов описана в файле 
[schema.json](../schedge-backend/static/schema.json).

Краткая справка:
- `RawTask`: базовая структура задачи, включает поля
  `id`, `title`, `description`, `duration`, `priority`,
  `deadline` и т.д.
  Является одним из нескольких объектов:
  `RawFixedTask`, `RawContinuousTask`, `RawProjectTask`.

- `RawSlot`: базовая структура слота, включает поля
    `start`, `end`, и `task`, из которого этот слот был создан.
  Слоты не поделены на кусочки по дням.

В базе данных объекты хранятся в формате аналогично,
за небольшим исключением:
- Вместо поля `id` используется строка в формате ObjectId,
по ключу `_id`.

Даты записываются в формате ISO 8601 (например, `2023-10-01T12:00:00Z`).
У времени может быть часовой пояс, в противном случае
используется UTC.
Промежутки времени (длительность) записываются в формате ISO 8601,
например, `PT1H30M` для 1 часа 30 минут.

## Базовый путь
Все запросы начинаются с префикса `/api/v0`.

## Эндпоинты

### Получить полный состояние пользователя  
GET `/api/v0/user/{user_id}/state`  
Path parameters:
- `user_id` (integer, обязательный): идентификатор пользователя.  
Response 200:
```json
{
  "status": "ok",
  "result": {
    "userId": 123,
    "tasks": [ /* список задач */ ],
    "slots": [ /* список слотов */ ]
  }
}
```

### Список задач пользователя  
GET `/api/v0/user/{user_id}/task`  
Path parameters:
- `user_id` (integer, обязательный)  
Response 200:
```json
{
  "status": "ok",
  "result": [ /* массив задач */ ]
}
```

### Получить задачу по ID  
GET `/api/v0/user/{user_id}/task/{task_id}`  
Path parameters:
- `user_id` (integer)  
- `task_id` (строка, ObjectId)  
Response 200:
```json
{
  "status": "ok",
  "result": { /* объект задачи */ }
}
```
Response 404:
```json
{ "status": "error", "message": "Task not found" }
```

### Создать новую задачу  
POST `/api/v0/user/{user_id}/task`  
Path parameters:
- `user_id` (integer)  
Body (JSON): объект задачи (см. `RawTask` в schema.json).  
Response 201:
```json
{
  "status": "ok",
  "result": { /* созданная задача с полем id */ }
}
```

### Обновить существующую задачу  
PUT `/api/v0/user/{user_id}/task/{task_id}`  
Path parameters:
- `user_id` (integer)  
- `task_id` (строка)  
Body (JSON): обновлённые поля задачи.  
Response 200:
```json
{
  "status": "ok",
  "result": { /* обновлённая задача */ }
}
```

### Удалить задачу  
DELETE `/api/v0/user/{user_id}/task/{task_id}`  
Path parameters:
- `user_id` (integer)  
- `task_id` (строка)  
Response 200:
```json
{ "status": "ok", "message": "Task deleted" }
```

### Список слотов пользователя  
GET `/api/v0/user/{user_id}/slot`  
Path parameters:
- `user_id` (integer)  
Response 200:
```json
{
  "status": "ok",
  "result": [ /* массив слотов */ ]
}
```

### Запрос на расчёт слотов  
POST `/api/v0/user/{user_id}/compute_slot_request`  
Path parameters:
- `user_id` (integer)  
Body (JSON):
```json
{ "sync": true|false }
```
- `sync=true` — ждём ли ответа от планировщика  
Response 201:
```json
{ "status": "ok", "result": null }
```

### WebSocket для реального времени  
GET `/api/v0/user/{user_id}/ws`  
Path parameters:
- `user_id` (integer)  
Сообщения:
- Клиент присылает `"ping"` — сервер шлёт текущее состояние.  
- Сервер шлёт JSON с полями `userId`, `tasks`, `slots` при изменениях.

## Ошибки
Во всех ответах при ошибке возвращается:
```json
{
  "status": "error",
  "message": "Описание ошибки"
}
```


## Solver API

Солвер расписания предоставляет REST API для расчёта
расписания на основе задач пользователя.

### Расчёт расписания
POST `/schedule`

Body (JSON):
```json
[ /* массив задач в формате RawTask */ ],
```

Response 200:
```json
[ /* массив слотов в формате RawSlot */ ]
```

