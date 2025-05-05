// 初始化 GUN
const gun = Gun({
    peers: ['https://gun-manhattan.herokuapp.com/gun']
});

// 遊戲狀態管理
const game = gun.get('guessingGame');
const players = game.get('players');
const currentGame = game.get('currentGame');

// 玩家資訊
let currentPlayer = null;
let isGuesser = false;

// DOM 元素
const loginSection = document.getElementById('login-section');
const gameSection = document.getElementById('game-section');
const playerName = document.getElementById('player-name');
const joinBtn = document.getElementById('join-btn');
const playerCount = document.getElementById('player-count');
const currentGuesser = document.getElementById('current-guesser');
const wordDisplay = document.getElementById('word-display');
const currentWord = document.getElementById('current-word');
const hintSection = document.getElementById('hint-section');
const hintInput = document.getElementById('hint-input');
const submitHint = document.getElementById('submit-hint');
const guessSection = document.getElementById('guess-section');
const guessInput = document.getElementById('guess-input');
const submitGuess = document.getElementById('submit-guess');
const startRoundBtn = document.getElementById('start-round');
const messages = document.getElementById('messages');

// 新增計時器和計分板相關變數
const timerDisplay = document.getElementById('timer');
const playerScores = document.getElementById('player-scores');
let timer;
const ROUND_TIME = 60; // 每回合60秒

// 加入遊戲
joinBtn.addEventListener('click', () => {
    const name = playerName.value.trim();
    if (name) {
        currentPlayer = {
            id: Math.random().toString(36).substr(2, 9),
            name: name,
            score: 0,
            lastActive: Date.now()
        };
        
        players.get(currentPlayer.id).put(currentPlayer);
        loginSection.style.display = 'none';
        gameSection.style.display = 'block';
        
        updateScoreboard();
        checkAndStartGame();
        addMessage('系統', `${name} 加入了遊戲！`);
    }
});

// 監聽玩家數量變化
players.map().on((player, id) => {
    updatePlayerCount();
    updateScoreboard();
});

// 更新玩家數量
function updatePlayerCount() {
    let count = 0;
    players.map().once((player) => {
        if (player) count++;
    });
    playerCount.textContent = count;
    
    // 如果玩家數量大於1，顯示開始按鈕
    if (count > 1) {
        startRoundBtn.style.display = 'block';
    }
}

// 更新計分板顯示
function updateScoreboard() {
    playerScores.innerHTML = '';
    players.map().once((player, id) => {
        if (player) {
            const scoreItem = document.createElement('div');
            scoreItem.className = `score-item ${id === currentPlayer?.id ? 'current-player' : ''}`;
            scoreItem.innerHTML = `
                <span>${player.name}</span>
                <span>${player.score || 0} 分</span>
            `;
            playerScores.appendChild(scoreItem);
        }
    });
}

// 檢查並開始遊戲
function checkAndStartGame() {
    currentGame.once((game) => {
        if (!game || !game.active) {
            startRoundBtn.style.display = 'block';
        }
    });
}

// 開始計時器
function startTimer() {
    let timeLeft = ROUND_TIME;
    clearInterval(timer);
    
    timerDisplay.textContent = timeLeft;
    timerDisplay.className = '';
    
    timer = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = timeLeft;
        
        // 當時間少於 10 秒時添加警告效果
        if (timeLeft <= 10) {
            timerDisplay.className = 'danger';
        } else if (timeLeft <= 20) {
            timerDisplay.className = 'warning';
        }
        
        // 時間到自動結束回合
        if (timeLeft <= 0) {
            clearInterval(timer);
            addMessage('系統', '時間到！本回合結束');
            endRound();
        }
    }, 1000);
}

// 開始新回合
startRoundBtn.addEventListener('click', () => {
    // 隨機選擇一個玩家作為猜題者
    let players_array = [];
    players.map().once((player, id) => {
        if (player) players_array.push({...player, id});
    });
    
    if (players_array.length < 2) {
        addMessage('系統', '需要至少兩位玩家才能開始遊戲！');
        return;
    }
    
    const guesser = players_array[Math.floor(Math.random() * players_array.length)];
    const word = getRandomWord(); // 這裡可以加入你的題目庫
    
    currentGame.put({
        active: true,
        guesser: guesser.id,
        word: word,
        hints: [],
        status: 'playing',
        startTime: Date.now()
    });
    
    startTimer();
    startRoundBtn.style.display = 'none';
});

