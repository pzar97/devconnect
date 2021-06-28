const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const auth = require('../../middleware/auth');
// get user from user model
const User = require('../../models/User');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');

// @route GET api/auth
// @desc Test route
// @access Public
// added auth middleware to the route
router.get('/', auth, async (req, res) => {
    try {
        // get user instance by using req.user and id associated with it
        // hide the password in the instance for security
        const user = await User.findById(req.user.id).select('-password');
        // send the json response to the server
        res.json(user);
    } catch(err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route POST api/auth
// @desc Authenticate users and get token
// @access Public
router.post('/', [
    check('email', 'Please enter a valid email').isEmail(),
    check('password', 'Password required').exists()
], 
    async (req, res) => {
    // Errors check
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    // Validating if the user already exists/not
    // extract the 3 fields out of req
    const { email, password } = req.body;

    try {
        // check if the user exists or not
        let user = await User.findOne({ email });
        
        if (!user) {
            return res.status(400).json({ errors: [{ msg: 'Invalid credentials!' }] });
        }

        // compares the encrypted password with the text password
        // and matches both of them to authenticate the user
        const isMatched = await bcrypt.compare(password, user.password);
        if (!isMatched) {
            return res.status(400).json({ errors: [{ msg: 'Invalid credentials!' }] });
        }

        // return jsonwebtoken
        // create the payload to be passed to jwt
        const payload = {
            user: {
                // get the user id from the user instance
                id: user.id
            }
        }
        // pass the payload and the token
        jwt.sign(payload, config.get('jwtSecret'), 
        {expiresIn: 360000}, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });

    } catch(err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;