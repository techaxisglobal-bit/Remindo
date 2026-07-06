const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Merchant = sequelize.define('Merchant', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    businessName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    location: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    serviceArea: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    website: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    logoUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    photoUrls: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    proofDocumentUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    keywords: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    topPlacementBid: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
    },
    facebookUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    instagramUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    whatsappNumber: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    businessHours: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    deliveryAvailable: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    onlineServiceAvailable: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'),
        defaultValue: 'PENDING',
    },
    isFeatured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    tableName: 'merchants',
    timestamps: true,
});

module.exports = Merchant;
