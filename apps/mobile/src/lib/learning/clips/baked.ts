import type { LearningClip } from "./types";

export const BAKED_CLIPS: LearningClip[] = [
  {
    id: "clip-math-quadratic",
    topicId: "math-quadratic",
    title: "Квадратные уравнения за минуту",
    locale: "ru",
    baked: true,
    quizTaskId: "math-quadratic-1",
    beats: [
      { kind: "hook", title: "Крюк", text: "x² − 6x + 9 = 0. Сколько корней? Если ответишь «два» — ловушка дискриминанта уже сработала.", seconds: 8 },
      { kind: "idea", title: "Идея", text: "ax² + bx + c = 0. Дискриминант D = b² − 4ac: больше нуля — два корня, ноль — один, меньше — нет действительных.", seconds: 14 },
      { kind: "example", title: "Пример", text: "Здесь D = 36 − 36 = 0, корень один: x = 3. По Виете сумма корней = −b/a, произведение = c/a.", seconds: 14 },
      { kind: "check", title: "Проверка", text: "Сейчас короткое задание из банка. Ошибка — следующий клип снова про дискриминант.", seconds: 10 },
    ],
  },
  {
    id: "clip-phys-newton",
    topicId: "phys-newton",
    title: "Законы Ньютона за минуту",
    locale: "ru",
    baked: true,
    quizTaskId: "phys-newton-1",
    beats: [
      { kind: "hook", title: "Крюк", text: "Тело едет равномерно. Какие силы? Если хочется сказать «тяга больше трения» — это уже не равномерно.", seconds: 8 },
      { kind: "idea", title: "Идея", text: "Первый закон: равнодействующая ноль. Второй: F = ma. Третий: действие и противодействие на РАЗНЫЕ тела.", seconds: 14 },
      { kind: "example", title: "Пример", text: "12 Н дают ускорение 3 м/с² → масса 4 кг. Трение μmg вычитаем из тяги, потом a = F/m.", seconds: 14 },
      { kind: "check", title: "Проверка", text: "Одно задание на второй закон. Ошибка — повторим F = ma.", seconds: 10 },
    ],
  },
  {
    id: "clip-inf-python",
    topicId: "inf-python",
    title: "Python за минуту",
    locale: "ru",
    baked: true,
    quizTaskId: "inf-python-2",
    beats: [
      { kind: "hook", title: "Крюк", text: "Как узнать длину списка? Если тянет написать a.length — это уже JavaScript, не Python.", seconds: 8 },
      { kind: "idea", title: "Идея", text: "len(a) считает элементы. Индекс с нуля, a[-1] — последний. // делит нацело, % даёт остаток.", seconds: 14 },
      { kind: "example", title: "Пример", text: "a = [1, 2, 3]; a[-1] это 3. print(7 // 2) это 3. Чётные до 10: 2+4+6+8+10 = 30.", seconds: 14 },
      { kind: "check", title: "Проверка", text: "Задание из банка по спискам. Ошибка — следующий клип снова про len и индексы.", seconds: 10 },
    ],
  },
  {
    id: "clip-math-quadratic-kk",
    topicId: "math-quadratic",
    title: "Квадрат теңдеулер — бір минут",
    locale: "kk",
    baked: true,
    quizTaskId: "math-quadratic-1",
    beats: [
      { kind: "hook", title: "Неге", text: "x² − 6x + 9 = 0. Неше түбір? «Екеу» десең — дискриминант тұзағы жұмыс істеді.", seconds: 8 },
      { kind: "idea", title: "Идея", text: "ax² + bx + c = 0. D = b² − 4ac: D>0 екі түбір, D=0 бір, D<0 нақты түбір жоқ.", seconds: 14 },
      { kind: "example", title: "Мысал", text: "Мұнда D = 36 − 36 = 0, түбір жалғыз: x = 3. Виет: қосынды −b/a, көбейтінді c/a.", seconds: 14 },
      { kind: "check", title: "Тексеру", text: "Банктен бір тапсырма. Қате болса — дискриминантты қайталаймыз.", seconds: 10 },
    ],
  },
];
