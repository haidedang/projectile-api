/**
 * Wrapper class to handle window.sessionStorage entries.
 */
class SessionStorage {
  /**
   * Gets the value for the given key from the sessionStorage.
   *
   * @param {string} key The key that holds the information.
   * @returns {string|object|null} The stored value.
   */
  static getItem(key) {
    return JSON.parse(window.sessionStorage.getItem(key));
  }

  /**
   * Sets an item into the sessionStorage.
   *
   * @param {string} key The key to identify the information.
   * @param {string|object|number} value The information itself.
   * @returns {void}
   */
  static setItem(key, value) {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  }

  /**
   * Removes the item that is identified by key.
   *
   * @param {string} key The identifier.
   * @returns {void}
   */
  static removeItem(key) {
    window.sessionStorage.removeItem(key);
  }

  /**
   * Resets the sessionStorage.
   *
   * @returns {void}
   */
  static reset() {
    window.sessionStorage.clear();
  }
}

export default SessionStorage;
