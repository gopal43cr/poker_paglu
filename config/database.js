const { MongoClient } = require('mongodb');
require('dotenv').config();

class Database {
    constructor() {
        this.client = null;
        this.db = null;
    }

    async connect() {
        try {
            this.client = new MongoClient(process.env.MONGODB_URI);
            await this.client.connect();
            this.db = this.client.db(process.env.DATABASE_NAME);
            console.log('✅ Connected to MongoDB Atlas');
            return this.db;
        } catch (error) {
            console.error('❌ MongoDB connection error:', error);
            process.exit(1);
        }
    }

    getDb() {
        return this.db;
    }

    async close() {
        if (this.client) {
            await this.client.close();
            console.log('🔌 Disconnected from MongoDB');
        }
    }
}

module.exports = new Database();