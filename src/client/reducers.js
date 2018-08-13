import { LOGIN, LOGOUT } from './Actions/AuthentificationActions';
import { ADD_SELECT_OPTIONS} from './Actions/PackageActions';

const initialState = {
  token: false,
  options:{}
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
    case ADD_SELECT_OPTIONS:
      return {
        ...state,
        options: action.options
      }
    default:
      return state;
  }
};

export const getToken = state => state.token;
export const getSelectOptions = state => state.options;

export default rootReducer;
