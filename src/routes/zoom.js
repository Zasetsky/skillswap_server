const express = require('express');
const axios = require('axios');
const User = require('../models/user');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();
const socketIO = require('socket.io-client');
require('dotenv').config();

const client_id = process.env.ZOOM_CLIENT_ID;
const client_secret = process.env.ZOOM_CLIENT_SECRET;
const redirect_uri = process.env.ZOOM_REDIRECT_URI;


router.get('/auth/start', async (req, res) => {
    try {
        const state = JSON.stringify({
            token: req.query.state,
            senderId: req.query.senderId,
            acceptedRequestId: req.query.acceptedRequestId
        });

        const authUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${encodeURIComponent(state)}&scope=user:write:admin%20user:read:admin`;
        res.status(200).send({ authUrl: authUrl });
    } catch (error) {
        console.error('Ошибка при обработке запроса /auth/start:', error);
        res.status(500).send({ error: 'Ошибка на сервере' });
    }
});

router.get('/auth', (req, res, next) => {
    const stateData = JSON.parse(decodeURIComponent(req.query.state));
    req.headers.authorization = `Bearer ${stateData.token}`;
    req.senderId = stateData.senderId;
    req.acceptedRequestId = stateData.acceptedRequestId;
    authMiddleware(req, res, next);
}, async (req, res) => {
    try {
        const code = req.query.code;
        const senderId = req.senderId;
        const acceptedRequestId = req.acceptedRequestId;
        const authData = {
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirect_uri,
        };
        
        const authRes = await axios.post('https://zoom.us/oauth/token', null, {
            params: authData,
            headers: {
            Authorization: `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString('base64')}`,
            },
        });
        
        const accessToken = authRes.data.access_token;
        const userRes = await axios.get('https://api.zoom.us/v2/users/me', {
            headers: {
            Authorization: `Bearer ${accessToken}`,
            },
        });
        
            const zoomId = userRes.data.id;
        // Заглушка для связи Zoom ID с пользователем:
            await User.findByIdAndUpdate(req.userId, { zoomId: zoomId });
            
            // В случае успешной записи
            res.send(`
                <script>
                    console.log('Отправка данных с сервера: senderId:', '${senderId}', 'acceptedRequestId:', '${acceptedRequestId}');
                    window.opener.postMessage({ success: true, senderId: '${senderId}', acceptedRequestId: '${acceptedRequestId}' }, '*');
                    window.close();
                </script>
            `);

  } catch (error) {
    // В случае неудачи
    res.status(400).send(`
        <script>
            window.opener.postMessage({ success: false, error: 'Описание ошибки' }, '*');
            window.close();
        </script>
    `);
  }
});

module.exports = router;
