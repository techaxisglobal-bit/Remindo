const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sequelize = require('./config/db');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost',
    'http://localhost:5173',
    'http://localhost:4173',
    'https://localhost',
    'capacitor://localhost',
    'ionic://localhost',
    'https://remindo.app',
    'capacitor://remindo.app',
    'http://remindo.app',
    'https://web.remaindo.com',
    'http://web.remaindo.com',
    'https://app.remaindo.com'
].filter(Boolean);

// Helper to check if origin is a Capacitor/Mobile app
const isMobileOrigin = (origin) => {
    return !origin || 
           origin.startsWith('capacitor://') || 
           origin.startsWith('ionic://') || 
           origin.includes('localhost') ||
           origin.includes('remindo.app') ||
           origin.includes('remaindo.com');
};

app.use(cors({
    origin: function (origin, callback) {
        // Allow all mobile/localhost origins or specific production domains
        if (isMobileOrigin(origin) || allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }
        console.error(`CORS blocked origin: ${origin}`);
        return callback(new Error(`CORS policy blocked: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'X-Requested-With'],
}));

// Handle preflight for all routes
app.options('*', cors());

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/attendees', require('./routes/attendees'));
app.use('/api/merchants', require('./routes/merchants'));
app.use('/api/invitations', require('./routes/invitations'));

app.get('/', (req, res) => {
    res.send('Backend running');
});

const User = require('./models/User');
app.get('/users', async (req, res) => {
    try {
        const users = await User.findAll({ attributes: ['id', 'name', 'email'] });
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Start notification scheduler
const { startNotificationScheduler } = require('./services/notificationService');

// Sync database and start server
sequelize.sync({ alter: true })
    .then(() => {
        console.log('PostgreSQL connected and tables synced');
        startNotificationScheduler();
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on all interfaces at port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });