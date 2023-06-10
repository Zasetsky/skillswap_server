const express = require('express');
const connectDB = require('./config/db');

// Observer
const setupCronJobs = require('./services/cronIndex');

// Routes
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const skillRoutes = require('./routes/skillRoutes');
const matchingRoutes = require('./routes/matchingRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

// Controllers
const swapRequestController = require('./controllers/swapRequestController');
const chatController = require('./controllers/chatController');
const dealController = require('./controllers/dealController');
const onlineUsersController = require('./controllers/onlineUsersController');

const { createReview } = require('./controllers/reviewController');

const cors = require('cors');
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: 'http://localhost:8080',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }
});


connectDB();

app.use(cors({
  origin: 'http://localhost:8080',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Access-Control-Allow-Credentials'],
}));

app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(err.status || 500).send('Internal Server Error');
});

app.use(express.static(path.join(__dirname, '../public')));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/reviews', reviewRoutes);

// WebSocket
onlineUsersController(io);
chatController(io);
swapRequestController(io);
dealController(io);
createReview(io);

// Observer
setupCronJobs(io);
  
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
  