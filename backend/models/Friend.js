const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Friend = sequelize.define('Friend', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    contactUserId: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    lastInvitedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    }
}, {
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['userId', 'email']
        }
    ]
});

module.exports = Friend;
