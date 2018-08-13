export const ADD_SELECT_OPTIONS = 'ADD_SELECT_OPTIONS'

export function addSelectOptions(options){
  sessionStorage.setItem('options', JSON.stringify(options))
  return {
    type: ADD_SELECT_OPTIONS,
    options
  }
}
