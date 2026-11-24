import { isRole } from './roles.js';

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

export function getCurrentSession() {
  try {
    const raw = window.sessionStorage.getItem(AUTH_SESSION_KEY) || '';
    if (!raw) return { username: '', role: '' };
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { username: raw, role: '' };
    }
    if (typeof parsed === 'string') return { username: parsed, role: '' };
    if (parsed && typeof parsed === 'object') {
      return {
        username: String(parsed.username ?? ''),
        role: String(parsed.role ?? '')
      };
    }
    return { username: '', role: '' };
  } catch {
    return { username: '', role: '' };
  }
}

export function getCurrentUser() {
  return getCurrentSession().username;
}

export function getCurrentRole() {
  return getCurrentSession().role;
}

export function isAuthenticated() {
  const { username, role } = getCurrentSession();
  return Boolean(username) && isRole(role);
}

export function signOut() {
  try {
    window.sessionStorage.removeItem(AUTH_SESSION_KEY);
  } catch {
    return;
  }
}

export async function registerUser({ username = '', password = '', role = '' } = {}) {
  const name = String(username).trim();
  if (!name) throw new Error('Ingrese un nombre de usuario.');
  if (String(password).length < 4)
    throw new Error('La contraseña debe tener al menos 4 caracteres.');
  if (!role) throw new Error('Seleccione un cargo/rol.');
  if (!isRole(role)) throw new Error('El cargo/rol seleccionado no es válido.');

  const users = readUsers();
  if (users.some((user) => String(user.username).toLowerCase() === name.toLowerCase())) {
    throw new Error('Ya existe un perfil con ese nombre.');
  }

  const salt = createSalt();
  users.push({ username: name, salt, hash: await digest(password, salt), role });
  writeUsers(users);
  return name;
}

export async function signIn({ username = '', password = '', role = '' } = {}) {
  const name = String(username).trim();
  const users = readUsers();
  const user = users.find((item) => String(item.username).toLowerCase() === name.toLowerCase());
  if (!user || (await digest(String(password), user.salt)) !== user.hash) {
    throw new Error('Usuario o contraseña incorrectos.');
  }

  let assignedRole = user.role;
  if (!isRole(assignedRole)) {
    if (!role) {
      const error = new Error(
        'Este perfil no tiene cargo/rol. Seleccione uno para completar el registro.'
      );
      error.code = 'ROLE_REQUIRED';
      throw error;
    }
    if (!isRole(role)) throw new Error('El cargo/rol seleccionado no es válido.');
    user.role = role;
    writeUsers(users);
    assignedRole = role;
  }

  try {
    window.sessionStorage.setItem(
      AUTH_SESSION_KEY,
      JSON.stringify({ username: user.username, role: assignedRole })
    );
  } catch {
    throw new Error('No se pudo iniciar sesión en este navegador.');
  }
  return user.username;
}
