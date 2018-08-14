export const LOGIN = 'LOGIN';
export const LOGOUT = 'LOGOUT';

export function login(token) {
  sessionStorage.setItem('token', token);
  console.log('dispatch successfull');
  return dispatch => {
    dispatch({
      type: LOGIN,
      token: sessionStorage.token
    });
  };
}

export function logout() {
  sessionStorage.removeItem('token');
  console.log('LOGOUT successfully');
  return {
    type: LOGOUT
  };
}
