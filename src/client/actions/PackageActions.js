import SessionStorage from '../utils/SessionStorage';

export const ADD_SELECT_OPTIONS = 'ADD_SELECT_OPTIONS';
const NO_SELECT_OPTIONS = 'NO_SELECT_OPTIONS';

/**
 * Redux action for adding select element options.
 *
 * @params {array} options An options array.
 */
export function addSelectOptions(options){
  if (!Array.isArray(options)) {
    return {
      type: NO_SELECT_OPTIONS
    };
  }

  SessionStorage.setItem('options', options);

  return {
    type: ADD_SELECT_OPTIONS,
    options
  }
}
