const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
// using both user and profile db models
const Profile = require('../../models/Profile');
const User = require('../../models/User');

const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');

// @route GET api/profile/me
// @desc Get current users profile
// @access Private
router.get('/me', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id }).populate(
      'user',
      ['name', 'avatar']
    );
    if (!profile) {
      return res.status(401).json({ msg: 'Profile does not exist!' });
    }
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error!');
  }
});

// CRUD operations on profile using POST
// @route POST api/profile
// @desc Create or update a profile
// @access Private

router.post(
  '/',
  [
    auth,
    [
      check('status', 'This is a required field').not().isEmpty(),
      check('skills', 'This is a required field').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      company,
      website,
      location,
      bio,
      status,
      githubusername,
      skills,
      youtube,
      facebook,
      twitter,
      instagram,
      linkedin,
    } = req.body;

    // build profile object

    const profileFields = {};
    profileFields.user = req.user.id;
    // check if the fields are present
    if (company) profileFields.company = company;
    if (website) profileFields.website = website;
    if (location) profileFields.location = location;
    if (bio) profileFields.bio = bio;
    if (status) profileFields.status = status;
    if (githubusername) profileFields.githubusername = githubusername;
    if (skills) {
      // converting string into array
      profileFields.skills = skills.split(',').map(skill => skill.trim());
    }

    // build profile-social object
    profileFields.social = {};
    // check the fields
    if (youtube) profileFields.social.youtube = youtube;
    if (facebook) profileFields.social.facebook = facebook;
    if (instagram) profileFields.social.instagram = instagram;
    if (linkedin) profileFields.social.linkedin = linkedin;
    if (twitter) profileFields.social.twitter = twitter;

    // insert or update profile
    try {
      // find the user
      let profile = await Profile.findOne({ user: req.user.id });

      // update
      if (profile) {
        profile = await Profile.findOneAndUpdate(
          { user: req.user.id },
          { $set: profileFields },
          { new: true }
        );

        return res.json(profile);
      }
      // if the profile is not found then
      // Create a profile
      profile = new Profile(profileFields);
      // save the profile once created
      await profile.save();
      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error!');
    }
    // console.log(profileFields.social.facebook);
  }
);

// Get all the profiles
// @route GET api/profile
// @desc Get all the profiles
// @access Public
router.get('/', async (req, res) => {
  try {
    const profiles = await Profile.find().populate('user', ['name', 'avatar']);
    res.json(profiles);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
});

// @route GET api/profile/user/:user_id
// @desc Get profiles by user id
// @access Public
router.get('/user/:user_id', async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.params.user_id,
    }).populate('user', ['name', 'avatar']);

    // if the profile is not found
    if (!profile) return res.status(400).json({ msg: 'Profile not found!' });

    res.json(profile);
  } catch (error) {
    console.error(error.message);
    // display error as profile not found
    //even if the user id exceeds the length of the object ID
    if (error.kind == 'ObjectId') {
      return res.status(400).json({ msg: 'Profile not found!' });
    }
    res.status(500).send('Server Error');
  }
});

// Delete request
// @route DELETE api/profile
// @desc Delete profile, user, and posts
// @access Private
router.delete('/', auth, async (req, res) => {
  try {
    // remove profile
    await Profile.findOneAndRemove({ user: req.user.id });
    // remove user
    await User.findOneAndRemove({ _id: req.user.id });

    res.json({ msg: 'User deleted!' });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server Error');
  }
});

// Add experience to a profile
// @route PUT api/profile/experience
// @desc Add profile experience
// @access Private

router.put(
  '/experience',
  [
    auth,
    [
      check('title', 'Add a title').not().isEmpty(),
      check('company', 'Add a company').not().isEmpty(),
      check('from', 'From date is required').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    // check for errors
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // gets the array of errors if any error is encountered
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, company, location, from, to, current, description } =
      req.body;

    // create an object with data received
    const newExp = { title, company, location, from, to, current, description };

    try {
      const profile = await Profile.findOne({ user: req.user.id });
      // add the experience received by the obj to the profile exp array
      profile.experience.unshift(newExp);
      // save the profile once the new data is added to the array
      await profile.save();
      // send the profile of the user as the response
      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error!');
    }
  }
);

// Delete experience from a profile
// @route DELETE api/profile/experience/:exp_id
// @desc Delete profile experience
// @access Private

router.delete('/experience/:exp_id', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });

    // get the remove index for removing experience
    const removeIndex = profile.experience
      .map(item => item.id)
      .indexOf(req.params.exp_id);
    // remove the experience using the index
    profile.experience.splice(removeIndex, 1);
    await profile.save();
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error!');
  }
});

// Add education to a profile
// @route PUT api/profile/education
// @desc Add profile education
// @access Private

router.put(
  '/education',
  [
    auth,
    [
      check('school', 'Add a school').not().isEmpty(),
      check('degree', 'Add a degree').not().isEmpty(),
      check('fieldofstudy', 'Add a field of study').not().isEmpty(),
      check('from', 'From date is required').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    // check for errors
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // gets the array of errors if any error is encountered
      return res.status(400).json({ errors: errors.array() });
    }

    const { school, degree, fieldofstudy, from, to, current, description } =
      req.body;

    // create an object with data received
    const newEdc = {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      description,
    };

    try {
      const profile = await Profile.findOne({ user: req.user.id });
      // add the experience received by the obj to the profile exp array
      profile.education.unshift(newEdc);
      // save the profile once the new data is added to the array
      await profile.save();
      // send the profile of the user as the response
      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error!');
    }
  }
);

// Delete education from a profile
// @route DELETE api/profile/education/:edc_id
// @desc Delete profile education
// @access Private

router.delete('/education/:edc_id', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });

    // get the remove index for removing experience
    const removeIndex = profile.education
      .map(item => item.id)
      .indexOf(req.params.edc_id);
    // remove the experience using the index
    profile.education.splice(removeIndex, 1);
    await profile.save();
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error!');
  }
});

module.exports = router;