// 隨機生成題目（這裡可以替換成你的題目庫）
function getRandomWord() {
    const words = ['貓咪', '電腦', '手機', '太陽', '月亮', '書本', '眼鏡', '腳踏車', '風箏', '冰淇淋'];
    return words[Math.floor(Math.random() * words.length)];
}

// 監聽遊戲狀態
currentGame.on((gameState) => {
    if (!gameState || !gameState.active) return;
    
    isGuesser = gameState.guesser === currentPlayer?.id;
    currentGuesser.textContent = getPlayerName(gameState.guesser);
    
    if (isGuesser) {
        wordDisplay.style.display = 'none';
        hintSection.style.display = 'none';
        guessSection.style.display = 'block';
    } else {
        wordDisplay.style.display = 'block';
        currentWord.textContent = gameState.word;
        hintSection.style.display = 'block';
        guessSection.style.display = 'none';
    }
});

// 提交提示
submitHint.addEventListener('click', () => {
    const hint = hintInput.value.trim();
    if (!hint || isGuesser) return;
    
    currentGame.once((gameState) => {
        if (!gameState || !gameState.active) return;
        
        const hints = gameState.hints || [];
        if (!hints.includes(hint)) {
            hints.push(hint);
            currentGame.get('hints').put(hints);
            addMessage('提示', `${currentPlayer.name}: ${hint}`);
            hintInput.value = '';
        }
    });
});

// 監聽提示
currentGame.get('hints').on((hints) => {
    if (!hints) return;
    if (isGuesser) {
        hints.forEach(hint => {
            if (!document.querySelector(`[data-hint="${hint}"]`)) {
                addMessage('提示', hint);
            }
        });
    }
});

// 提交猜測
submitGuess.addEventListener('click', () => {
    const guess = guessInput.value.trim();
    if (!guess || !isGuesser) return;
    
    currentGame.once((gameState) => {
        if (guess.toLowerCase() === gameState.word.toLowerCase()) {
            clearInterval(timer);
            addMessage('系統', `恭喜猜題者 ${currentPlayer.name} 答對了！答案是：${gameState.word}`);
            // 更新分數，根據剩餘時間給予額外獎勵
            const timeLeft = parseInt(timerDisplay.textContent);
            const bonusPoints = Math.floor(timeLeft / 10); // 每10秒剩餘時間可得1分獎勵
            const totalPoints = 1 + bonusPoints;
            
            players.get(currentPlayer.id).get('score').once((score) => {
                players.get(currentPlayer.id).get('score').put((score || 0) + totalPoints);
                addMessage('系統', `${currentPlayer.name} 獲得 ${totalPoints} 分！（基礎分數1分 + 時間獎勵${bonusPoints}分）`);
                updateScoreboard();
            });
            endRound();
        } else {
            addMessage(currentPlayer.name, `猜測：${guess}`);
        }
        guessInput.value = '';
    });
});

// 結束回合
function endRound() {
    clearInterval(timer);
    currentGame.put({
        active: false,
        guesser: null,
        word: '',
        hints: [],
        status: 'waiting'
    });
    
    startRoundBtn.style.display = 'block';
    
    // 重置介面
    wordDisplay.style.display = 'none';
    hintSection.style.display = 'none';
    guessSection.style.display = 'none';
    timerDisplay.textContent = ROUND_TIME;
    timerDisplay.className = '';
}

// 新增訊息到聊天框
function addMessage(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender === '系統' ? 'system-message' : 
        (sender === '提示' ? 'hint-message' :
        (sender === currentPlayer?.name ? 'player-message' : 'other-message'))}`;
    messageDiv.textContent = `${sender}: ${text}`;
    if (sender === '提示') {
        messageDiv.setAttribute('data-hint', text);
    }
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

// 定期清理離線玩家
setInterval(() => {
    players.map().once((player, id) => {
        if (player && player.lastActive && Date.now() - player.lastActive > 30000) {
            players.get(id).put(null);
        }
    });
}, 10000);