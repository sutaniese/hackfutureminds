import type { Locale } from "./locales";

const TR = (ru: string, en: string, kk: string) => ({ ru, en, kk });

export const MOBILE_EXTRA: Record<string, Record<Locale, string>> = {
  "parent.kicker": TR("Родители", "Parents", "Ата-аналар"),
  "parent.title": TR("Кабинет родителя", "Parent hub", "Ата-ана кабинеті"),
  "parent.desc": TR(
    "Сводка по ребёнку: прогресс, слабые места и простой отчёт. Без выдуманных учеников.",
    "A child summary: progress, weak spots and a simple report. No invented students.",
    "Бала жиынтығы: прогресс, әлсіз тұстар және қарапайым есеп. Жалған оқушы жоқ.",
  ),
  "parent.empty": TR(
    "Выберите ученика по ID — данные появятся здесь.",
    "Pick a student by ID — their data will appear here.",
    "Оқушыны ID бойынша таңдаңыз — деректер осында пайда болады.",
  ),
  "parent.noApi": TR(
    "Список детей пуст. Если учитель ещё не добавил ребёнка или API недоступен, здесь не будет фейковых 524 учеников.",
    "The child list is empty. If a teacher has not added the child or the API is unavailable, we will not invent 524 students.",
    "Балалар тізімі бос. Мұғалім қоспаса немесе API жоқ болса, 524 жалған оқушы болмайды.",
  ),
  "parent.readonly": TR("Только просмотр", "Read only", "Тек қарау"),
  "parent.profile": TR("Профиль ученика", "Student profile", "Оқушы профилі"),
  "parent.progress": TR("Прогресс", "Progress", "Прогресс"),
  "parent.report": TR("Краткий отчёт", "Short report", "Қысқа есеп"),
  "parent.noChild": TR("Нет привязанного ребёнка", "No linked child", "Байланысқан бала жоқ"),
  "uni.kicker": TR("Университеты", "Universities", "ЖОО"),
  "uni.title": TR("Каталог вузов", "University catalog", "ЖОО каталогы"),
  "uni.empty": TR("Каталог откроется, когда API ответит. Пока список пуст.", "The catalog appears when the API answers. It is empty for now.", "API жауап бергенде каталог ашылады. Әзірге бос."),
  "portfolio.body": TR(
    "Загрузите достижения на сайте teñ. — здесь краткая карточка портфолио.",
    "Upload achievements on the teñ. website — this is a short portfolio card.",
    "Жетістіктерді teñ. сайтына жүктеңіз — мұнда қысқа портфолио картасы.",
  ),
  "grants.empty": TR("Грантов по этому фильтру нет.", "No grants for this filter.", "Осы сүзгіде грант жоқ."),
  "clips.tts": TR("Озвучка", "Speak", "Дауыс"),
  "home.role.student": TR("Ученик — диагностика, план, класс", "Student — diagnostic, plan, class", "Оқушы — диагностика, жоспар, сынып"),
  "home.role.parent": TR("Родитель — прогресс ребёнка", "Parent — child progress", "Ата-ана — бала прогресі"),
  "home.role.teacher": TR("Учитель — класс и живая доска", "Teacher — class and live board", "Мұғалім — сынып және тірі тақта"),
  "auth.localMode": TR(
    "Supabase не задан — аккаунт хранится на этом телефоне. Чтобы вступить в живой класс учителя, добавьте EXPO_PUBLIC_SUPABASE_URL и anon key.",
    "Supabase is not set — the account stays on this phone. To join a live teacher class, add EXPO_PUBLIC_SUPABASE_URL and the anon key.",
    "Supabase берілмеген — аккаунт осы телефонда. Тірі сыныпқа қосылу үшін EXPO_PUBLIC_SUPABASE_URL мен anon key қосыңыз.",
  ),
  "nav.clips": TR("Клипы", "Clips", "Клиптер"),
  "contrast.on": TR("Контраст вкл.", "Contrast on", "Контраст қосулы"),
  "contrast.off": TR("Контраст", "Contrast", "Контраст"),
};
