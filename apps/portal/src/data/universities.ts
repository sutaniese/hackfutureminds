/**
 * Каталог университетов Казахстана.
 * Источник публичных полей: страница qapps.kz/universities (баннеры — Yandex Cloud).
 * Описания и расширенная информация — пересказ для собственной страницы /vuzy.
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

export type StudyProgram = {
  titleEn: string
  titleRu: string
  durationYears: number
  language: UniLanguage
}

export type Intake = {
  season: 'Fall' | 'Spring'
  type: 'Regular Admission' | 'Early Admission' | 'Rolling'
  deadline: string
  note?: string
}

export type Scholarship = {
  title: string
  description: string
  note?: string
}

export type RequiredDoc = {
  titleKz: string
  titleEn: string
  required: boolean
  noteKz: string
  noteEn: string
}

export type AdmissionRequirements = {
  languageRequirement: string
  scoringSystem: string
  requiredDocs: RequiredDoc[]
  note?: string
}

export type ContactInfo = {
  address?: string
  phone?: string
  email?: string
}

export type University = {
  id: string
  name: string
  nameEn: string
  nameRu: string
  city: string
  rank: number
  rankingCategories: UniRanking[]
  type: 'public' | 'private'
  profile: 'medical' | 'non-medical'
  branchStatus: 'local' | 'foreign-branch'
  languages: UniLanguage[]
  description: string
  bannerUrl: string
  website?: string
  programs?: StudyProgram[]
  totalPrograms?: number
  intakes?: Intake[]
  scholarships?: Scholarship[]
  requirements?: AdmissionRequirements
  contact?: ContactInfo
}

const banner = (slug: string) =>
  `https://storage.yandexcloud.kz/assets/uni_logos/${slug}_banner.jpg`

const KZ_DOCS: RequiredDoc[] = [
  {
    titleKz: 'Жеке куәлік құжаты (ID/паспорт)',
    titleEn: 'Identity Document (ID/Passport)',
    required: true,
    noteKz: 'Жарамды жеке басын куәландыратын құжат',
    noteEn: 'Valid passport or national ID',
  },
  {
    titleKz: '3x4 фото',
    titleEn: 'Photo 3x4',
    required: true,
    noteKz: '3x4 см паспорттық үлгідегі фотосурет',
    noteEn: '3x4 passport-style photo',
  },
  {
    titleKz: 'Медициналық анықтама',
    titleEn: 'Medical Certificate',
    required: true,
    noteKz: 'Оқуға қабылдау үшін қажет медициналық анықтама',
    noteEn: 'Medical certificate (Form 086/у)',
  },
  {
    titleKz: 'Диплом / Аттестат',
    titleEn: 'Diploma / Certificate',
    required: true,
    noteKz: 'Жалпы орта білім туралы аттестат немесе баламасы',
    noteEn: 'Secondary school diploma or equivalent',
  },
  {
    titleKz: 'Академиялық транскрипт',
    titleEn: 'Academic Transcript',
    required: true,
    noteKz: 'Бағалары бар ресми академиялық транскрипт',
    noteEn: 'Official academic transcript with grades',
  },
  {
    titleKz: 'ҰБТ / SAT нәтижесі',
    titleEn: 'UNT / SAT Score',
    required: true,
    noteKz: 'Бағдарлама талаптарына сәйкес минималды балл',
    noteEn: 'Minimum score per program requirements',
  },
]

function defaultRequirements(): AdmissionRequirements {
  return {
    languageRequirement: 'IELTS 6.0 / TOEFL iBT 70 / SAT or program-specific',
    scoringSystem: 'UNT / SAT',
    requiredDocs: KZ_DOCS,
    note:
      'Талаптар бағдарламаға байланысты өзгеруі мүмкін. Толық ақпарат алу үшін қабылдау комиссиясымен байланысыңыз.',
  }
}

function defaultIntakes(): Intake[] {
  return [
    {
      season: 'Fall',
      type: 'Regular Admission',
      deadline: '2026-07-31',
      note: 'Application deadline: July 31, 2026',
    },
  ]
}

function defaultScholarships(): Scholarship[] {
  return [
    {
      title: 'Local scholarship for residents',
      description: 'Local scholarship available for residents of Kazakhstan',
      note: 'Contact admissions for details',
    },
  ]
}

export const UNIVERSITIES: University[] = [
  {
    id: 'nu',
    name: 'Nazarbayev University',
    nameEn: 'Nazarbayev University',
    nameRu: 'Назарбаев Университет',
    city: 'Astana',
    rank: 1,
    rankingCategories: ['Overall', 'Engineering', 'IT', 'Medicine'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['English'],
    description:
      'Nazarbayev University (NU) is a leading research university in Astana, Kazakhstan, founded in 2010. NU embodies the best global research and educational practices, ranking among the top 23% of universities worldwide (Times Higher Education 2026) and first in the Caucasus and Central Asia region.',
    bannerUrl: banner('nu'),
    website: 'https://nu.edu.kz',
    totalPrograms: 23,
    programs: [
      {
        titleEn: 'Bachelor of Science in Mining and Minerals Engineering',
        titleRu: 'Горное и минеральное дело',
        durationYears: 4,
        language: 'English',
      },
      {
        titleEn: 'Bachelor of Business Administration in Eurasian Business Joint Degree with HKUST',
        titleRu: 'Бакалавр делового администрирования в евразийском бизнесе',
        durationYears: 4,
        language: 'English',
      },
      {
        titleEn: 'Bachelor of Science in Geology',
        titleRu: 'Геология',
        durationYears: 4,
        language: 'English',
      },
      {
        titleEn: 'Bachelor of Science in Computer Science',
        titleRu: 'Информатика',
        durationYears: 4,
        language: 'English',
      },
      {
        titleEn: 'Bachelor of Science in Chemical and Materials Engineering',
        titleRu: 'Химическая и материаловедческая инженерия',
        durationYears: 4,
        language: 'English',
      },
      {
        titleEn: 'Bachelor of Science in Electrical and Computer Engineering',
        titleRu: 'Электротехника и компьютерная инженерия',
        durationYears: 4,
        language: 'English',
      },
      {
        titleEn: 'Bachelor of Science in Mechanical and Aerospace Engineering',
        titleRu: 'Механическая и аэрокосмическая инженерия',
        durationYears: 4,
        language: 'English',
      },
      {
        titleEn: 'Bachelor of Science in Civil and Environmental Engineering',
        titleRu: 'Гражданская и экологическая инженерия',
        durationYears: 4,
        language: 'English',
      },
      {
        titleEn: 'Bachelor of Arts in Economics',
        titleRu: 'Экономика',
        durationYears: 4,
        language: 'English',
      },
      {
        titleEn: 'Bachelor of Arts in Political Science and International Relations',
        titleRu: 'Политология и международные отношения',
        durationYears: 4,
        language: 'English',
      },
      {
        titleEn: 'Bachelor of Arts in History',
        titleRu: 'История',
        durationYears: 4,
        language: 'English',
      },
      {
        titleEn: 'Bachelor of Arts in World Languages, Literature and Culture',
        titleRu: 'Мировые языки, литература и культура',
        durationYears: 4,
        language: 'English',
      },
      {
        titleEn: 'Bachelor of Science in Mathematics',
        titleRu: 'Математика',
        durationYears: 4,
        language: 'English',
      },
      {
        titleEn: 'Bachelor of Science in Physics',
        titleRu: 'Физика',
        durationYears: 4,
        language: 'English',
      },
      {
        titleEn: 'Bachelor of Science in Biological Sciences',
        titleRu: 'Биологические науки',
        durationYears: 4,
        language: 'English',
      },
      {
        titleEn: 'Bachelor of Science in Robotics and Mechatronics',
        titleRu: 'Робототехника и мехатроника',
        durationYears: 4,
        language: 'English',
      },
      {
        titleEn: 'Bachelor of Arts in Anthropology',
        titleRu: 'Антропология',
        durationYears: 4,
        language: 'English',
      },
      {
        titleEn: 'Bachelor of Arts in Sociology',
        titleRu: 'Социология',
        durationYears: 4,
        language: 'English',
      },
      {
        titleEn: 'Bachelor of Arts in Philosophy',
        titleRu: 'Философия',
        durationYears: 4,
        language: 'English',
      },
      {
        titleEn: 'Bachelor of Arts in Kazakh Language and Turkic Studies',
        titleRu: 'Казахский язык и тюркология',
        durationYears: 4,
        language: 'English',
      },
      {
        titleEn: 'Bachelor of Science in Petroleum Engineering',
        titleRu: 'Нефтяная инженерия',
        durationYears: 4,
        language: 'English',
      },
      {
        titleEn: 'Bachelor of Public Health (BPH)',
        titleRu: 'Бакалавр общественного здравоохранения',
        durationYears: 4,
        language: 'English',
      },
      {
        titleEn: 'Foundation Year Program',
        titleRu: 'Подготовительный год',
        durationYears: 1,
        language: 'English',
      },
    ],
    intakes: [
      {
        season: 'Fall',
        type: 'Regular Admission',
        deadline: '2026-07-31',
        note: 'Application deadline: July 31, 2026',
      },
    ],
    scholarships: [
      {
        title: 'Local scholarship for residents',
        description: 'Local scholarship available for residents of Kazakhstan',
        note: 'Contact admissions for details',
      },
      {
        title: 'NU Merit Scholarship',
        description: 'Full or partial tuition scholarship for top applicants',
        note: 'Awarded based on SAT/UNT and overall application',
      },
    ],
    requirements: {
      languageRequirement: 'IELTS 6.0 / TOEFL iBT 75 / SAT EBRW',
      scoringSystem: 'UNT / SAT',
      requiredDocs: KZ_DOCS,
      note:
        'Талаптар бағдарламаға байланысты өзгеруі мүмкін. Толық ақпарат алу үшін қабылдау комиссиясымен байланысыңыз.',
    },
    contact: {
      address: 'Kabanbay Batyr Ave 53, Astana 010000',
      email: 'admissions@nu.edu.kz',
      phone: '+7 (7172) 70 65 00',
    },
  },
  {
    id: 'kimep',
    name: 'KIMEP University',
    nameEn: 'KIMEP University',
    nameRu: 'KIMEP Университет',
    city: 'Almaty',
    rank: 2,
    rankingCategories: ['Overall', 'Business', 'Law', 'International Relations'],
    type: 'private',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['English'],
    description:
      "KIMEP University is Central Asia's leading English-language university, founded in 1992 in Almaty, Kazakhstan. Offering 17 internationally accredited programs across business, law, economics, international relations, and journalism, KIMEP prepares students for careers on a global scale.",
    bannerUrl: banner('kimep'),
    website: 'https://kimep.kz',
  },
  {
    id: 'mnu',
    name: 'Maqsut Narikbayev University',
    nameEn: 'Maqsut Narikbayev University',
    nameRu: 'Maqsut Narikbayev University (бывший КАЗГЮУ)',
    city: 'Astana',
    rank: 3,
    rankingCategories: ['Overall', 'Law', 'Business'],
    type: 'private',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['English', 'Russian', 'Kazakh'],
    description:
      "Maqsut Narikbayev University (MNU), formerly KAZGUU, is one of Kazakhstan's leading private higher education institutions, founded in 1994. 5 schools (Law, Economics, Liberal Arts, Journalism, Business), 100+ international partners, 92% graduate employment.",
    bannerUrl: banner('mnu'),
    website: 'https://mnu.kz',
  },
  {
    id: 'sdu',
    name: 'SDU University',
    nameEn: 'SDU University',
    nameRu: 'Суйлеймана Демиреля Университет',
    city: 'Kaskelen',
    rank: 4,
    rankingCategories: ['Overall', 'Engineering', 'Business'],
    type: 'private',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['English', 'Kazakh'],
    description:
      'Suleyman Demirel University (SDU) is a leading private university founded in 1996 near Almaty through a joint Kazakh-Turkish initiative. 60+ programs across engineering, business, law and humanities, 70% taught in English.',
    bannerUrl: banner('suleyman-demirel'),
    website: 'https://sdu.edu.kz',
  },
  {
    id: 'kaznu',
    name: 'Al-Farabi Kazakh National University',
    nameEn: 'Al-Farabi Kazakh National University',
    nameRu: 'Казахский национальный университет имени аль-Фараби',
    city: 'Almaty',
    rank: 5,
    rankingCategories: ['Overall', 'Engineering', 'IT', 'International Relations', 'Agriculture'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh', 'English'],
    description:
      "Kazakhstan's flagship higher education institution (1934). #166 in QS World 2026 — the highest-ranked university in Kazakhstan. 16 faculties, 25,000+ students from 50+ countries.",
    bannerUrl: banner('al-farabi'),
    website: 'https://www.kaznu.kz',
  },
  {
    id: 'satbayev',
    name: 'Satbayev University',
    nameEn: 'Satbayev University',
    nameRu: 'Сатпаев Университет',
    city: 'Almaty',
    rank: 6,
    rankingCategories: ['Overall', 'Engineering', 'IT'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh', 'English'],
    description:
      "Kazakhstan's oldest technical university (1934). #1 technical university per IQAA, #331 in QS World 2026, holds National Research University status.",
    bannerUrl: banner('satbayev'),
    website: 'https://satbayev.university',
  },
  {
    id: 'kbtu',
    name: 'Kazakh-British Technical University',
    nameEn: 'Kazakh-British Technical University',
    nameRu: 'Казахстанско-Британский Технический Университет',
    city: 'Almaty',
    rank: 7,
    rankingCategories: ['Overall', 'IT', 'Business', 'Engineering'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['English'],
    description:
      'KBTU (2001) — the first and only Kazakhstani university with IT programs internationally accredited by ABET. Double-degrees with University of London (LSE).',
    bannerUrl: banner('kbtu'),
    website: 'https://kbtu.edu.kz',
  },
  {
    id: 'narxoz',
    name: 'Narxoz University',
    nameEn: 'Narxoz University',
    nameRu: 'Нархоз Университет',
    city: 'Almaty',
    rank: 8,
    rankingCategories: ['Overall', 'Business', 'Law'],
    type: 'private',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['English', 'Russian', 'Kazakh'],
    description:
      "Leading private economics university (1963). 4 QS Stars overall, FIBAA accreditation, double-degrees with Queen's, La Rochelle, IIT.",
    bannerUrl: banner('narxoz'),
    website: 'https://narxoz.kz',
  },
  {
    id: 'aitu',
    name: 'Astana IT University',
    nameEn: 'Astana IT University',
    nameRu: 'Astana IT University',
    city: 'Astana',
    rank: 9,
    rankingCategories: ['Overall', 'IT'],
    type: 'private',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['English'],
    description:
      'AITU is a leading Central Asian institution specializing in IT and digital transformation. Bachelor’s programs taught fully in English, partners include Huawei, Cisco, Kaspersky.',
    bannerUrl: banner('aitu'),
    website: 'https://astanait.edu.kz',
  },
  {
    id: 'enu',
    name: 'L.N. Gumilyov Eurasian National University',
    nameEn: 'L.N. Gumilyov Eurasian National University',
    nameRu: 'Евразийский национальный университет имени Л. Н. Гумилёва',
    city: 'Astana',
    rank: 10,
    rankingCategories: ['Overall', 'International Relations', 'Engineering'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh', 'English'],
    description:
      "Kazakhstan's flagship national university in Astana (1996). #317 in QS WUR 2025, the only young Kazakhstani university in QS Top 50 Under 50.",
    bannerUrl: banner('enu'),
    website: 'https://www.enu.kz',
  },
  {
    id: 'iitu',
    name: 'International Information Technology University',
    nameEn: 'International Information Technology University',
    nameRu: 'Международный университет информационных технологий',
    city: 'Almaty',
    rank: 11,
    rankingCategories: ['Overall', 'IT'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['English'],
    description:
      'IITU (2009) was founded in collaboration with iCarnegie/CMU. The only ASIIN-accredited university in Kazakhstan; Atameken Top-3, fully English-medium.',
    bannerUrl: banner('iitu'),
    website: 'https://iitu.edu.kz',
  },
  {
    id: 'almau',
    name: 'Almaty Management University',
    nameEn: 'Almaty Management University',
    nameRu: 'Алматы Менеджмент Университет',
    city: 'Almaty',
    rank: 12,
    rankingCategories: ['Overall', 'Business', 'Law'],
    type: 'private',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['English', 'Russian'],
    description:
      "AlmaU is Kazakhstan's oldest private university (1988) and the first business school in the CIS. Holds AMBA, FIBAA, CEEMAN IQA accreditations.",
    bannerUrl: banner('almau'),
    website: 'https://almau.edu.kz',
  },
  {
    id: 'uib',
    name: 'University of International Business',
    nameEn: 'University of International Business',
    nameRu: 'Университет международного бизнеса',
    city: 'Almaty',
    rank: 13,
    rankingCategories: ['Overall', 'Business', 'International Relations', 'Medicine'],
    type: 'private',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['English', 'Russian'],
    description:
      'UIB (1992) — the leading private business university of Central Asia. Includes the English-medium International Medical School (since 2022).',
    bannerUrl: banner('uib'),
    website: 'https://uib.kz',
  },
  {
    id: 'caspian',
    name: 'Caspian University',
    nameEn: 'Caspian University',
    nameRu: 'Каспийский Университет',
    city: 'Almaty',
    rank: 14,
    rankingCategories: ['Overall'],
    type: 'private',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh'],
    description: 'Private university offering diverse programs in technology, business, and humanities.',
    bannerUrl: banner('caspian_uni'),
    website: 'https://caspian.edu.kz',
  },
  {
    id: 'turan',
    name: 'Turan University',
    nameEn: 'Turan University',
    nameRu: 'Туран Университет',
    city: 'Almaty',
    rank: 15,
    rankingCategories: ['Overall', 'Business'],
    type: 'private',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Kazakh', 'Russian', 'English'],
    description:
      'One of the first and largest private universities in Kazakhstan (1992). 5 faculties, Apple Digital Lab, BI-Center. The first Kazakhstani university to join Eduroam.',
    bannerUrl: banner('turan-uni'),
    website: 'https://turan-edu.kz',
  },
  {
    id: 'coventry-kz',
    name: 'Coventry University Kazakhstan',
    nameEn: 'Coventry University Kazakhstan',
    nameRu: 'Coventry University Kazakhstan',
    city: 'Astana',
    rank: 16,
    rankingCategories: ['Overall', 'Business', 'IT'],
    type: 'private',
    profile: 'non-medical',
    branchStatus: 'foreign-branch',
    languages: ['English'],
    description:
      'The first British university branch campus in Astana (since 2024). UK TEF Gold rating, 5 QS Stars, programs in Business, CS, IR, Economics, MBA.',
    bannerUrl: banner('coventry-kazakhstan'),
    website: 'https://www.coventry.ac.uk',
  },
  {
    id: 'cardiff-kz',
    name: 'Cardiff University Kazakhstan',
    nameEn: 'Cardiff University Kazakhstan',
    nameRu: 'Cardiff University Kazakhstan',
    city: 'Astana',
    rank: 17,
    rankingCategories: ['Overall'],
    type: 'private',
    profile: 'non-medical',
    branchStatus: 'foreign-branch',
    languages: ['English'],
    description:
      'The first Russell Group university campus in Central Asia (Astana, September 2025). Cardiff #181 in QS World 2025.',
    bannerUrl: banner('cardiff-kazakhstan'),
    website: 'https://www.cardiff.ac.uk',
  },
  {
    id: 'dku',
    name: 'Kazakh-German University',
    nameEn: 'Kazakh-German University (DKU)',
    nameRu: 'Казахстанско-Немецкий Университет',
    city: 'Almaty',
    rank: 18,
    rankingCategories: ['Overall', 'Engineering', 'Business'],
    type: 'private',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['English', 'Russian'],
    description:
      'DKU was established under a bilateral RK-FRG intergovernmental agreement. 25+ years, Humboldt tradition, double-degree programs with German universities.',
    bannerUrl: banner('kazakh-german'),
    website: 'https://www.dku.kz',
  },
  {
    id: 'kaznmu',
    name: 'Asfendiyarov Kazakh National Medical University',
    nameEn: 'Asfendiyarov Kazakh National Medical University',
    nameRu: 'Казахский Национальный Медицинский Университет имени С.Д. Асфендиярова',
    city: 'Almaty',
    rank: 19,
    rankingCategories: ['Overall', 'Medicine'],
    type: 'public',
    profile: 'medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh', 'English'],
    description:
      "KazNMU (1930) — Kazakhstan's leading medical institution, WFME-accredited and recognised by WHO and ECFMG (USA). 15,500 students from 30+ countries.",
    bannerUrl: banner('asfendiyarov'),
    website: 'https://kaznmu.edu.kz',
  },
  {
    id: 'amu',
    name: 'Astana Medical University',
    nameEn: 'Astana Medical University',
    nameRu: 'Медицинский университет Астана',
    city: 'Astana',
    rank: 20,
    rankingCategories: ['Overall', 'Medicine'],
    type: 'public',
    profile: 'medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh'],
    description:
      'Astana Medical University (1964) — medicine, dentistry, pediatrics, pharmacy. Modern simulation centers and clinical bases.',
    bannerUrl: banner('amu'),
    website: 'https://amu.kz',
  },
  {
    id: 'kmu',
    name: 'Karaganda Medical University',
    nameEn: 'Karaganda Medical University',
    nameRu: 'Карагандинский медицинский университет',
    city: 'Karaganda',
    rank: 21,
    rankingCategories: ['Overall', 'Medicine'],
    type: 'public',
    profile: 'medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh'],
    description: 'Leading medical university in Central Kazakhstan.',
    bannerUrl: banner('kmu'),
    website: 'https://qmu.edu.kz',
  },
  {
    id: 'abai',
    name: 'Abai Kazakh National Pedagogical University',
    nameEn: 'Abai Kazakh National Pedagogical University',
    nameRu: 'Казахский национальный педагогический университет имени Абая',
    city: 'Almaty',
    rank: 22,
    rankingCategories: ['Overall'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh', 'English'],
    description:
      "Kazakhstan's oldest pedagogical university (1928). #=628 in QS World 2026, #=41 in Education & Training, hosts Sorbonne-Kazakhstan and Université de Lorraine branch.",
    bannerUrl: banner('abai'),
    website: 'https://abaiuniversity.edu.kz',
  },
  {
    id: 'aupet',
    name: 'Almaty University of Power Engineering and Telecommunications',
    nameEn: 'Almaty University of Power Engineering and Telecommunications',
    nameRu: 'Алматинский университет энергетики и связи',
    city: 'Almaty',
    rank: 23,
    rankingCategories: ['Overall', 'Engineering', 'IT'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh'],
    description:
      'Energo University (1975). Leader in energy, telecom, IT and aerospace. Double-degree with Anhalt UAS and NCEPU.',
    bannerUrl: banner('aues'),
    website: 'https://aues.kz',
  },
  {
    id: 'buketov',
    name: 'Buketov Karaganda University',
    nameEn: 'Buketov Karaganda University',
    nameRu: 'Карагандинский университет имени Е.А. Букетова',
    city: 'Karaganda',
    rank: 24,
    rankingCategories: ['Overall'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh'],
    description: 'Major multidisciplinary university in Central Kazakhstan.',
    bannerUrl: banner('buketov'),
    website: 'https://buketov.edu.kz',
  },
  {
    id: 'yessenov',
    name: 'Yessenov University',
    nameEn: 'Yessenov University',
    nameRu: 'Каспийский университет технологий и инжиниринга имени Ш. Есенова',
    city: 'Aktau',
    rank: 25,
    rankingCategories: ['Overall', 'Engineering'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh', 'English'],
    description:
      'Caspian University of Technology and Engineering (1976). Maritime Academy, German-Kazakh Institute. QS World 2026: 1201–1400.',
    bannerUrl: banner('yessenov'),
    website: 'https://yu.edu.kz',
  },
  {
    id: 'auezov',
    name: 'M. Auezov South Kazakhstan University',
    nameEn: 'M. Auezov South Kazakhstan University',
    nameRu: 'Южно-Казахстанский университет имени М. Ауэзова',
    city: 'Shymkent',
    rank: 26,
    rankingCategories: ['Overall', 'Engineering'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh'],
    description:
      "Kazakhstan's largest university by enrolment (1943, Shymkent). 25,000+ students. QS World 2026 #731–740. ASIIN accreditation.",
    bannerUrl: banner('auezov-university'),
    website: 'https://auezov.edu.kz',
  },
  {
    id: 'shakarim',
    name: 'Shakarim University',
    nameEn: 'Shakarim University',
    nameRu: 'Университет имени Шакарима',
    city: 'Semey',
    rank: 27,
    rankingCategories: ['Overall'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh'],
    description: 'Regional university in Semey with diverse academic offerings.',
    bannerUrl: banner('shakarim'),
    website: 'https://shakarim.kz',
  },
  {
    id: 'yassawi',
    name: 'Khoja Akhmet Yassawi International Kazakh-Turkish University',
    nameEn: 'Khoja Akhmet Yassawi International Kazakh-Turkish University',
    nameRu: 'Международный казахско-турецкий университет имени Ходжи Ахмеда Яссауи',
    city: 'Turkestan',
    rank: 28,
    rankingCategories: ['Overall', 'International Relations'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Kazakh', 'Russian', 'English'],
    description: 'International Kazakh-Turkish university in Turkestan. Major Turkic academic hub.',
    bannerUrl: banner('khoja-akhmet'),
    website: 'https://ayu.edu.kz',
  },
  {
    id: 'kaisar',
    name: 'Kazakh Agro Technical Research University',
    nameEn: 'S. Seifullin Kazakh Agro Technical Research University',
    nameRu: 'Казахский агротехнический исследовательский университет имени С. Сейфуллина',
    city: 'Astana',
    rank: 29,
    rankingCategories: ['Overall', 'Agriculture'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh', 'English'],
    description: "Kazakhstan's leading agro-technical research university (S. Seifullin).",
    bannerUrl: banner('seifullin'),
    website: 'https://kazatu.edu.kz',
  },
  {
    id: 'kaznau',
    name: 'Kazakh National Agrarian Research University',
    nameEn: 'Kazakh National Agrarian Research University',
    nameRu: 'Казахский национальный аграрный исследовательский университет',
    city: 'Almaty',
    rank: 30,
    rankingCategories: ['Overall', 'Agriculture'],
    type: 'public',
    profile: 'non-medical',
    branchStatus: 'local',
    languages: ['Russian', 'Kazakh', 'English'],
    description: 'National agricultural research university of Kazakhstan.',
    bannerUrl: banner('kaznau'),
    website: 'https://kaznaru.edu.kz',
  },
]

/** Возвращает университет с гарантированными «развёрнутыми» полями (для страницы /vuzy/:id). */
export function getUniversityWithDefaults(u: University): Required<
  Pick<University, 'intakes' | 'scholarships' | 'requirements'>
> &
  University {
  return {
    ...u,
    intakes: u.intakes ?? defaultIntakes(),
    scholarships: u.scholarships ?? defaultScholarships(),
    requirements: u.requirements ?? defaultRequirements(),
  }
}

export function findUniversity(id: string): University | undefined {
  return UNIVERSITIES.find((u) => u.id === id)
}

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
