

class AuthentificationService { 

  static async login(username, password){ 
    fetch('http://localhost:3000/api/v1/login', {
      method: 'POST',
      body: {username: username, password: password},
      headers: { 
        'Content-Type':'application/json'
      }
    }).then(res => console.log(res))
    .catch(error => console.error('Error:' , error))
  }
}

export default AuthentificationService;
