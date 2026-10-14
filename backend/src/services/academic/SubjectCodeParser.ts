export interface ParsedSubjectCode {
  rawSubjectCode: string;
  normalizedSubjectCode: string;
  matchedPattern: string;
  regulationCode: string;
  subjectBranchToken: string;
  semesterNumber: number;
  subjectType: string;
  sequenceCode: string;
}

/**
 * Parses and extracts semantic components from an institutional Subject Code.
 * Supports:
 *  - Standard pattern: e.g. 23ME3T01, 23HS1T01, 23MB3T02, 23CSBS4T01, 23CS3L05
 *  - Regulation numeric: e.g. 23CS301, 20ME402
 *  - Legacy pattern: e.g. CS301, ME401, HS101, MB201
 *  - Resilient alphanumeric fallback for custom electives / open courses
 */
export class SubjectCodeParser {
  // Pattern 1: Standard Autonomous / JNTU (e.g. 23ME1T01, 23ME1L06, 23ME8P01, 23HS1T01, 23CSBS4T01)
  private static readonly PATTERN_STANDARD = /^(\d{2})([A-Z]{2,6})(\d)([A-Z]+)(\d{1,3})$/i;

  // Pattern 2: Regulation + Branch + Semester + Sequence (e.g. 23CS301, 20ME401)
  private static readonly PATTERN_REG_NUMERIC = /^(\d{2})([A-Z]{2,6})(\d)(\d{2,3})$/i;

  // Pattern 3: Legacy direct code (e.g. CS301, ME401, HS101, MB302)
  private static readonly PATTERN_LEGACY = /^([A-Z]{2,6})(\d)(\d{2,3})$/i;

  // Pattern 4: Custom / Open Elective / Skill code (e.g. OE101, MATH1, PE401, MC101)
  private static readonly PATTERN_CUSTOM = /^([A-Z]{2,6})[_\-]?(\d{1,4})([A-Z]?)$/i;

  private static readonly RESERVED_WORDS = new Set([
    'CO', 'PO', 'PSO', 'PEO', 'DEPARTMENT', 'SEMESTER', 'COURSE', 'OUTCOMES',
    'PROGRAM', 'SYLLABUS', 'REGULATION', 'ENGINEERING', 'AUTONOMOUS', 'CREDITS',
    'HOURS', 'MARKS', 'MAX', 'MIN', 'AVERAGE', 'TOTAL', 'PERCENTAGE', 'ATTAINMENT',
    'LINEAR', 'PHYSICS', 'ENGLISH', 'CHEMISTRY', 'MATHEMATICS', 'ELECTRICAL',
    'ELECTRONICS', 'COMPUTER', 'MECHANICAL', 'CIVIL'
  ]);

  public static parse(rawSubjectCode: string): ParsedSubjectCode {
    if (!rawSubjectCode || typeof rawSubjectCode !== 'string') {
      throw new Error('INVALID_SUBJECT_CODE: Subject code cannot be empty.');
    }

    const trimmed = rawSubjectCode.trim();

    // Fast reject sentences or multi-word strings (unless it's just spaces around hyphens)
    if (trimmed.includes(' ') && trimmed.split(/\s+/).length > 2) {
      throw new Error(`INVALID_SUBJECT_CODE: '${rawSubjectCode}' contains multiple words.`);
    }

    // Normalize: trim and remove hyphens/underscores/spaces, uppercase
    const normalizedSubjectCode = trimmed.replace(/[\s\-_]+/g, '').toUpperCase();

    // Length constraints: valid academic codes are 4 to 15 characters
    if (normalizedSubjectCode.length < 4 || normalizedSubjectCode.length > 15) {
      throw new Error(`INVALID_SUBJECT_CODE: '${rawSubjectCode}' length out of valid range (4-15).`);
    }

    // Must contain both letters and digits
    if (!/[A-Z]/.test(normalizedSubjectCode) || !/\d/.test(normalizedSubjectCode)) {
      throw new Error(`INVALID_SUBJECT_CODE: '${rawSubjectCode}' must contain both letters and numbers.`);
    }

    // Reject reserved keywords and CO/PO/PSO identifiers
    if (this.RESERVED_WORDS.has(normalizedSubjectCode)) {
      throw new Error(`INVALID_SUBJECT_CODE: '${rawSubjectCode}' is a reserved keyword.`);
    }
    if (/^CO\s*\d+$/i.test(normalizedSubjectCode) || /^PO\s*\d+$/i.test(normalizedSubjectCode) || /^PSO\s*\d+$/i.test(normalizedSubjectCode)) {
      throw new Error(`INVALID_SUBJECT_CODE: '${rawSubjectCode}' is an outcome code, not a subject code.`);
    }

    // 1. Try standard pattern: 23ME1T01, 23HS1T01, 23CSBS4T01, 23ME1L06
    const matchStandard = this.PATTERN_STANDARD.exec(normalizedSubjectCode);
    if (matchStandard) {
      return {
        rawSubjectCode,
        normalizedSubjectCode,
        matchedPattern: 'STANDARD_NNLLNLNN',
        regulationCode: matchStandard[1],
        subjectBranchToken: matchStandard[2],
        semesterNumber: parseInt(matchStandard[3], 10),
        subjectType: matchStandard[4],
        sequenceCode: matchStandard[5]
      };
    }

    // 2. Try regulation numeric pattern: 23CS301, 20ME401
    const matchRegNumeric = this.PATTERN_REG_NUMERIC.exec(normalizedSubjectCode);
    if (matchRegNumeric) {
      return {
        rawSubjectCode,
        normalizedSubjectCode,
        matchedPattern: 'REG_NUMERIC',
        regulationCode: matchRegNumeric[1],
        subjectBranchToken: matchRegNumeric[2],
        semesterNumber: parseInt(matchRegNumeric[3], 10),
        subjectType: 'T',
        sequenceCode: matchRegNumeric[4]
      };
    }

    // 3. Try legacy pattern: CS301, ME401, HS101
    const matchLegacy = this.PATTERN_LEGACY.exec(normalizedSubjectCode);
    if (matchLegacy) {
      return {
        rawSubjectCode,
        normalizedSubjectCode,
        matchedPattern: 'LEGACY',
        regulationCode: 'DEFAULT',
        subjectBranchToken: matchLegacy[1],
        semesterNumber: parseInt(matchLegacy[2], 10),
        subjectType: 'T',
        sequenceCode: matchLegacy[3]
      };
    }

    // 4. Custom / Open Elective pattern: OE101, MATH1, PE401, MC101
    const matchCustom = this.PATTERN_CUSTOM.exec(normalizedSubjectCode);
    if (matchCustom) {
      const token = matchCustom[1];
      const numbers = matchCustom[2];
      const semNumber = numbers.length >= 2 ? parseInt(numbers[0], 10) : 1;

      return {
        rawSubjectCode,
        normalizedSubjectCode,
        matchedPattern: 'CUSTOM_ELECTIVE',
        regulationCode: 'DEFAULT',
        subjectBranchToken: token,
        semesterNumber: isNaN(semNumber) || semNumber === 0 ? 1 : semNumber,
        subjectType: 'T',
        sequenceCode: numbers
      };
    }

    throw new Error(`UNSUPPORTED_SUBJECT_PATTERN: The subject code '${rawSubjectCode}' cannot be parsed.`);
  }
}
