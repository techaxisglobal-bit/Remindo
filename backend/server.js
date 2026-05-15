const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sequelize = require('./config/db');

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
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (native mobile apps, Postman, curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
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

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/chat', require('./routes/chat'));

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