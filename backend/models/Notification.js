const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    senderId: {
        type: DataTypes.INTEGER,
        allowNull: true, // System notifications might not have a sender
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    type: {
        type: DataTypes.ENUM('Reminder', 'Invitation', 'Shared Reminder', 'System'),
        allowNull: false,
        defaultValue: 'System'
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    relatedTaskId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    actionUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('Unread', 'Read', 'Accepted', 'Declined'),
        allowNull: false,
        defaultValue: 'Unread'
    }
}, {
    tableName: 'notifications',
    timestamps: true
});

module.exports = Notification;
