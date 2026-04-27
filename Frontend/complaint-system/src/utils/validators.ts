import type{ LoginRequestData } from "../types/auth/login";
import type { ValidatorFn } from "../hooks/useSubmitForm";

// Constants for validation limits
const MAX_EMAIL_LENGTH = 255;
const MAX_PASSWORD_LENGTH = 128;
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MIN_PASSWORD_LENGTH = 6;

// Helper function to detect repeated characters (e.g., "AAAAAAAA")
const hasExcessiveRepeatedChars = (str: string, threshold = 10): boolean => {
  const matches = str.match(/(.)\1+/g);
  if (!matches) return false;
  return matches.some(match => match.length >= threshold);
};

// Helper function to detect repeated symbols (e.g., "!!!!!!" or "??????")
const hasExcessiveRepeatedSymbols = (str: string, threshold = 3): boolean => {
  const symbolMatches = str.match(/[!@#$%^&*()_+=\-\[\]{};:'",.<>?/\\|`~]+/g);
  if (!symbolMatches) return false;
  return symbolMatches.some(match => {
    const singleSymbol = match.length > 0 && new Set(match).size === 1;
    return singleSymbol && match.length >= threshold;
  });
};

// Helper function to detect repeated words (e.g., "the the the")
const hasExcessiveRepeatedWords = (str: string, threshold = 3): boolean => {
  const words = str.toLowerCase().trim().split(/\s+/);
  if (words.length < threshold) return false;
  
  for (let i = 0; i <= words.length - threshold; i++) {
    const subsequence = words.slice(i, i + threshold);
    if (subsequence.length === threshold && subsequence.every(w => w === subsequence[0])) {
      return true;
    }
  }
  return false;
};

// Helper function to detect gibberish (random character sequences without vowels)
const hasGibberishSequences = (str: string): boolean => {
  // Split into words and check for gibberish patterns
  const words = str.split(/[\s\-_]+/);
  let gibberishCount = 0;
  
  for (const word of words) {
    // Skip very short words
    if (word.length <= 2) continue;
    
    // Skip numbers and symbols only
    if (!/[a-zA-Z]/.test(word)) continue;
    
    // Check if word has too few vowels (likely gibberish)
    const vowels = (word.match(/[aeiouAEIOU]/g) || []).length;
    const consonants = (word.match(/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/g) || []).length;
    
    // If word is mostly consonants with very few vowels, it's likely gibberish
    if (consonants > 0 && vowels / (consonants + vowels) < 0.15) {
      gibberishCount++;
    }
  }
  
  // If more than 30% of words are gibberish, reject
  return words.filter(w => w.length > 2 && /[a-zA-Z]/.test(w)).length > 0 && 
         gibberishCount / Math.max(words.filter(w => w.length > 2 && /[a-zA-Z]/.test(w)).length, 1) > 0.3;
};

// Helper function to check for suspicious patterns
const hasSuspiciousPattern = (str: string): boolean => {
  // Check for only repeated characters
  if (hasExcessiveRepeatedChars(str, 10)) return true;
  
  // Check if string is only whitespace or special characters
  if (!/[a-zA-Z0-9]/.test(str)) return true;
  
  return false;
};

// ===== AUTH VALIDATORS =====
export const validateEmail: ValidatorFn<LoginRequestData> = ({ email }) => {
  if (!email || !email.trim()) {
    return { email: "Email is required." };
  }
  
  const trimmedEmail = email.trim();
  
  if (trimmedEmail.length > MAX_EMAIL_LENGTH) {
    return { email: `Email must not exceed ${MAX_EMAIL_LENGTH} characters.` };
  }
  
  if (hasExcessiveRepeatedChars(trimmedEmail)) {
    return { email: "Email contains invalid repeated characters." };
  }
  
  // Email must contain @ symbol
  if (!trimmedEmail.includes("@")) {
    return { email: "Please enter a valid email address (e.g., user@gmail.com)." };
  }
  
  // Check for suspicious patterns in email
  if (hasSuspiciousPattern(trimmedEmail)) {
    return { email: "Please enter a valid email address." };
  }
  
  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { email: "Please enter a valid email address." };
  }
  
  // Extract domain and validate it has proper format
  const domain = trimmedEmail.split('@')[1];
  if (!domain) {
    return { email: "Please enter a valid email address." };
  }
  
  // Check if domain has valid format (e.g., gmail.com, yahoo.com, custom.org)
  // Must have at least one dot and valid characters
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(domain)) {
    return { email: "Please enter a valid email domain (e.g., @gmail.com, @yahoo.com)." };
  }
  
  // Check if domain has valid TLD (at least 2 characters)
  const tld = domain.split('.').pop();
  if (!tld || tld.length < 2) {
    return { email: "Please enter a valid email domain." };
  }
  
  return null;
};

