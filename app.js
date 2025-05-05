// 初始化 GUN
const gun = Gun({
    peers: ['https://gun-manhattan.herokuapp.com/gun'] // 使用公共 relay peer
});

// 遊戲狀態管理
const game = gun.get('drawingGame');
const players = game.get('players');
const currentGame = game.get('currentGame');

// 玩家資訊
let currentPlayer = null;
let isDrawer = false;

// DOM 元素
const loginSection = document.getElementById('login-section');
const gameSection = document.getElementById('game-section');
const playerName = document.getElementById('player-name');
const joinBtn = document.getElementById('join-btn');
const playerCount = document.getElementById('player-count');
const currentDrawer = document.getElementById('current-drawer');
const wordSection = document.getElementById('word-section');
const wordInput = document.getElementById('word-input');
const submitWord = document.getElementById('submit-word');
const guessInput = document.getElementById('guess-input');
const submitGuess = document.getElementById('submit-guess');
const messages = document.getElementById('messages');

// 加入遊戲
joinBtn.addEventListener('click', () => {
    const name = playerName.value.trim();
    if (name) {
        currentPlayer = {
            id: Math.random().toString(36).substr(2, 9),
            name: name,
            score: 0
        };
        
        players.get(currentPlayer.id).put(currentPlayer);
        loginSection.style.display = 'none';
        gameSection.style.display = 'block';
        
        // 檢查是否為第一個玩家
        checkAndStartGame();
        addMessage('系統', `${name} 加入了遊戲！`);
    }
});

// 監聽玩家數量變化
players.map().on((player, id) => {
    updatePlayerCount();
});

// 更新玩家數量
function updatePlayerCount() {
    let count = 0;
    players.map().once((player) => {
        if (player) count++;
    });
    playerCount.textContent = count;
}

// 檢查並開始遊戲
function checkAndStartGame() {
    currentGame.once((game) => {
        if (!game || !game.active) {
            startNewRound();
        }
    });
}

// 開始新回合
function startNewRound() {
    players.map().once((player, id) => {
        if (player && (!currentGame.active || currentGame.lastDrawer !== id)) {
            currentGame.put({
                active: true,
                drawer: id,
                lastDrawer: id,
                word: '',
                status: 'waiting'
            });
        }
    });
}

// 監聽遊戲狀態
currentGame.on((gameState) => {
    if (!gameState) return;
    
    isDrawer = gameState.drawer === currentPlayer?.id;
    currentDrawer.textContent = `輪到 ${getPlayerName(gameState.drawer)} 出題`;
    
    if (isDrawer) {
        wordSection.style.display = 'block';
        guessInput.disabled = true;
        submitGuess.disabled = true;
    } else {
        wordSection.style.display = 'none';
        guessInput.disabled = false;
        submitGuess.disabled = false;
    }
});

// 提交詞語
submitWord.addEventListener('click', () => {
    const word = wordInput.value.trim();
    if (word && isDrawer) {
        currentGame.get('word').put(word);
        addMessage('系統', '題目已設定，請其他玩家開始猜測！');
        wordInput.value = '';
    }
});

// 提交猜測
submitGuess.addEventListener('click', () => {
    const guess = guessInput.value.trim();
    if (!guess || isDrawer) return;
    
    currentGame.get('word').once((word) => {
        if (guess.toLowerCase() === word.toLowerCase()) {
            addMessage('系統', `恭喜 ${currentPlayer.name} 猜對了！答案是：${word}`);
            // 更新分數
            players.get(currentPlayer.id).get('score').once((score) => {
                players.get(currentPlayer.id).get('score').put((score || 0) + 1);
            });
            // 開始新回合
            setTimeout(startNewRound, 2000);
        } else {
            addMessage(currentPlayer.name, `猜測：${guess}`);
        }
        guessInput.value = '';
    });
});

// 新增訊息到聊天框
function addMessage(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender === '系統' ? 'system-message' : 
        (sender === currentPlayer?.name ? 'player-message' : 'other-message')}`;
    messageDiv.textContent = `${sender}: ${text}`;
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
}

// 取得玩家名稱
function getPlayerName(id) {
    let name = '未知玩家';
    players.get(id).once((player) => {
        if (player) name = player.name;
    });
    return name;
}

// 定期清理離線玩家（這裡使用簡單的方式，實際應用中可能需要更複雜的機制）
setInterval(() => {
    players.map().once((player, id) => {
        if (player && player.lastActive && Date.now() - player.lastActive > 30000) {
            players.get(id).put(null);
        }
    });
}, 10000);