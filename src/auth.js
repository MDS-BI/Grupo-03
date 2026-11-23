const USERS_KEY = 'erp.auth.users';
export const AUTH_SESSION_KEY = 'erp.auth.session';

function readUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function fallbackDigest(value, salt) {
  let hash = 2166136261;
  for (const char of `${salt}:${value}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

async function digest(password, salt) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || typeof window.TextEncoder === 'undefined') return fallbackDigest(password, salt);
  const data = new window.TextEncoder().encode(`${salt}:${password}`);
  const buffer = await subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function createSalt() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function hasUsers() {
  return readUsers().length > 0;
}

export function getCurrentUser() {
  try {
    return window.sessionStorage.getItem(AUTH_SESSION_KEY) || '';
  } catch {
    return '';
  }
}

export function isAuthenticated() {
  return Boolean(getCurrentUser());
}

export function signOut() {
  try {
    window.sessionStorage.removeItem(AUTH_SESSION_KEY);
  } catch {
    return;
  }
}

export async function registerUser({ username = '', password = '' } = {}) {
  const name = String(username).trim();
  if (!name) throw new Error('Ingrese un nombre de usuario.');
  if (String(password).length < 4)
    throw new Error('La contraseña debe tener al menos 4 caracteres.');

  const users = readUsers();
  if (users.some((user) => String(user.username).toLowerCase() === name.toLowerCase())) {
    throw new Error('Ya existe un perfil con ese nombre.');
  }

  const salt = createSalt();
  users.push({ username: name, salt, hash: await digest(password, salt) });
  writeUsers(users);
  return name;
}

export async function signIn({ username = '', password = '' } = {}) {
  const name = String(username).trim();
  const user = readUsers().find(
    (item) => String(item.username).toLowerCase() === name.toLowerCase()
  );
  if (!user || (await digest(String(password), user.salt)) !== user.hash) {
    throw new Error('Usuario o contraseña incorrectos.');
  }

  try {
    window.sessionStorage.setItem(AUTH_SESSION_KEY, user.username);
  } catch {
    throw new Error('No se pudo iniciar sesión en este navegador.');
  }
  return user.username;
}
