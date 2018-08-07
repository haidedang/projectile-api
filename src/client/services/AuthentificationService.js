class AuthentificationService {
  static login(username, password) {
    return new Promise((resolve, reject) => {
      fetch('http://localhost:3000/api/v1/login', {
        method: 'POST',
        body: JSON.stringify({ username: username, password: password }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
        .then(res => {
          return res.json();
        })
        .then(token => {
          resolve(token);
        })
        .catch(error => console.error('Error:', error));
    });
  }
}

export default AuthentificationService;
