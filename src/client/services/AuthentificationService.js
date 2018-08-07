class AuthentificationService {
  static async login(username, password) {
    try {
      const result = await fetch('http://localhost:3000/api/v1/login', {
          credentials: 'include',
          method: 'POST',
          body: JSON.stringify({ username: username, password: password }),
          headers: {
            'Content-Type': 'application/json'
          }
        })

      return result.json();
    } catch (e) {
      console.log('Error:', e)
    }
  }
}

export default AuthentificationService;

