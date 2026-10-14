export interface DepartmentCodeConfig {
  departmentCode: string;
  subjectCodeToken: string;
  subjectCodeTokens: string[];
  departmentName: string;
  aliases: string[];
}

export const DEPARTMENT_CONFIGS: DepartmentCodeConfig[] = [
  {
    departmentCode: 'CSE',
    subjectCodeToken: 'CS',
    subjectCodeTokens: ['CS', 'CSE'],
    departmentName: 'Computer Science and Engineering',
    aliases: ['CSE', 'COMPUTER SCIENCE AND ENGINEERING', 'COMPUTER SCIENCE ENGINEERING', 'COMPUTER SCIENCE', 'COMP SCI'],
  },
  {
    departmentCode: 'IT',
    subjectCodeToken: 'IT',
    subjectCodeTokens: ['IT', 'INF'],
    departmentName: 'Information Technology',
    aliases: ['IT', 'INFORMATION TECHNOLOGY', 'INFO TECH'],
  },
  {
    departmentCode: 'AIDS',
    subjectCodeToken: 'DS',
    subjectCodeTokens: ['DS', 'AD', 'AIDS', 'AI&DS'],
    departmentName: 'Artificial Intelligence and Data Science',
    aliases: ['AIDS', 'AI&DS', 'ARTIFICIAL INTELLIGENCE AND DATA SCIENCE', 'AI AND DS', 'AI & DS', 'DATA SCIENCE'],
  },
  {
    departmentCode: 'AIML',
    subjectCodeToken: 'ML',
    subjectCodeTokens: ['ML', 'AM', 'AIML', 'AI&ML'],
    departmentName: 'Artificial Intelligence and Machine Learning',
    aliases: ['AIML', 'AI&ML', 'ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING', 'AI AND ML', 'AI & ML', 'MACHINE LEARNING'],
  },
  {
    departmentCode: 'ECE',
    subjectCodeToken: 'EC',
    subjectCodeTokens: ['EC', 'ECE'],
    departmentName: 'Electronics and Communication Engineering',
    aliases: ['ECE', 'ELECTRONICS AND COMMUNICATION ENGINEERING', 'ELECTRONICS & COMMUNICATION ENGINEERING', 'ELECTRONICS'],
  },
  {
    departmentCode: 'EEE',
    subjectCodeToken: 'EE',
    subjectCodeTokens: ['EE', 'EEE'],
    departmentName: 'Electrical and Electronics Engineering',
    aliases: ['EEE', 'ELECTRICAL AND ELECTRONICS ENGINEERING', 'ELECTRICAL & ELECTRONICS ENGINEERING', 'ELECTRICAL'],
  },
  {
    departmentCode: 'CIVIL',
    subjectCodeToken: 'CV',
    subjectCodeTokens: ['CV', 'CE', 'CIVIL'],
    departmentName: 'Civil Engineering',
    aliases: ['CIVIL', 'CE', 'CIVIL ENGINEERING'],
  },
  {
    departmentCode: 'MECH',
    subjectCodeToken: 'ME',
    subjectCodeTokens: ['ME', 'MECH'],
    departmentName: 'Mechanical Engineering',
    aliases: ['MECH', 'ME', 'MECHANICAL ENGINEERING', 'MECHANICAL'],
  },
  {
    departmentCode: 'CSBS',
    subjectCodeToken: 'CB',
    subjectCodeTokens: ['CB', 'CSBS'],
    departmentName: 'Computer Science and Business Systems',
    aliases: ['CSBS', 'CS & BS', 'COMPUTER SCIENCE AND BUSINESS SYSTEMS'],
  },
  {
    departmentCode: 'H&S',
    subjectCodeToken: 'HS',
    subjectCodeTokens: ['HS', 'BS', 'SH', 'HU', 'FED', 'ENG', 'MAT', 'PHY', 'CHY'],
    departmentName: 'Humanities and Basic Sciences',
    aliases: [
      'H&S', 'HS', 'H & S', 'BSH', 'FED',
      'HUMANITIES AND SCIENCES', 'BASIC SCIENCES AND HUMANITIES',
      'HUMANITIES AND BASIC SCIENCES', 'FRESHMAN ENGINEERING', 'HUMANITIES'
    ],
  },
  {
    departmentCode: 'MBA',
    subjectCodeToken: 'MB',
    subjectCodeTokens: ['MB', 'MS', 'MG', 'MBA'],
    departmentName: 'Management Studies',
    aliases: ['MBA', 'MS', 'SMS', 'MANAGEMENT STUDIES', 'MASTER OF BUSINESS ADMINISTRATION', 'MANAGEMENT'],
  },
];

/**
 * Universal Inter-departmental / Foundational / Elective Subject Tokens
 * These subject codes are taught across multiple departments (e.g. English, Math, MEFA, Electives).
 */
export const INTERDEPARTMENTAL_TOKENS = new Set([
  'HS', // Humanities & Social Sciences (English, Professional Communication, Ethics)
  'BS', // Basic Sciences (Mathematics, Physics, Chemistry, Environmental Science)
  'ES', // Engineering Sciences (Engineering Mechanics, Basic Electrical, Workshop, Programming)
  'MB', // Management / MBA
  'MS', // Management Science / Managerial Economics (MEFA)
  'MG', // Management General
  'MC', // Mandatory Courses (Constitution of India, Indian Traditional Knowledge)
  'OE', // Open Elective (inter-disciplinary courses offered to all branches)
  'PE', // Professional Elective
  'PR', // Project Work
  'PW', // Practical / Project Work
  'AC', // Audit Course
  'SD', // Skill Development / Soft Skills
  'SE', // Skill Enhancement
  'IN', // Internship
  'HU', // Humanities
  'SH', // Sciences and Humanities
  'FED',// Freshman Engineering
]);

/**
 * Checks if a token represents an inter-departmental, foundational, or elective subject
 */
export function isInterdepartmentalToken(token: string): boolean {
  if (!token) return false;
  return INTERDEPARTMENTAL_TOKENS.has(token.trim().toUpperCase());
}

/**
 * Resolves a canonical Department Code from a raw string (e.g. from an Excel heading or user input)
 */
export function resolveDepartmentCodeByAlias(rawString: string): DepartmentCodeConfig | null {
  if (!rawString) return null;
  const normalized = rawString.trim().toUpperCase();
  
  return DEPARTMENT_CONFIGS.find(
    config => 
      config.departmentCode === normalized || 
      config.departmentName.toUpperCase() === normalized ||
      config.aliases.includes(normalized) ||
      config.aliases.some(alias => normalized.includes(alias))
  ) || null;
}

/**
 * Resolves a Department Code Config based on the extracted subject code token (e.g. "ME", "CS", "HS", "MB")
 */
export function resolveDepartmentConfigBySubjectToken(token: string): DepartmentCodeConfig | null {
  if (!token) return null;
  const normalized = token.trim().toUpperCase();
  
  return DEPARTMENT_CONFIGS.find(
    config => 
      config.subjectCodeToken === normalized || 
      (config.subjectCodeTokens && config.subjectCodeTokens.includes(normalized))
  ) || null;
}
