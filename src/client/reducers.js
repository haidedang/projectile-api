import { LOGIN } from './actions';
import { LOGOUT } from './actions';

const initialState = {
  token: false
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case LOGIN:
      return {
        ...state,
        token: action.token
      };
    case LOGOUT:
      return {
        ...state,
        token: false
      };
    default:
      return state;
  }
};

export const getToken = state => state.token;
export default rootReducer;
