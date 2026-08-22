/**
 * Каталог университетов Казахстана.
 * Источник данных: публичная страница qapps.kz/universities (баннеры — Yandex Cloud, заявленные на сайте).
 * Описания пересказаны кратко в стиле обзора. Используется для собственной страницы /vuzy.
 */

export type UniRanking =
  | 'Overall'
  | 'Business'
  | 'Law'
  | 'IT'
  | 'Medicine'
  | 'Engineering'
  | 'International Relations'
  | 'Agriculture'

export type UniLanguage = 'English' | 'Russian' | 'Kazakh'

export type University = {
  id: string
  name: string
  city: string
  rank: number
  rankingCategories: UniRanking[]
  type: 'public' | 'private'
  profile: 'medical' | 'non-medical'
  branchStatus: 'local' | 'foreign-branch'
  languages: UniLanguage[]
  description: string
  bannerUrl: string
}

const banner = (slug: string) =>
  `https://storage.yandexcloud.kz/assets/uni_logos/${slug}_banner.jpg`

export const UNIVERSITIES: University[] = [
  {
    id: 'nu',
    name: 'Nazarbayev University',
    city: 'Astana',
    rank: 1,
    rankingCategories: ['Overall', 'Engineering', 'IT', 'Medicine'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['English'],
    description:
      'Ведущий исследовательский университет в Астане (основан в 2010). Английский язык обучения, входит в топ 23% мира по THE 2026 и №1 в Центральной Азии.',
    bannerUrl: banner('nu'),
  },
  {
    id: 'kimep',
    name: 'KIMEP University',
    city: 'Almaty',
    rank: 2,
    rankingCategories: ['Overall', 'Business', 'Law', 'International Relations'],
    type: 'private',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['English'],
    description:
      'Старейший англоязычный университет Центральной Азии (1992). 17 международно аккредитованных программ: бизнес, право, экономика, IR, журналистика.',
    bannerUrl: banner('kimep'),
  },
  {
    id: 'mnu',
    name: 'Maqsut Narikbayev University',
    city: 'Astana',
    rank: 3,
    rankingCategories: ['Overall', 'Law', 'Business'],
    type: 'private',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['English', 'Russian', 'Kazakh'],
    description:
      'Бывший КАЗГЮУ. 5 школ (Law, Economics, Liberal Arts, Journalism, Business), 100+ партнёров за рубежом, 92% трудоустройство.',
    bannerUrl: banner('mnu'),
  },
  {
    id: 'sdu',
    name: 'SDU University',
    city: 'Kaskelen',
    rank: 4,
    rankingCategories: ['Overall', 'Engineering', 'Business'],
    type: 'private',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['English', 'Kazakh'],
    description:
      'Suleyman Demirel University (1996), казахстанско-турецкая инициатива. 60+ программ, 70% — на английском.',
    bannerUrl: banner('suleyman-demirel'),
  },
  {
    id: 'kaznu',
    name: 'Al-Farabi Kazakh National University',
    city: 'Almaty',
    rank: 5,
    rankingCategories: ['Overall', 'Engineering', 'IT', 'International Relations', 'Agriculture'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh', 'English'],
    description:
      'Флагман высшего образования (1934). #166 в QS World 2026 — лучший вуз Казахстана. 16 факультетов, 25 000+ студентов.',
    bannerUrl: banner('al-farabi'),
  },
  {
    id: 'satbayev',
    name: 'Satbayev University',
    city: 'Almaty',
    rank: 6,
    rankingCategories: ['Overall', 'Engineering', 'IT'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh', 'English'],
    description:
      'Старейший технический университет (1934). #1 техвуз Казахстана по IQAA, #331 в QS World 2026, статус National Research University.',
    bannerUrl: banner('satbayev'),
  },
  {
    id: 'kbtu',
    name: 'Kazakh-British Technical University',
    city: 'Almaty',
    rank: 7,
    rankingCategories: ['Overall', 'IT', 'Business', 'Engineering'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['English'],
    description:
      'KBTU (2001) — единственный казахстанский вуз с IT-программами с ABET-аккредитацией. Двойные дипломы с University of London/LSE.',
    bannerUrl: banner('kbtu'),
  },
  {
    id: 'narxoz',
    name: 'Narxoz University',
    city: 'Almaty',
    rank: 8,
    rankingCategories: ['Overall', 'Business', 'Law'],
    type: 'private',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['English', 'Russian', 'Kazakh'],
    description:
      'Частный экономический университет (1963). 4 QS Stars, FIBAA-аккредитация, double-degree с Queen’s, La Rochelle, IIT.',
    bannerUrl: banner('narxoz'),
  },
  {
    id: 'aitu',
    name: 'Astana IT University',
    city: 'Astana',
    rank: 9,
    rankingCategories: ['Overall', 'IT'],
    type: 'private',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['English'],
    description:
      'AITU специализируется на IT и цифровой трансформации. Бакалавриат полностью на английском, партнёры — Huawei, Cisco, Kaspersky.',
    bannerUrl: banner('aitu'),
  },
  {
    id: 'enu',
    name: 'L.N. Gumilyov Eurasian National University',
    city: 'Astana',
    rank: 10,
    rankingCategories: ['Overall', 'International Relations', 'Engineering'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh', 'English'],
    description:
      'Флагманский национальный университет Астаны (1996). #317 в QS WUR 2025, единственный в QS Top-50 Under-50 из Казахстана.',
    bannerUrl: banner('enu'),
  },
  {
    id: 'iitu',
    name: 'International Information Technology University',
    city: 'Almaty',
    rank: 11,
    rankingCategories: ['Overall', 'IT'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['English'],
    description:
      'IITU (2009) основан в партнёрстве с iCarnegie/CMU. Единственный с ASIIN-аккредитацией. Top-3 по Atameken, английский язык обучения.',
    bannerUrl: banner('iitu'),
  },
  {
    id: 'almau',
    name: 'Almaty Management University',
    city: 'Almaty',
    rank: 12,
    rankingCategories: ['Overall', 'Business', 'Law'],
    type: 'private',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['English', 'Russian'],
    description:
      'AlmaU — старейший частный университет страны (1988), первая бизнес-школа в СНГ. Аккредитации AMBA, FIBAA, CEEMAN IQA.',
    bannerUrl: banner('almau'),
  },
  {
    id: 'uib',
    name: 'University of International Business',
    city: 'Almaty',
    rank: 13,
    rankingCategories: ['Overall', 'Business', 'International Relations', 'Medicine'],
    type: 'private',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['English', 'Russian'],
    description:
      'UIB (1992) — лучший частный бизнес-университет страны. Включает English-medium International Medical School (с 2022).',
    bannerUrl: banner('uib'),
  },
  {
    id: 'caspian',
    name: 'Caspian University',
    city: 'Almaty',
    rank: 14,
    rankingCategories: ['Overall'],
    type: 'private',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh'],
    description: 'Частный университет с программами в технологиях, бизнесе и гуманитарных науках.',
    bannerUrl: banner('caspian_uni'),
  },
  {
    id: 'turan',
    name: 'Turan University',
    city: 'Almaty',
    rank: 15,
    rankingCategories: ['Overall', 'Business'],
    type: 'private',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Kazakh', 'Russian', 'English'],
    description:
      'Один из крупнейших частных вузов (1992). 5 факультетов, Apple Digital Lab, BI-центр. Первый казахстанский вуз в Eduroam.',
    bannerUrl: banner('turan-uni'),
  },
  {
    id: 'coventry-kz',
    name: 'Coventry University Kazakhstan',
    city: 'Astana',
    rank: 16,
    rankingCategories: ['Overall', 'Business', 'IT'],
    type: 'private',
    profile: 'non-medical',
    branchStatus: 'foreign-branch',
    languages: ['English'],
    description:
      'Первый британский филиал в Астане (с 2024). UK TEF Gold, 5 QS Stars, программы по бизнесу, CS, IR, экономике, MBA.',
    bannerUrl: banner('coventry-kazakhstan'),
  },
  {
    id: 'cardiff-kz',
    name: 'Cardiff University Kazakhstan',
    city: 'Astana',
    rank: 17,
    rankingCategories: ['Overall'],
    type: 'private',
    profile: 'non-medical',
    branchStatus: 'foreign-branch',
    languages: ['English'],
    description:
      'Первый Russell Group университет в Центральной Азии (Астана, сентябрь 2025). Cardiff #181 в QS World 2025.',
    bannerUrl: banner('cardiff-kazakhstan'),
  },
  {
    id: 'dku',
    name: 'Kazakh-German University',
    city: 'Almaty',
    rank: 18,
    rankingCategories: ['Overall', 'Engineering', 'Business'],
    type: 'private',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['English', 'Russian'],
    description:
      'DKU создан по межправсоглашению РК-ФРГ. 25+ лет, гумбольдтова традиция, double-degree с немецкими вузами.',
    bannerUrl: banner('kazakh-german'),
  },
  {
    id: 'kaznmu',
    name: 'Asfendiyarov Kazakh National Medical University',
    city: 'Almaty',
    rank: 19,
    rankingCategories: ['Overall', 'Medicine'],
    type: 'public',
    profile: 'medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh', 'English'],
    description:
      'KazNMU (1930) — первый медвуз Казахстана, WFME-аккредитация, признан ECFMG (USA). 15 500 студентов, 30+ стран.',
    bannerUrl: banner('asfendiyarov'),
  },
  {
    id: 'amu',
    name: 'Astana Medical University',
    city: 'Astana',
    rank: 20,
    rankingCategories: ['Overall', 'Medicine'],
    type: 'public',
    profile: 'medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh'],
    description:
      'Astana Medical University (1964) — медицина, стоматология, педиатрия, фармация. Современные симуляционные центры.',
    bannerUrl: banner('amu'),
  },
  {
    id: 'kmu',
    name: 'Karaganda Medical University',
    city: 'Karaganda',
    rank: 21,
    rankingCategories: ['Overall', 'Medicine'],
    type: 'public',
    profile: 'medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh'],
    description: 'Ведущий медицинский университет Центрального Казахстана.',
    bannerUrl: banner('kmu'),
  },
  {
    id: 'abai',
    name: 'Abai Kazakh National Pedagogical University',
    city: 'Almaty',
    rank: 22,
    rankingCategories: ['Overall'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh', 'English'],
    description:
      'Старейший педвуз страны (1928). #=628 в QS World 2026, #=41 по Education & Training, Сорбонна-Казахстан, филиал Université de Lorraine.',
    bannerUrl: banner('abai'),
  },
  {
    id: 'aupet',
    name: 'Almaty University of Power Engineering and Telecommunications',
    city: 'Almaty',
    rank: 23,
    rankingCategories: ['Overall', 'Engineering', 'IT'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh'],
    description:
      'Energo University (1975). Лидер в энергетике, телекоме, IT и аэрокосмосе. Double-degree с Anhalt и NCEPU.',
    bannerUrl: banner('aues'),
  },
  {
    id: 'buketov',
    name: 'Buketov Karaganda University',
    city: 'Karaganda',
    rank: 24,
    rankingCategories: ['Overall'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh'],
    description: 'Крупный многопрофильный университет Центрального Казахстана.',
    bannerUrl: banner('buketov'),
  },
  {
    id: 'yessenov',
    name: 'Yessenov University',
    city: 'Aktau',
    rank: 25,
    rankingCategories: ['Overall', 'Engineering'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh', 'English'],
    description:
      'Caspian University of Technology and Engineering (1976). Морская академия, German-Kazakh Institute. QS World 2026: 1201–1400.',
    bannerUrl: banner('yessenov'),
  },
  {
    id: 'auezov',
    name: 'M. Auezov South Kazakhstan University',
    city: 'Shymkent',
    rank: 26,
    rankingCategories: ['Overall', 'Engineering'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh'],
    description:
      'Крупнейший по числу студентов вуз Казахстана (1943). 25 000+ студентов. QS World 2026: #731–740. ASIIN-аккредитация.',
    bannerUrl: banner('auezov-university'),
  },
  {
    id: 'shakarim',
    name: 'Shakarim University',
    city: 'Semey',
    rank: 27,
    rankingCategories: ['Overall'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh'],
    description: 'Региональный университет в Семее с разнообразными академическими программами.',
    bannerUrl: banner('shakarim'),
  },
  {
    id: 'yassawi',
    name: 'Khoja Akhmet Yassawi International Kazakh-Turkish University',
    city: 'Turkestan',
    rank: 28,
    rankingCategories: ['Overall', 'International Relations'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Kazakh', 'Russian', 'English'],
    description: 'Международный казахско-турецкий университет в Туркестане. Тюркский академический хаб.',
    bannerUrl: banner('khoja-akhmet'),
  },
  {
    id: 'kaisar',
    name: 'Kazakh Agro Technical Research University',
    city: 'Astana',
    rank: 29,
    rankingCategories: ['Overall', 'Agriculture'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh', 'English'],
    description: 'Ведущий агротехнический исследовательский университет страны (S. Seifullin).',
    bannerUrl: banner('seifullin'),
  },
  {
    id: 'kaznau',
    name: 'Kazakh National Agrarian Research University',
    city: 'Almaty',
    rank: 30,
    rankingCategories: ['Overall', 'Agriculture'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh', 'English'],
    description: 'Национальный аграрный исследовательский университет Казахстана.',
    bannerUrl: banner('kaznau'),
  },
]

export const ALL_REGIONS = Array.from(new Set(UNIVERSITIES.map((u) => u.city))).sort((a, b) =>
  a.localeCompare(b),
)

export const ALL_RANKING_CATEGORIES: UniRanking[] = [
  'Overall',
  'Business',
  'Law',
  'IT',
  'Medicine',
  'Engineering',
  'International Relations',
  'Agriculture',
]

export const ALL_LANGUAGES: UniLanguage[] = ['English', 'Russian', 'Kazakh']
