const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
// using both user and profile db models
const Post = require('../../models/Post');
const Profile = require('../../models/Profile');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');
const { response } = require('express');

// @route POST api/posts
// @desc Create a post
// @access Private
router.post(
  '/',
  [auth, [check('text', 'Text is required!').not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    // check for data validation errors
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // find the user in the DB and remove the password from the data passed
      const users = await User.findById(req.user.id).select('-password');

      // create a post object
      const newPost = new Post({
        text: req.body.text,
        name: users.name,
        avatar: users.avatar,
        user: req.user.id,
      });
      const post = await newPost.save();
      res.json(post);
    } catch (err) {
      if (err) {
        console.error(err.message);
        res.status(500).send('Server Error!');
      }
    }
  }
);

// @route GET api/posts
// @desc Get all posts
// @access Private
router.get('/', auth, async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error!');
  }
});

// @route GET api/posts/:id
// @desc Get post by id
// @access Private
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: 'Post not Found!' });
    }

    res.json(post);
  } catch (err) {
    console.error(err.message);
    if (err.kind == 'ObjectId') {
      return res.status(404).json({ msg: 'Post not Found!' });
    }
    res.status(500).send('Server Error!');
  }
});

// @route DELETE api/posts/:id
// @desc Delete a post by id
// @access Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    // check if the post is present or not
    if (!post) {
      return res.status(404).json({ msg: 'Post not Found!' });
    }

    // check if the user deleting the post is the same user that is logged in
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized!' });
    }
    // delete the post
    await post.remove();
    // send message
    res.json({ msg: 'Post deleted!' });
  } catch (err) {
    console.error(err.message);
    if (err.kind == 'ObjectId') {
      return res.status(404).json({ msg: 'Post not Found!' });
    }
    res.status(500).send('Server Error!');
  }
});

// @route PUT api/posts/like/:id
// @desc Like a post
// @access Private
router.put('/like/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    // check if the post is already liked
    if (
      post.likes.filter(like => like.user.toString() === req.user.id).length > 0
    ) {
      return res.status(400).json({ msg: 'Post already liked!' });
    }
    // like a post
    post.likes.unshift({ user: req.user.id });
    await post.save();
    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error!');
  }
});

// @route PUT api/posts/unlike/:id
// @desc Unlike a post
// @access Private
router.put('/unlike/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    // check if the post is already liked
    if (
      post.likes.filter(like => like.user.toString() === req.user.id).length ===
      0
    ) {
      return res.status(400).json({ msg: 'Post has not been liked yet!' });
    }
    // unlike a post
    // get the remove index
    const removeIndex = post.likes
      .map(like => like.user.toString())
      .indexOf(req.user.id);
    // remove the like
    post.likes.splice(removeIndex, 1);
    // save the post
    await post.save();
    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error!');
  }
});

// @route POST api/posts/comment/:id
// @desc Create a comment
// @access Private
router.post(
  '/comment/:id',
  [auth, [check('text', 'Text is required!').not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    // check for data validation errors
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select('-password');
      // find the post by id
      const post = await Post.findById(req.params.id);

      if (!post) {
        return res.status(404).json({ msg: 'Post not Found!' });
      }

      const newComment = {
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id,
      };

      post.comments.unshift(newComment);
      await post.save();
      res.json(post.comments);
    } catch (err) {
      if (err) {
        console.error(err.message);
        if (err.kind == 'ObjectId') {
          return res.status(404).json({ msg: 'Post not Found!' });
        }
        res.status(500).send('Server Error!');
      }
    }
  }
);

// @route DELETE api/posts/comment/:id/:comment_id
// @desc Delete a comment
// @access Private
router.delete('/comment/:id/:comment_id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    // pull out the comment by using the comment_id
    const comment = post.comments.find(
      comment => comment.id === req.params.comment_id
    );
    // check if the comment exists
    if (!comment) {
      return res.status(404).json({ msg: 'Comment does not exist!' });
    }
    // check if the user commented that comment
    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not an authorized user' });
    }
    // // get the remove index
    // const removeIndex = post.comments
    //   .map(comment => comment.user.toString())
    //   .indexOf(req.user.id);
    // // remove the comment using the index
    // post.comments.splice(removeIndex, 1);

    post.comments = post.comments.filter(
      ({ id }) => id !== req.params.comment_id
    );

    await post.save();
    res.json(post.comments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error!');
  }
});

module.exports = router;
