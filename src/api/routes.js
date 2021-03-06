const express = require('express');
const router = new express.Router();
const BookingController = require('./controllers/BookingController');
const AuthController = require('./controllers/AuthController');
const authenticationMiddleware = require('../lib/AuthenticationMiddleware');

/**
 * @api {POST} /api/v1/login Authenticates a user to Projectile.
 * @apiVersion 1.0.0
 * @apiName Login
 * @apiGroup Authentication
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
 * @apiExample {bash} Usage example:
 *
 * curl -H 'Content-Type: application/json' -d '{"username":"max.mustermann","password":"Test123!"}'
 * http://localhost:3000/api/v1/login
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
 * @apiHeader {string} Authorization Pass the JW Token by the bearer method. The token comes as a result of
 * the login call.
 * @apiHeaderExample {string} Header example:
 *
 * Authorization: Bearer 1F34A5C...
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
 * @api {POST} /api/v1/edit Edits an activity.
 * @apiVersion 1.0.0
 * @apiName Edit
 * @apiGroup Booking
 * @apiDescription This route is used to edit an activity within the projectile system. It's important and mandatory
 * to provide the correct line value from which the entry was originally retrieved, so the correct entry gets updated
 * when calling this route.
 *
 * @apiHeader {string} Authorization Pass the JW Token by the bearer method. The token comes as a result of
 * the login call.
 * @apiHeaderExample {string} Header example:
 *
 * Authorization: Bearer 1F34A5C...
 *
 * @apiParam {string} date The date when the activity has done.
 * @apiParam {string} duration How long did this took.
 * @apiParam {string} activity An ID of the activity.
 * @apiParam {string} note A more detailed description of what was done for that activity.
 * @apiParam {string} line The line represents the entrys position in the entry list retrieved for a specific day.
 *
 * @apiParamExample {json} Request example:
 *
 *     {
 *         "date": "2018-02-12",
 *         "entries":
 *         [
 *             {
 *                 "date": "2018-02-12",
 *                 "duration": "2.25",
 *                 "activity": "1234",
 *                 "note": "Did some stuff for ticket xy"
 *                 "line": "0"
 *             }
 *         ]
 *     }
 *
 * @apiSuccess {string} status The update status, one of "ok" or "error"
 *
 * @apiSuccessExample Success response examples:
 *     HTTP/1.1 200 OK
 *     {
 *         "status": "ok",
 *     }
 *
 *     HTTP/1.1 200 OK
 *     {
 *         "status": "error",
 *         "message": [
 *            ...
 *         ]
 *     }
 *
 *     HTTP/1.1 401 Unauthorized
 *     {
 *         "status": "error",
 *         "message": "Unauthorized"
 *     }
 */
router.post('/edit', authenticationMiddleware.authenticate, BookingController.editEntry);

/**
 * @api {POST} /api/v1/delete Deletes an activity.
 * @apiVersion 1.0.0
 * @apiName Delete
 * @apiGroup Booking
 * @apiDescription This route is used to delte an activity within the projectile system. It's important and mandatory
 * to provide the correct line value from which the entry was originally retrieved, so the correct entry gets deleted
 * when calling this route.
 *
 * Between retrieving the line numbers and sending the deletion request with the line numbers selected for deletion
 * there must not be any update or book requests. There is a risk of deleting the wrong entry in case the line number
 * is no longer up to date.
 *
 * @apiHeader {string} Authorization Pass the JW Token by the bearer method. The token comes as a result of
 * the login call.
 * @apiHeaderExample {string} Header example:
 *
 * Authorization: Bearer 1F34A5C...
 *
 * @apiParam {string} line The line represents the entrys position in the entry list retrieved for a specific day.
 *
 * @apiParamExample {json} Request example:
 *
 *     {
 *         "date": "2018-02-12",
 *         "entry":
 *         {
 *             "line": "0"
 *         }
 *     }
 *
 * @apiSuccess {string} status The deletion status, one of "ok" or "error"
 *
 * @apiSuccessExample Success response examples:
 *     HTTP/1.1 200 OK
 *     {
 *         "status": "ok",
 *     }
 *
 *     HTTP/1.1 200 OK
 *     {
 *         "status": "error",
 *         "message": [
 *            ...
 *         ]
 *     }
 *
 *     HTTP/1.1 401 Unauthorized
 *     {
 *         "status": "error",
 *         "message": "Unauthorized"
 *     }
 */
router.post('/delete', authenticationMiddleware.authenticate, BookingController.delete);

/**
 * @api {get} /api/v1/getjoblist Returns a list of activities.
 * @apiVersion 1.0.0
 * @apiName getjoblist
 * @apiGroup Booking
 * @apiDescription Returns a list of bookable activities.
 *
 * @apiHeader {string} Authorization Pass the JW Token by the bearer method. The token comes as a result of
 * the login call.
 * @apiHeaderExample {string} Header example:
 *
 * Authorization: Bearer 1F34A5C...
 *
 * @apiSuccess {string} status "ok" or "error"
 * @apiSuccess {Object} response The response
 *
 * @apiSuccessExample Success response examples:
 *     HTTP/1.1 200 OK
 *     {
 *         "status": "ok",
 *         "response": [
 *            ...
 *         ]
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
router.get('/getjoblist', authenticationMiddleware.authenticate, BookingController.getJobList);

/**
 * @api {get} /api/v1/getDayList Returns a list of entries of a day.
 * @apiVersion 1.0.0
 * @apiName getDayList
 * @apiGroup Booking
 * @apiDescription Returns a list of all existing entries for a day.
 *
 * @apiParam {string} date The date as a json object for which the entries are requested.
 * @apiParamExample {json} Request-Example:
 *     {
 *       "date": "2018-08-14"
 *     }
 *
 * @apiHeader {string} Authorization Pass the JW Token by the bearer method. The token comes as a result of
 * the login call.
 * @apiHeaderExample {string} Header example:
 *
 * Authorization: Bearer 1F34A5C...
 *
 * @apiSuccess {string} status "ok" or "error"
 * @apiSuccess {Object} response The response
 *
 * @apiSuccessExample Success response examples:
 *     HTTP/1.1 200 OK
 *     {
 *         "status": "ok",
 *         "response": [
 *            ...
 *         ],
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
router.post('/getdaylist', authenticationMiddleware.authenticate, BookingController.getDayList);

module.exports = router;
