const User = require('./User');
const Task = require('./Task');
const TaskAttendee = require('./TaskAttendee');
const Merchant = require('./Merchant');
const Notification = require('./Notification');
const Group = require('./Group');
const Friend = require('./Friend');


// Associations
User.hasMany(Task, { foreignKey: 'userId', as: 'tasks' });
Task.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Task.hasMany(TaskAttendee, { foreignKey: 'taskId', as: 'attendees', onDelete: 'CASCADE' });
TaskAttendee.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });

User.hasMany(Merchant, { foreignKey: 'userId', as: 'merchants' });
Merchant.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'recipient' });

User.hasMany(Notification, { foreignKey: 'senderId', as: 'sentNotifications' });
Notification.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

User.hasMany(Group, { foreignKey: 'userId', as: 'groups' });
Group.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

User.hasMany(Friend, { foreignKey: 'userId', as: 'friends' });
Friend.belongsTo(User, { foreignKey: 'userId', as: 'owner' });
Friend.belongsTo(User, { foreignKey: 'contactUserId', as: 'contactUser' });


module.exports = {
    User,
    Task,
    TaskAttendee,
    Merchant,
    Notification,
    Group,
    Friend
};
