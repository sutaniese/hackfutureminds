/**
 * University types shared by `/hub/vuzy` (catalog + detail page) and student
 * career cards (where to study). The actual dataset lives in
 * `apps/student/src/portal/data/universities.ts`; this file fixes the common
 * shape.
 */

export type UniRanking =
  | "Overall"
  | "Business"
  | "Law"
  | "IT"
  | "Medicine"
  | "Engineering"
  | "International Relations"
  | "Agriculture";

export type UniLanguage = "English" | "Russian" | "Kazakh";

export type StudyProgram = {
  titleEn: string;
  titleRu: string;
  durationYears: number;
  language: UniLanguage;
};

export type Intake = {
  season: "Fall" | "Spring";
  type: "Regular Admission" | "Early Admission" | "Rolling";
  deadline: string;
  note?: string;
};

export type Scholarship = {
  title: string;
  description: string;
  note?: string;
};

export type RequiredDoc = {
  titleKz: string;
  titleEn: string;
  required: boolean;
  noteKz: string;
  noteEn: string;
};

export type AdmissionRequirements = {
  languageRequirement: string;
  scoringSystem: string;
  requiredDocs: RequiredDoc[];
  note?: string;
};

export type ContactInfo = {
  address?: string;
  phone?: string;
  email?: string;
};

export type University = {
  id: string;
  name: string;
  nameEn: string;
  nameRu: string;
  city: string;
  rank: number;
  rankingCategories: UniRanking[];
  type: "public" | "private";
  profile: "medical" | "non-medical";
  branchStatus: "local" | "foreign-branch";
  languages: UniLanguage[];
  description: string;
  bannerUrl: string;
  website?: string;
  programs?: StudyProgram[];
  totalPrograms?: number;
  intakes?: Intake[];
  scholarships?: Scholarship[];
  requirements?: AdmissionRequirements;
  contact?: ContactInfo;
};
