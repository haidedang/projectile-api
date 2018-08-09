class ApiCaller {

  constructor(token) { 
    this.token = token;
  }

  async callApi(endpoint) {
    try {
      const result = await fetch(`http://localhost:3000/api/v1/${endpoint}`,{
        method:'GET',
        headers:{
          'content-type':'application/json',
          authorization : 'Bearer ' + this.token
        }
      });
      return result.json();
    } catch (e) {
      console.log('Error:', e);
    }
  }
}

export default ApiCaller;
