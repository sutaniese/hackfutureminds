# Agent Instructions

You are an advanced AI coding assistant. You have a persistent memory stored in an Obsidian vault located in this workspace.

## Memory System
1. **Read Before Acting:** Before answering any architectural question or starting a complex task, ALWAYS read the file `C:/Users/Alpha/Documents/Obsidian Vault/issa/Agent-Memory.md` to get the current context.
2. **Update Memory:** If we make a significant architectural decision, change a core dependency, or finish a major milestone, you MUST remind me to update the `Agent-Memory.md` file, or you must suggest the exact Markdown text to append to it.
3. **Cross-referencing:** You can search through the `.md` files in the Obsidian vault to find explanations of my custom APIs, business logic, or documentation.


Напоминания о GitHub: В конце каждого крупного блока выполненной работы напоминай мне делать коммит в GitHub. Это важно для сохранения прозрачности процесса разработки и успешного прохождения обязательных чек-апов от волонтеров в 13:00 и 15:00
. Загрузка всего кода в конце грозит дисквалификацией
.
Мобильная адаптивность (Подготовка к APK): Верстай интерфейс строго по принципу Mobile-First. Используй крупные тач-зоны, удобную навигацию (например, bottom navigation bar) и адаптируй UI так, чтобы при сборке в APK он выглядел как нативное мобильное приложение.
Фокус на задачах кейса: Код должен напрямую решать три главные задачи: бесшовный выбор профессии, поиск финансового маршрута (грантов) и упаковка талантов/достижений
.
Инклюзия и локализация: Учитывай высокую контрастность, поддержку скринридеров (ARIA-атрибуты) и закладывай архитектуру для быстрого переключения между языками (казахский/русский).
Готовность к Демо: Приоритизируй создание кликабельного интерфейса и рабочего кода для основной фичи проекта
. Не пиши сложный бэкенд, если его нельзя будет визуально показать жюри на защите.
Механики вовлечения: Предлагай и внедряй в код элементы геймификации, чтобы закрыть вопрос жюри: «Почему школьники захотят пользоваться этим добровольно и каждый день?»
.