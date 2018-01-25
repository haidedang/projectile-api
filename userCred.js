const fs = require('fs');

let login = process.env.LOGIN;
let password = process.env.PASSWORD;

let user = {login: login,
    password: password
}


fs.writeFile('user.txt', JSON.stringify(user), (err) => {
    if (err) throw err;
    console.log("The file has been saved!");
});


