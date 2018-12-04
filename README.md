# Projectile API

API to access projectile to book and synchronize bookings.

## API

### Setup and Running

```
$ yarn install
$ yarn build # builds the api documentation
$ yarn api   # starts the api
```

You can access the API at http://localhost:3000 and the documentation under
http://localhost:3000/api/doc.

### Authentication

The API is using JSON Web Token to identify a user after its first login. This token has to be added to the
_Authorization_ header with the _Bearer_ method. Further information on that can be found in the API documentation.  

At first, a client has to call the `login` route with the users credentials for Projectile. As a result it gets the
token that contains the cookie information and the expiration time of Projectile.  

If the expiration time is up it returns an error `Unauthorized`. Then the login route has to be called again to get a
new token.

The handling of the user credentials is with the client. From there it is possible to use the keychain/keyring of the
operating system to store the user credentials encrypted. There are ways on any major operating system to do that. 
But depending on the security awareness of the client developer it is also possible to save the credentials within an
unencrypted text file.  

### Status

The API is currently under heavy development. We have changed the structure a little bit to fit the needs of further
maintenance. Also we are working hardly on the routes for booking and editing to get everything important up and running
again as soon as possible.

What actually already works is the _login_ and _authentication_ stuff.

## Client

To test the client you have to checkout the master branch where everything is at an older state. The current client has
to be adjusted in some areas to fit to the new API structure so it wont work actually. 

### Forecast

We have planned a web client that is already available but not yet functional and also an Electron App that uses the web
client to give the user a better experience. For example it is planned to build in the functionality for the
keychain/keyring mechanism to allow users to pass their credentials only once. Furthermore the Electron App could better handle
synchronization errors that are caused by a lag of network access to the API which can be accomplished through an internal database 
and a proper synchronization process.

