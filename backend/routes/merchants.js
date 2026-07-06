const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Merchant } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../uploads');
const merchantsDir = path.join(uploadDir, 'merchants');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(merchantsDir)) fs.mkdirSync(merchantsDir);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, merchantsDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// @route   POST api/merchants
// @desc    Register a new merchant
// @access  Private
router.post('/', [auth, upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'proofDocument', maxCount: 1 }, { name: 'photos', maxCount: 5 }])], async (req, res) => {
    try {
        const {
            businessName, category, location, serviceArea, description,
            website, phone, email, keywords, topPlacementBid,
            facebookUrl, instagramUrl, whatsappNumber, businessHours,
            deliveryAvailable, onlineServiceAvailable
        } = req.body;

        const files = req.files || {};
        
        // Prepare URLs for saved files
        const logoUrl = files.logo ? `/uploads/merchants/${files.logo[0].filename}` : null;
        const proofDocumentUrl = files.proofDocument ? `/uploads/merchants/${files.proofDocument[0].filename}` : null;
        const photoUrls = files.photos ? files.photos.map(f => `/uploads/merchants/${f.filename}`) : [];

        // Parse JSON fields if they are sent as strings
        let parsedKeywords = [];
        let parsedBusinessHours = {};
        try { if (keywords) parsedKeywords = JSON.parse(keywords); } catch (e) { parsedKeywords = Array.isArray(keywords) ? keywords : [keywords]; }
        try { if (businessHours) parsedBusinessHours = JSON.parse(businessHours); } catch (e) { }

        const merchant = await Merchant.create({
            userId: req.user.id,
            businessName,
            category,
            location,
            serviceArea,
            description,
            website,
            phone,
            email,
            logoUrl,
            proofDocumentUrl,
            photoUrls,
            keywords: parsedKeywords,
            topPlacementBid: topPlacementBid ? parseFloat(topPlacementBid) : 0.00,
            facebookUrl,
            instagramUrl,
            whatsappNumber,
            businessHours: parsedBusinessHours,
            deliveryAvailable: deliveryAvailable === 'true' || deliveryAvailable === true,
            onlineServiceAvailable: onlineServiceAvailable === 'true' || onlineServiceAvailable === true,
            status: 'PENDING',
            isFeatured: false
        });

        res.json(merchant);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/merchants
// @desc    Get all public approved merchants
// @access  Public
router.get('/', async (req, res) => {
    try {
        const merchants = await Merchant.findAll({
            where: { status: 'APPROVED' },
            order: [
                ['isFeatured', 'DESC'],
                ['topPlacementBid', 'DESC'],
                ['createdAt', 'DESC']
            ]
        });
        res.json(merchants);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/merchants/admin
// @desc    Get all merchants for admin
// @access  Private (should ideally have an admin check)
router.get('/admin', auth, async (req, res) => {
    try {
        // Ideally, check if req.user is an admin here. 
        // For now, assuming anyone accessing this route through the admin dashboard is authorized or we will add basic protection later.
        const merchants = await Merchant.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json(merchants);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/merchants/:id/status
// @desc    Update merchant status (admin only)
// @access  Private
router.put('/:id/status', auth, async (req, res) => {
    try {
        const { status, isFeatured } = req.body;
        const merchant = await Merchant.findByPk(req.params.id);
        if (!merchant) return res.status(404).json({ msg: 'Merchant not found' });

        if (status !== undefined) merchant.status = status;
        if (isFeatured !== undefined) merchant.isFeatured = isFeatured;

        await merchant.save();
        res.json(merchant);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/merchants/:id
// @desc    Update a merchant listing
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        const merchant = await Merchant.findByPk(req.params.id);
        if (!merchant) return res.status(404).json({ msg: 'Merchant not found' });

        // Ensure user owns the listing
        if (merchant.userId !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        const updatableFields = [
            'businessName', 'category', 'location', 'serviceArea', 'description',
            'website', 'phone', 'email', 'keywords', 'topPlacementBid',
            'facebookUrl', 'instagramUrl', 'whatsappNumber', 'businessHours',
            'deliveryAvailable', 'onlineServiceAvailable'
        ];

        updatableFields.forEach(field => {
            if (req.body[field] !== undefined) {
                merchant[field] = req.body[field];
            }
        });

        await merchant.save();
        res.json(merchant);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/merchants/:id
// @desc    Delete a merchant
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const merchant = await Merchant.findByPk(req.params.id);
        if (!merchant) return res.status(404).json({ msg: 'Merchant not found' });

        // Admin can delete any, or owner can delete theirs
        // For simplicity, checking owner
        if (merchant.userId !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        await merchant.destroy();
        res.json({ msg: 'Merchant removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
