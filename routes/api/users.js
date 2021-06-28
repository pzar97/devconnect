const express = require('express');
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const router = express.Router();
const { check, validationResult } = require('express-validator');
// Using UserSchema from User
const User = require('../../models/User');

// @route POST api/users
// @desc Register users
// @access Public
router.post('/', [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please enter a valid valid email').isEmail(),
    check('password', 'Please enter password with 6 or more characters').isLength({ min: 6 })
], 
    async (req, res) => {
    // Errors check
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    // Validating if the user already exists/not
    // extract the 3 fields out of req
    const { name, email, password } = req.body;

    try {
        // find the user that has the same email
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ errors: [{ msg: 'User already exists' }] });
        }

        // add gravatar
        const avatar = gravatar.url(email, {
            // size
            s: '200',
            // rating (PG13)
            r: 'pg',
            // default icon or img
            d: 'mm'
        })
        // create an instance of the user
        user = new User({
            name,
            email,
            avatar,
            password
        });

        // encrypt password
        // number of times the password will be hashed
        const salt = await bcrypt.genSalt(10);
        // hash the password
        user.password = await bcrypt.hash(password, salt);
        // save the instance once the password the hashed
        await user.save();

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

        // res.send('User registered!');

    } catch(err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;