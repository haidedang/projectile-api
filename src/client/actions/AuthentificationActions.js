import SessionStorage from '../utils/SessionStorage';

export const LOGIN = 'LOGIN';
export const LOGOUT = 'LOGOUT';
export const ERROR = 'ERROR';

/**
 * Redux action for login.
 *
 * @param {string} token JSON Web Token.
 * @returns {object} Redux action type.
 */
export function login(token) {
  if (token.status && token.status === 'error') {
    return {
      type: ERROR,
      message: token.message
    };
  }

  SessionStorage.setItem('token', token);

  return {
    type: LOGIN,
    token: sessionStorage.token
  };
}

/**
 * Redux action for logout.
 *
 * @returns {object} Redux action type.
 */
export function logout() {
  SessionStorage.removeItem('token');

  return {
    type: LOGOUT
  };
}
