# Projectile API

API and CLI to access projectile and timeular to book and synchronize bookings from timeular to projectile.

### Setup and Running

```
yarn install
LOGIN={your projectile login} PASSWORD={your projectile password} node userCred.js
```
Go to https://profile.timeular.com/ and create an API key and API Secret and provide it here as an environment variable:
```
apiKey=<key> apiSecret=<key> node getTimeularToken.js
```
To run the CLI
```
node cli.js
```
To run the API
```
node api.js
```

## available features
# API
http://localhost:3000/syncactivities --> synchronizes projectile joblist/packages to timeular activities
http://localhost:3000/syncbookings/{value} --> synchronize timeular bookings to projectile. Options: today, week, month
http://localhost:3000/syncbookings/{startdate}/{enddate} --> synchronize timeular bookings to projectile. Provide start- and end date in format YYYY-MM-DD.

Booking: nur auf Timeular, nur auf Projectile oder immer gleich auf beidem?!
derzeit direkt auf beidem - PoC
http://localhost:3000/book/2018-03-07/1.75/127170/testing
http://localhost:3000/book/2018-03-07/1.75/2759-62/testing

booking without date may be removed in favor for booking without a note

http://localhost:3000/showListProjectile
http://localhost:3000/showListTimeular


Not stable yet.

http://localhost:3000/book/{date}/{time}/{package/activity}/{note} - still an issue with time value

# CLI
( - not fully updated - )
(show) - show job package list - to get the jobnames for booking
(book) book working time
(bookjob) book working time, interactively chose target job package
(sync) - Timeular sync
sync {startdate} {enddate}
sync {today} or {week} or {month}
(help) list of available commands
(exit) exit


## todo


* make everything nice


## done

* read booking packages
* read vacation list
* set default Employer ID for follwing calls
* write bookings
* simple CLI program interface
