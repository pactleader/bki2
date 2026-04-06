const TOKEN_KEY = 'bki_admin_token';
const USER_KEY  = 'bki_admin_user';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getUser  = () => { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } };
export const isLoggedIn = () => {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      logout(); // clear expired token
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

export const saveAuth = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};
