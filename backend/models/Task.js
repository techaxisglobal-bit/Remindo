const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Task = sequelize.define('Task', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        defaultValue: '',
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    date: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    time: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    duration: {
        type: DataTypes.INTEGER,
        defaultValue: 60,
    },
    location: {
        type: DataTypes.STRING,
        defaultValue: '',
    },
    isAllDay: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    isSpecial: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    specialType: {
        type: DataTypes.STRING,
        defaultValue: 'other',
    },
    notifyAt: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    notifyBefore: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    completed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    notifiedTime: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    notifiedBefore: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    tableName: 'tasks',
    timestamps: true,
});

module.exports = Task;
