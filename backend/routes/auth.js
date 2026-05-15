const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { OAuth2Client } = require('google-auth-library');
const emailService = require('../services/emailService');

// @route   POST api/auth/signup
// @desc    Register new user (sends OTP for email verification)
// @access  Public
router.post('/signup', async (req, res) => {
    let { name, email, password } = req.body;
    if (email) email = email.trim().toLowerCase();
    if (password) password = password.trim();
    if (!email || !email.includes('@') || !email.includes('.')) {
        return res.status(400).json({ msg: 'Please provide a valid email address' });
    }
    email = email.toLowerCase();

    try {
        console.log(`Signup attempt for: ${email}`);
        let user = await User.findOne({ where: { email } });

        if (user) {
            console.log(`User found in DB. Name: ${user.name}, isVerified: ${user.isVerified}`);
            if (user.isVerified) {
                console.log(`Blocking signup because user is already verified.`);
                return res.status(400).json({ msg: 'User already exists' });
            }
            console.log(`User exists but is NOT verified. Proceeding to update.`);
        } else {
            console.log(`User not found in DB. Proceeding to create.`);
        }

        // Generate 6-digit OTP for email verification
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        if (user) {
            // User exists but is not verified, update their info
            user.name = name;
            user.password = password;
            user.otp = otp;
            user.otpExpires = otpExpires;
            await user.save();
        } else {
            // Create new record for new user
            user = await User.create({
                name,
                email,
                password,
                otp,
                otpExpires,
                isVerified: false
            });
        }

        // Send real email OTP
        await emailService.sendOTP(email, otp, 'signup');

        await ActivityLog.create({
            userId: user.id,
            action: 'SIGNUP_INITIATED',
            details: { email: user.email },
            ipAddress: req.ip
        });

        res.json({ msg: 'OTP sent to email', email });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/verify
// @desc    Verify signup OTP and log user in
// @access  Public
router.post('/verify', async (req, res) => {
    let { email, otp } = req.body;
    if (email) email = email.trim().toLowerCase();
    if (otp) otp = otp.trim();

    try {
        let user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid email' });
        }

        if (user.otp !== otp || user.otpExpires < new Date()) {
            return res.status(400).json({ msg: 'Invalid or expired OTP' });
        }

        // Mark as verified
        user.isVerified = true;
        user.otp = null;
        user.otpExpires = null;
        await user.save();

        await ActivityLog.create({
            userId: user.id,
            action: 'SIGNUP_VERIFIED',
            ipAddress: req.ip
        });

        const payload = { user: { id: user.id } };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret',
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    let { email, password } = req.body;
    if (email) email = email.trim().toLowerCase();
    if (password) password = password.trim();

    try {
        let user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid email' });
        }

        if (!user.isVerified) {
            return res.status(400).json({ msg: 'Please verify your email first' });
        }

        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            await ActivityLog.create({
                action: 'LOGIN_FAILURE',
                details: { email, reason: 'Invalid password' },
                ipAddress: req.ip
            });
            return res.status(400).json({ msg: 'Invalid password' });
        }

        await ActivityLog.create({
            userId: user.id,
            action: 'LOGIN_SUCCESS',
            ipAddress: req.ip
        });

        const payload = { user: { id: user.id } };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret',
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});

// @route   POST api/auth/forgot-password
// @desc    Send OTP for password reset
// @access  Public
router.post('/forgot-password', async (req, res) => {
    let { email } = req.body;
    if (email) email = email.trim().toLowerCase();
    if (!email || !email.includes('@') || !email.includes('.')) {
        return res.status(400).json({ msg: 'Please provide a valid email address' });
    }

    try {
        let user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(400).json({ msg: 'No account found with that email' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetOtp = otp;
        user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        // Send real email OTP for password reset
        await emailService.sendOTP(email, otp, 'reset');

        res.json({ msg: 'OTP sent to your email' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/reset-password
// @desc    Verify OTP and reset password
// @access  Public
router.post('/reset-password', async (req, res) => {
    let { email, otp, newPassword } = req.body;
    if (email) email = email.trim().toLowerCase();
    if (otp) otp = otp.trim();
    if (newPassword) newPassword = newPassword.trim();

    try {
        let user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid email' });
        }

        if (user.resetOtp !== otp || user.resetOtpExpires < new Date()) {
            return res.status(400).json({ msg: 'Invalid or expired OTP' });
        }

        user.password = newPassword;
        user.resetOtp = null;
        user.resetOtpExpires = null;
        await user.save();

        res.json({ msg: 'Password reset successful. You can now log in.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/google
// @desc    Authenticate via Google OAuth
// @access  Public
router.post('/google', async (req, res) => {
    const { credential } = req.body;

    try {
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: [
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_ANDROID_CLIENT_ID,
            ].filter(Boolean),
        });

        const payload = ticket.getPayload();
        const { email, name } = payload;

        let user = await User.findOne({ where: { email: email.toLowerCase() } });

        if (!user) {
            const randomPass = require('crypto').randomBytes(32).toString('hex');
            user = await User.create({
                name: name || email.split('@')[0],
                email: email.toLowerCase(),
                password: randomPass,
                isVerified: true,
            });
        } else if (!user.isVerified) {
            user.isVerified = true;
            await user.save();
        }

        const jwtPayload = { user: { id: user.id } };

        jwt.sign(
            jwtPayload,
            process.env.JWT_SECRET || 'secret',
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
            }
        );
    } catch (err) {
        console.error('Google auth error:', err.message);
        res.status(401).json({ msg: 'Google authentication failed' });
    }
});

// @route   POST api/auth/apple
// @desc    Authenticate via Apple Sign-In
// @access  Public
const appleSignin = require('apple-signin-auth');
router.post('/apple', async (req, res) => {
    const { id_token, user: appleUser } = req.body;

    try {
        const { email, sub: appleId } = await appleSignin.verifyIdToken(id_token, {
            audience: process.env.APPLE_CLIENT_ID,
            ignoreExpiration: false,
        });

        let user = await User.findOne({ where: { email: email.toLowerCase() } });

        if (!user) {
            let name = appleId;
            if (appleUser && appleUser.name) {
                name = `${appleUser.name.firstName} ${appleUser.name.lastName}`.trim();
            }

            const randomPass = require('crypto').randomBytes(32).toString('hex');
            user = await User.create({
                name: name || email.split('@')[0],
                email: email.toLowerCase(),
                password: randomPass,
                isVerified: true,
            });
        } else if (!user.isVerified) {
            user.isVerified = true;
            await user.save();
        }

        const jwtPayload = { user: { id: user.id } };

        jwt.sign(
            jwtPayload,
            process.env.JWT_SECRET || 'secret',
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
            }
        );
    } catch (err) {
        console.error('Apple auth error:', err.message);
        res.status(401).json({ msg: 'Apple authentication failed' });
    }
});

// @route   PUT api/auth/update-name
// @desc    Update user name
// @access  Private
const auth = require('../middleware/auth');
router.put('/update-name', auth, async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ msg: 'Name is required' });
    }

    try {
        let user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        user.name = name;
        await user.save();

        res.json({ msg: 'Name updated successfully', user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/save-subscription
// @desc    Save push subscription for user
// @access  Private
router.post('/save-subscription', auth, async (req, res) => {
    const { subscription } = req.body;

    try {
        let user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        user.pushSubscription = subscription;
        await user.save();

        res.json({ msg: 'Subscription saved successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/auth/update-notifications
// @desc    Toggle notifications for user
// @access  Private
router.put('/update-notifications', auth, async (req, res) => {
    const { enabled } = req.body;

    try {
        let user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        user.notificationsEnabled = enabled;
        await user.save();

        res.json({ msg: 'Notification settings updated', enabled: user.notificationsEnabled });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


// @route   PUT api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ msg: 'All fields are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ msg: 'New password must be at least 6 characters' });
  }

  try {
    let user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid current password' });
    }

    user.password = newPassword;
    await user.save();

    await ActivityLog.create({
      userId: user.id,
      action: 'PASSWORD_CHANGED',
      ipAddress: req.ip
    });

    res.json({ msg: 'Password changed successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
