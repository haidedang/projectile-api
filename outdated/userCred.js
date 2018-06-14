const fs = require('fs');

if (process.env.LOGIN && process.env.PASSWORD) {
  let login = process.env.LOGIN;
  let password = process.env.PASSWORD;
  let user = {login: login,
      password: password
  }
  fs.writeFile('user.txt', JSON.stringify(user), (err) => {
      if (err) throw err;
      console.log("The file has been saved!");
  });
} else {
  console.log('Please set the environment variables LOGIN and PASSWORD and run userCred again to proceed.');
}
