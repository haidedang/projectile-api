const request = require('request');
request.defaults({jar: true});

const LOGIN = process.env.LOGIN
const PASSWORD = process.env.PASSWORD

if(!LOGIN || !PASSWORD) {
	throw new Error('Password or username not present')
	process.exit(1)
}

getJobs()

function createLogin() {

	let j = request.jar();

	// Using request
	return request({
		method: 'POST',
		url: 'https://projectile.office.sevenval.de/projectile/start',
		strictSSL: false,
		form: {
			action: 'login2',
			login: LOGIN,
			password: PASSWORD,
			clientId: 0,
			jsenabled: 1,
			isAjax: 0,
			develop: 0
		},
	}, function (error, response, body) {
		if (!error) {

			console.log(response.headers['set-cookie'])
			let cookie = '';
			response.headers['set-cookie'].forEach((item) => {
				//
				//
				if (item != 'jwt=""; Path=/; Secure; HttpOnly') {
					cookie += item.split(';')[0] + ';'
				}
			})

			// console.log(body, response);
			request({
				method: 'POST',
				url: 'https://projectile.office.sevenval.de/projectile/gui5ajax',
				strictSSL: false,
				json: true,
				form: {"ref": "TeamCalendar", "name": "*", "action": "show"},
				headers: {
					Cookie: cookie
				}

			}, function (error, response, body) {
				if (error) {
					throw error;
				}

				body.values.TeamCalendar.forEach((item) => {
					let dates = '';
					if (item.v && Array.isArray(item.v)) {
						item.v.forEach((calendEntry) => {
							try {
								const data = calendEntry.split('|')
								if (data[6] == 'WorkingTime' && data[10] && data[10] == 'Holyday') {
									dates += data[9] + ' '
								}
							} catch (e) {
								// console.log(item.v);
								console.log(calendEntry);
							}
						})
						console.log(`Name ${item.c} -- ${dates}`);
					}

				})

			})
		}
	});
}

function getJobs() {

	let j = request.jar();

	// Using request
	return request({
		method: 'POST',
		url: 'https://projectile.office.sevenval.de/projectile/start',
		strictSSL: false,
		form: {
			action: 'login2',
			login: LOGIN,
			password: PASSWORD,
			clientId: 0,
			jsenabled: 1,
			isAjax: 0,
			develop: 0
		},
	}, function (error, response, body) {
		if (!error) {

			console.log(response.headers['set-cookie'])
			let cookie = '';
			response.headers['set-cookie'].forEach((item) => {
				//
				//
				if (item != 'jwt=""; Path=/; Secure; HttpOnly') {
					cookie += item.split(';')[0] + ';'
				}
			})

			// console.log(body, response);
			request({
				method: 'POST',
				url: 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=options',
				strictSSL: false,
				json: true,
				body: {"+.|DayList|0|TimeTracker!^.|Default|Employee|1|25": ["What"]},
				headers: {
					'X-Requested-With': 'XMLHttpRequest',
					Cookie: cookie
				}

			}, function (error, response, body) {
				if (error) {
					throw error;
				}
				const data = body.values

				try {
					for (var key in data) {
						if (data.hasOwnProperty(key) && key.indexOf("JobList") !== -1) {
							const name = data[key][2].c;
							const jobNumber = data[key][6].v;
							console.log(`${jobNumber} -- ${name}`);
						}
					}
				} catch (e) {
					console.log(e);
				}

			})
		}
	});
}