export const validatePassword: ValidatorFn<LoginRequestData> = ({ password }) => {
  if (!password) {
    return { password: "Password is required." };
  }
  
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { password: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { password: `Password must not exceed ${MAX_PASSWORD_LENGTH} characters.` };
  }
  
  if (hasExcessiveRepeatedChars(password, 8)) {
    return { password: "Password contains too many repeated characters." };
  }
  
  return null;
};

// ===== GENERIC TEXT VALIDATORS =====
export const validateTitle = (title: string, fieldName = "Title"): string | null => {
  if (!title || !title.trim()) {
    return `${fieldName} is required.`;
  }
  
  const trimmedTitle = title.trim();
  
  if (trimmedTitle.length > MAX_TITLE_LENGTH) {
    return `${fieldName} must not exceed ${MAX_TITLE_LENGTH} characters.`;
  }
  
  if (trimmedTitle.length < 3) {
    return `${fieldName} must be at least 3 characters.`;
  }
  
  if (hasSuspiciousPattern(trimmedTitle)) {
    return `${fieldName} contains invalid characters or patterns.`;
  }

  // For titles, be stricter with symbol repetition
  if (hasExcessiveRepeatedSymbols(trimmedTitle, 2)) {
    return `${fieldName} contains too many repeated symbols.`;
  }

  // For titles, be less strict with word repetition (1 repeat allowed)
  if (hasExcessiveRepeatedWords(trimmedTitle, 4)) {
    return `${fieldName} contains too many repeated words.`;
  }

  if (hasGibberishSequences(trimmedTitle)) {
    return `${fieldName} contains invalid or gibberish text.`;
  }
  
  return null;
};

export const validateDescription = (description: string, fieldName = "Description", required = true): string | null => {
  if (required && (!description || !description.trim())) {
    return `${fieldName} is required.`;
  }
  
  if (!description || !description.trim()) {
    return null; // Optional field, empty is ok
  }
  
  const trimmedDesc = description.trim();
  
  if (trimmedDesc.length > MAX_DESCRIPTION_LENGTH) {
    return `${fieldName} must not exceed ${MAX_DESCRIPTION_LENGTH} characters.`;
  }
  
  if (required && trimmedDesc.length < 10) {
    return `${fieldName} must be at least 10 characters.`;
  }
  
  if (hasSuspiciousPattern(trimmedDesc)) {
    return `${fieldName} contains invalid characters or patterns.`;
  }

  if (hasExcessiveRepeatedSymbols(trimmedDesc, 3)) {
    return `${fieldName} contains too many repeated symbols.`;
  }

  if (hasExcessiveRepeatedWords(trimmedDesc, 3)) {
    return `${fieldName} contains too many repeated words.`;
  }

  if (hasGibberishSequences(trimmedDesc)) {
    return `${fieldName} contains invalid or gibberish text. Please use valid words.`;
  }
  
  return null;
};

// ===== ACTIONS TAKEN VALIDATOR =====
export const validateActionsTaken = (actionsTaken: string, fieldName = "Actions Taken"): string | null => {
  if (!actionsTaken || !actionsTaken.trim()) {
    return `${fieldName} is required.`;
  }
  
  const trimmedActions = actionsTaken.trim();
  
  if (trimmedActions.length > MAX_DESCRIPTION_LENGTH) {
    return `${fieldName} must not exceed ${MAX_DESCRIPTION_LENGTH} characters.`;
  }
  
  if (trimmedActions.length < 5) {
    return `${fieldName} must be at least 5 characters.`;
  }
  
  if (hasSuspiciousPattern(trimmedActions)) {
    return `${fieldName} contains invalid characters or patterns.`;
  }

  if (hasExcessiveRepeatedSymbols(trimmedActions, 3)) {
    return `${fieldName} contains too many repeated symbols.`;
  }

  if (hasExcessiveRepeatedWords(trimmedActions, 3)) {
    return `${fieldName} contains too many repeated words.`;
  }

  if (hasGibberishSequences(trimmedActions)) {
    return `${fieldName} contains invalid or gibberish text. Please use valid words.`;
  }
  
  return null;
};
