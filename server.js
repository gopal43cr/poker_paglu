const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const database = require('./config/database');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize database connection
let db;
database.connect().then((database) => {
    db = database;
});

// API Routes
app.get('/api/players', async (req, res) => {
    try {
        const players = await db.collection('Players').find({}).toArray();
        res.json(players);
    } catch (error) {
        console.error('Error fetching players:', error);
        res.status(500).json({ error: 'Failed to fetch players' });
    }
});

app.get('/api/sessions', async (req, res) => {
    try {
        const sessions = await db.collection('Sessions')
            .find({})
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray();
        res.json(sessions);
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

app.post('/api/game', async (req, res) => {
    try {
        const { playerName, result, amount, gameType } = req.body;

        if (!playerName || !result || !amount || !gameType) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const gameAmount = result === 'win' ? amount : -amount;
        const now = new Date();

        // Find or create player
        let player = await db.collection('Players').findOne({ name: playerName });
        
        if (!player) {
            player = {
                name: playerName,
                totalWinnings: 0,
                gamesPlayed: 0,
                wins: 0,
                losses: 0,
                biggestWin: 0,
                totalWon: 0,
                totalLost: 0,
                createdAt: now,
                updatedAt: now
            };
            
            const insertResult = await db.collection('Players').insertOne(player);
            player._id = insertResult.insertedId;
        }

        // Update player stats
        const updateData = {
            totalWinnings: player.totalWinnings + gameAmount,
            gamesPlayed: player.gamesPlayed + 1,
            updatedAt: now
        };

        if (result === 'win') {
            updateData.wins = player.wins + 1;
            updateData.totalWon = player.totalWon + amount;
            updateData.biggestWin = Math.max(player.biggestWin, amount);
        } else {
            updateData.losses = player.losses + 1;
            updateData.totalLost = player.totalLost + amount;
        }

        await db.collection('Players').updateOne(
            { _id: player._id },
            { $set: updateData }
        );

        // Create session record
        const session = {
            playerName,
            playerId: player._id,
            result,
            amount: gameAmount,
            gameType,
            date: now,
            createdAt: now
        };

        await db.collection('Sessions').insertOne(session);

        // Update leaderboard
        await updateLeaderboard();

        res.json({ success: true, message: 'Game recorded successfully' });

    } catch (error) {
        console.error('Error recording game:', error);
        res.status(500).json({ error: 'Failed to record game' });
    }
});

async function updateLeaderboard() {
    try {
        const players = await db.collection('Players').find({}).toArray();
        
        const leaderboardData = players
            .sort((a, b) => b.totalWinnings - a.totalWinnings)
            .map((player, index) => ({
                ...player,
                rank: index + 1,
                winRate: player.gamesPlayed > 0 ? (player.wins / player.gamesPlayed) * 100 : 0,
                avgWin: player.wins > 0 ? player.totalWon / player.wins : 0,
                updatedAt: new Date()
            }));

        // Clear and repopulate leaderboard
        await db.collection('Leaderboard').deleteMany({});
        if (leaderboardData.length > 0) {
            await db.collection('Leaderboard').insertMany(leaderboardData);
        }
    } catch (error) {
        console.error('Error updating leaderboard:', error);
    }
}

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n⏹️  Shutting down server...');
    await database.close();
    process.exit(0);
});