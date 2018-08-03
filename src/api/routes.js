const express = require('express');
const router = new express.Router();
const BookingController = require('./controllers/BookingController');
const AuthController = require('./controllers/AuthController');
const authenticationMiddleware = require('../lib/AuthenticationMiddleware');

/**
 * @api {POST} /api/v1/login Authenticates a user to Projectile.
 * @apiVersion 1.0.0
 * @apiName Auth
 * @apiGroup Login
 * @apiDescription This route takes the user credentials, logs the user in and returns a JSON Web Token.
 *
 * @apiParam {string} username The username of the users Projectile Account.
 * @apiParam {string} password The password of the users Projectile Account.
 *
 * @apiParamExample {json} Request example:
 *     {
 *         "username": "max.mustermann",
 *         "password": "Test123!"
 *     }
 *
 * @apiSuccess {string} status The status of the call.
 * @apiSuccess {string} token The JSON Web Token that authenticates the user on further requests.
 *
 * @apiSuccessExample Success response examples:
 *     HTTP/1.1 200 OK
 *     {
 *         "status": "ok",
 *         "token": "1F34A5C..."
 *     }
 *
 * @apiSuccess {string} status The status of the call.
 * @apiSuccess {string} message In case of an error the message tells what went wrong.
 *
 * @apiErrorExample Error response examples:
 *     HTTP/1.1 200 OK
 *     {
 *         "status": "error",
 *         "message": "Login failed"
 *     }
 *
 */
router.post('/login', AuthController.login);

/**
 * @api {POST} /api/v1/book Books an activity.
 * @apiVersion 1.0.0
 * @apiName Book
 * @apiGroup Booking
 * @apiDescription This route is used to book an activity within the projectile system.
 *
 * @apiParam {string} date? The date when the activity has done.
 * @apiParam {string} duration How long did this took.
 * @apiParam {string} activity An ID of the activity.
 * @apiParam {string} note A more detailed description of what was done for that activity.
 *
 * @apiParamExample {json} Request example:
 *
 *     {
 *         "date": "2018-02-12",
 *         "duration": "2.25",
 *         "activity": "1234",
 *         "note": "Did some stuff for ticket xy"
 *     }
 *
 * @apiSuccess {string} status The creation status, one of "ok" or "error"
 *
 * @apiSuccessExample Success response examples:
 *     HTTP/1.1 200 OK
 *     {
 *         "status": "ok",
 *     }
 *
 *     HTTP/1.1 200 OK
 *     {
 *         "status": "error"
 *     }
 *
 *     HTTP/1.1 401 Unauthorized
 *     {
 *         "status": "error",
 *         "message": "Unauthorized"
 *     }
 */
router.post('/book', authenticationMiddleware.authenticate, BookingController.bookEntry);

/**
 * @api {get} /api/v1/showListProjectile/:pretty? Returns a list of activities.
 * @apiVersion 1.0.0
 * @apiName ShowListProjectile
 * @apiGroup Booking
 * @apiDescription This route is to give a list of activities where it is possible to book for.
 *
 * @apiParam {string} pretty Pretty list.
 *
 * @apiParamExample {json} Request example:
 *
 *     {
 *         "pretty": "true"
 *     }
 *
 * @apiSuccess {string} status "ok" or "error"
 * @apiSuccess {Object} response The response
 *
 * @apiSuccessExample Success response examples:
 *     HTTP/1.1 200 OK
 *     {
 *         "status": "ok",
 *         "response": {
 *            ...
 *         },
 *     }
 *
 *     HTTP/1.1 200 OK
 *     {
 *         "status": "error"
 *     }
 *
 *     HTTP/1.1 401 Unauthorized
 *     {
 *         "status": "error",
 *         "message": "Unauthorized"
 *     }
 *
 */
router.get('/showListProjectile/:pretty?', authenticationMiddleware.authenticate, BookingController.showList);


module.exports = router;

