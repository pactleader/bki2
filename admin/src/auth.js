const TOKEN_KEY = 'bki_admin_token';
const USER_KEY  = 'bki_admin_user';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getUser  = () => { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } };
export const isLoggedIn = () => !!getToken();

export const saveAuth = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};
