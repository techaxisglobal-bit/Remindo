const User = require('./User');
const Task = require('./Task');
const TaskAttendee = require('./TaskAttendee');

// Associations
User.hasMany(Task, { foreignKey: 'userId', as: 'tasks' });
Task.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Task.hasMany(TaskAttendee, { foreignKey: 'taskId', as: 'attendees', onDelete: 'CASCADE' });
TaskAttendee.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });

module.exports = {
    User,
    Task,
    TaskAttendee
};
