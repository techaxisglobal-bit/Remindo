const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TaskAttendee = sequelize.define('TaskAttendee', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    taskId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('Pending', 'Accepted', 'Declined', 'Cancelled'),
        defaultValue: 'Pending',
    },
    token: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    acceptedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    sharedTaskId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    }
}, {
    tableName: 'task_attendees',
    timestamps: true,
});

module.exports = TaskAttendee;
