export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email address is required.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { isValid: false, error: 'Please enter a valid email address (e.g. name@company.com).' };
  }
  return { isValid: true };
}

export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required.' };
  }
  
  // Must be MORE than 8 characters (i.e. at least 9 characters)
  if (password.length <= 8) {
    return { isValid: false, error: 'Password must be more than 8 characters long.' };
  }

  // Must contain uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter (A-Z).' };
  }

  // Must contain lowercase letter
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter (a-z).' };
  }

  // Must contain special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one special character (e.g. !@#$%^&*).' };
  }

  return { isValid: true };
}

export function validateUserRegistration(data: { email?: string; password?: string; name?: string }): ValidationResult {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push('Full name or company representative name is required.');
  }

  const emailVal = validateEmail(data.email || '');
  if (!emailVal.isValid && emailVal.error) {
    errors.push(emailVal.error);
  }

  const passwordVal = validatePassword(data.password || '');
  if (!passwordVal.isValid && passwordVal.error) {
    errors.push(passwordVal.error);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
