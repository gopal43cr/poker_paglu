class PokerLeaderboard {
    constructor() {
        this.players = {};
        this.games = [];
        this.isLoading = false;
        this.init();
    }

    async init() {
        await this.loadAllData();
        this.renderLeaderboard();
        this.renderStats();
        this.renderRecentGames();
        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('gameForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addGame();
        });

        // Add refresh button event listener if it exists
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refresh();
            });
        }

        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.refresh();
            }
        });
    }

    // Load data from API
    async loadAllData() {
        try {
            this.showLoadingState(true);
            
            const [playersResponse, sessionsResponse] = await Promise.all([
                fetch('https://poka-poka-ebon.vercel.app/api/players'),
                fetch('https://poka-poka-ebon.vercel.app/api/sessions')
            ]);

            if (!playersResponse.ok || !sessionsResponse.ok) {
                throw new Error('Failed to fetch data from server');
            }

            const playersArray = await playersResponse.json();
            const sessions = await sessionsResponse.json();

            // Convert players array to object for easier access
            this.players = {};
            playersArray.forEach(player => {
                this.players[player.name] = player;
            });

            this.games = sessions;
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.showNotification('Failed to load data from server', 'error');
            
            // Fallback to empty data
            this.players = {};
            this.games = [];
        } finally {
            this.showLoadingState(false);
        }
    }

    // Add new game via API
    async addGame() {
        const playerName = document.getElementById('playerName').value.trim();
        const result = document.getElementById('gameResult').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const gameType = document.getElementById('gameType').value;

        if (!playerName || !result || !amount || !gameType) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        if (amount < 0) {
            this.showNotification('Amount must be greater than or equal to 0', 'error');
            return;
        }

        try {
            this.showLoadingState(true);
            
            const response = await fetch('https://poka-poka-ebon.vercel.app/api/game', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playerName,
                    result,
                    amount,
                    gameType
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Reset form
                document.getElementById('gameForm').reset();
                
                // Reload all data
                await this.loadAllData();
                
                // Re-render everything
                this.renderLeaderboard();
                this.renderStats();
                this.renderRecentGames();
                
                this.showNotification(`Game recorded for ${playerName}!`, 'success');
            } else {
                throw new Error(data.error || 'Failed to record game');
            }
            
        } catch (error) {
            console.error('Error recording game:', error);
            this.showNotification(
                error.message || 'Failed to record game. Please try again.', 
                'error'
            );
        } finally {
            this.showLoadingState(false);
        }
    }

    showLoadingState(loading) {
        this.isLoading = loading;
        const submitBtn = document.querySelector('.btn');
        
        if (loading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="loading"></div> Recording...';
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Record Game';
        }

        // Also handle refresh button if it exists
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.disabled = loading;
            if (loading) {
                refreshBtn.innerHTML = '<div class="loading"></div> Refreshing...';
            } else {
                refreshBtn.innerHTML = '🔄 Refresh';
            }
        }
    }

    showNotification(message, type = 'success') {
        // Remove any existing notifications
        const existing = document.querySelector('.notification');
        if (existing) {
            existing.remove();
        }

        const notification = document.createElement('div');
        notification.className = 'notification';
        
        const bgColor = type === 'success' 
            ? 'linear-gradient(45deg, #10b981, #059669)' 
            : 'linear-gradient(45deg, #ef4444, #dc2626)';
        const shadowColor = type === 'success' 
            ? 'rgba(16, 185, 129, 0.3)' 
            : 'rgba(239, 68, 68, 0.3)';
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 1000;
            font-weight: 600;
            box-shadow: 0 4px 12px ${shadowColor};
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);

        // Auto remove after 4 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 4000);

        // Allow manual removal by clicking
        notification.addEventListener('click', () => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        });
    }

    renderLeaderboard() {
        const leaderboard = document.getElementById('leaderboard');
        const sortedPlayers = Object.values(this.players)
            .sort((a, b) => b.totalWinnings - a.totalWinnings);

        if (sortedPlayers.length === 0) {
            leaderboard.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎲</div>
                    <p>No games recorded yet. Add your first game to get started!</p>
                </div>
            `;
            return;
        }

        leaderboard.innerHTML = sortedPlayers.map((player, index) => {
            const rank = index + 1;
            const rankClass = rank === 1 ? 'first' : rank === 2 ? 'second' : rank === 3 ? 'third' : '';
            const winRate = player.gamesPlayed > 0 ? Math.round((player.wins / player.gamesPlayed) * 100) : 0;
            const avgWin = player.wins > 0 ? (player.totalWon / player.wins).toFixed(0) : 0;

            return `
                <div class="player-row">
                    <div class="rank ${rankClass}">#${rank}</div>
                    <div class="player-info">
                        <div class="player-name">${this.escapeHtml(player.name)}</div>
                        <div class="player-stats">
                            ${player.gamesPlayed} games • ${winRate}% win rate • Avg win: $${avgWin}
                        </div>
                    </div>
                    <div class="player-score" style="color: ${player.totalWinnings >= 0 ? '#10b981' : '#ef4444'}">
                        ${player.totalWinnings >= 0 ? '+' : ''}$${player.totalWinnings.toFixed(2)}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderStats() {
        const totalGames = this.games.length;
        const totalPlayers = Object.keys(this.players).length;
        const biggestWin = Math.max(0, ...Object.values(this.players).map(p => p.biggestWin || 0));
        
        // Calculate average pot from all games
        const allAmounts = this.games.map(g => Math.abs(g.amount || 0));
        const avgPot = allAmounts.length > 0 ? (allAmounts.reduce((a, b) => a + b, 0) / allAmounts.length) : 0;

        document.getElementById('totalGames').textContent = totalGames;
        document.getElementById('totalPlayers').textContent = totalPlayers;
        document.getElementById('biggestWin').textContent = `$${biggestWin.toFixed(0)}`;
        document.getElementById('avgPot').textContent = `$${avgPot.toFixed(0)}`;
    }

    renderRecentGames() {
        const recentGamesContainer = document.getElementById('recentGames');
        const recentGames = this.games.slice(0, 10);

        if (recentGames.length === 0) {
            recentGamesContainer.innerHTML = '<p style="color: #64748b; text-align: center; padding: 20px;">No games yet</p>';
            return;
        }

        recentGamesContainer.innerHTML = recentGames.map(game => {
            const gameDate = new Date(game.date || game.createdAt);
            const date = gameDate.toLocaleDateString();
            const time = gameDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const resultIcon = game.result === 'win' ? '🏆' : '💸';
            const amountColor = (game.amount || 0) >= 0 ? '#10b981' : '#ef4444';
            const sign = (game.amount || 0) >= 0 ? '+' : '';

            // Format game type
            const gameTypeFormatted = (game.gameType || 'unknown')
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            return `
                <div class="game-entry">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${resultIcon} ${this.escapeHtml(game.playerName || 'Unknown')}</strong>
                            <span style="margin-left: 10px; color: #94a3b8;">${gameTypeFormatted}</span>
                        </div>
                        <div style="color: ${amountColor}; font-weight: 600;">
                            ${sign}$${Math.abs(game.amount || 0).toFixed(2)}
                        </div>
                    </div>
                    <div class="game-date">${date} at ${time}</div>
                </div>
            `;
        }).join('');
    }

    // Utility function to escape HTML to prevent XSS
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    // Utility function to format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
    }

    // Utility function to format date
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Refresh data manually
    async refresh() {
        await this.loadAllData();
        this.renderLeaderboard();
        this.renderStats();
        this.renderRecentGames();
        this.showNotification('Data refreshed successfully!', 'success');
    }

    // Additional utility methods

    // Get player statistics
    getPlayerStats(playerName) {
        return this.players[playerName] || null;
    }

    // Get top performers
    getTopPerformers(limit = 5) {
        return Object.values(this.players)
            .sort((a, b) => b.totalWinnings - a.totalWinnings)
            .slice(0, limit);
    }

    // Get recent games for a specific player
    getPlayerRecentGames(playerName, limit = 5) {
        return this.games
            .filter(game => game.playerName === playerName)
            .slice(0, limit);
    }

    // Calculate win streaks
    getPlayerWinStreak(playerName) {
        const playerGames = this.games
            .filter(game => game.playerName === playerName)
            .reverse(); // Get chronological order

        let currentStreak = 0;
        for (const game of playerGames) {
            if (game.result === 'win') {
                currentStreak++;
            } else {
                break;
            }
        }
        return currentStreak;
    }

    // Export data as JSON
    exportData() {
        const data = {
            players: this.players,
            games: this.games,
            exportDate: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `poker-leaderboard-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showNotification('Data exported successfully!', 'success');
    }

    // Clear all data (with confirmation)
    async clearAllData() {
        if (!confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch('https://poka-poka-ebon.vercel.app/api/clear-all', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                this.players = {};
                this.games = [];
                this.renderLeaderboard();
                this.renderStats();
                this.renderRecentGames();
                this.showNotification('All data cleared successfully!', 'success');
            } else {
                throw new Error('Failed to clear data');
            }
        } catch (error) {
            console.error('Error clearing data:', error);
            this.showNotification('Failed to clear data', 'error');
        }
    }
}

// Initialize the leaderboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pokerLeaderboard = new PokerLeaderboard();
});

// Add required CSS animations if not present
if (!document.querySelector('#notification-animations')) {
    const style = document.createElement('style');
    style.id = 'notification-animations';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .loading {
            width: 16px;
            height: 16px;
            border: 2px solid #ffffff;
            border-top: 2px solid transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            display: inline-block;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}