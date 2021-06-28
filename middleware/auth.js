const jwt = require('jsonwebtoken');
const config = require('config');

// exporting a middleware function which has req, res, and next
module.exports = function(req, res, next) {
    // get the token from the header with x-auth-token key
    const token = req.header('x-auth-token');
    // check if no token is present
    if (!token) {
        // return msg
        return res.status(401).json({ msg: 'No token, authorization denied!' });
    }

    // verify the token
    try {
        // decode the token
        const decoded = jwt.verify(token, config.get('jwtSecret'));
        // get the user from decoded token and set it to user in req
        req.user = decoded.user;
        // move to the next request
        next();
    } catch(err) {
        res.status(401).json({ msg: 'Token is not valid!' });
    }

}