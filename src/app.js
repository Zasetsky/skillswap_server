const express = require('express');
const connectDB = require('./config/db');
const bodyParser = require('body-parser');

const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const skillRoutes = require('./routes/skillRoutes');
const matchingRoutes = require('./routes/matchingRoutes');


const cors = require('cors');
const path = require('path');

const app = express();
connectDB();

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use(cors({
  origin: 'http://localhost:8080', // Or any other specific domain you want to allow
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));


app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(err.status || 500).send('Internal Server Error');
});

app.use(express.static(path.join(__dirname, '../public')));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/matching', matchingRoutes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

