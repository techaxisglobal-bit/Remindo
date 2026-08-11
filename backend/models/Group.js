const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Group = sequelize.define('Group', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    members: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: []
    }
}, {
    tableName: 'groups',
    timestamps: true
});

module.exports = Group;
