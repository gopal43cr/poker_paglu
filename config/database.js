const { MongoClient } = require('mongodb');
require('dotenv').config();

class Database {
    constructor() {
        this.client = null;
        this.db = null;
    }

    async connect() {
        // Return existing connection if available
        if (this.db) {
            return this.db;
        }

        try {
            this.client = new MongoClient(process.env.MONGODB_URI, {
                maxPoolSize: 1, // Limit connection pool for serverless
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            
            await this.client.connect();
            this.db = this.client.db(process.env.DATABASE_NAME);
            console.log('✅ Connected to MongoDB Atlas');
            return this.db;
        } catch (error) {
            console.error('❌ MongoDB connection error:', error);
            throw error; // Don't exit process in serverless
        }
    }

    getDb() {
        return this.db;
    }

    async close() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
            console.log('🔌 Disconnected from MongoDB');
        }
    }
}

module.exports = new Database();