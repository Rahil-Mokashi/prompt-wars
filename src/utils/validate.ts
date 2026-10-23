import {
  ALLOWED_MIME_TYPES,
  BYTES_PER_MB,
  MAX_FILE_BYTES,
  MAX_FILES,
  MAX_TEXT_CHARS,
} from '../config';

export interface FileMeta {
  name: string;
  type: string;
  size: number;
}

export interface InputToValidate {
  text: string;
  files: FileMeta[];
}

export type ValidationResult = { ok: true } | { ok: false; error: string };

/**
 * Validates user input before any model call.
 * @param input - the text and file metadata the user supplied
 * @returns ok, or a clear message saying what to fix
 */
export function validateInput(input: InputToValidate): ValidationResult {
  const text = input.text.trim();
  if (text.length === 0 && input.files.length === 0) {
    return { ok: false, error: 'Add some text or a file first.' };
  }
  if (text.length > MAX_TEXT_CHARS) {
    return { ok: false, error: `Text is too long. Keep it under ${MAX_TEXT_CHARS} characters.` };
  }
  if (input.files.length > MAX_FILES) {
    return { ok: false, error: `Too many files. You can add up to ${MAX_FILES}.` };
  }
  for (const file of input.files) {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        ok: false,
        error: `"${file.name}" is not supported. Use a JPEG, PNG, WebP, PDF or audio file.`,
      };
    }
    if (file.size > MAX_FILE_BYTES) {
      return {
        ok: false,
        error: `"${file.name}" is too large. Each file must be under ${MAX_FILE_BYTES / BYTES_PER_MB} MB.`,
      };
    }
  }
  return { ok: true };
}
