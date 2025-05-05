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

// 檢查玩家名稱是否已存在
function isNameTaken(name) {
    return new Promise(resolve => {
        let taken = false;
        players.map().once((player) => {
            if (player && player.name.toLowerCase() === name.toLowerCase()) {
                taken = true;
            }
        });
        setTimeout(() => resolve(taken), 100); // 給予時間讀取所有玩家資料
    });
}

// 加入遊戲
joinBtn.addEventListener('click', async () => {
    const name = playerName.value.trim();
    if (name) {
        // 檢查名稱是否已被使用
        const nameTaken = await isNameTaken(name);
        if (nameTaken) {
            addMessage('系統', '這個名字已經有人使用了，請換一個名字！');
            return;
        }

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
        addMessage('系統', `${name} 加入了遊戲！`);
    }
});

// 監聽玩家數量變化
players.map().on((player, id) => {
    updatePlayerCount();
    updateScoreboard();
});

// 更新玩家數量並自動開始遊戲
function updatePlayerCount() {
    let count = 0;
    let players_array = [];
    
    players.map().once((player, id) => {
        if (player) {
            count++;
            players_array.push({...player, id});
        }
    });
    playerCount.textContent = count;
    
    // 當達到3人時自動開始遊戲
    if (count >= 3) {
        currentGame.once((game) => {
            if (!game || !game.active) {
                startNewGame(players_array);
            }
        });
    } else {
        const remainingPlayers = 3 - count;
        if (count > 0) {
            addMessage('系統', `還需要 ${remainingPlayers} 位玩家才能開始遊戲`);
        }
    }
}

// 開始新遊戲
function startNewGame(players_array) {
    if (!players_array || players_array.length < 3) return;
    
    // 隨機選擇猜謎者
    const guesser = players_array[Math.floor(Math.random() * players_array.length)];
    const word = getRandomWord();
    
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
    addMessage('系統', '遊戲自動開始！');
    addMessage('系統', `${getPlayerName(guesser.id)} 被選為猜謎者`);
}

// 移除舊的開始按鈕監聽器，因為遊戲會自動開始
startRoundBtn.style.display = 'none';

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

// 擴充題目庫
function getRandomWord() {
    const words = [
        '貓咪', '電腦', '手機', '太陽', '月亮', '書本', '眼鏡', '腳踏車', '風箏', '冰淇淋',
        '鉛筆', '雨傘', '手錶', '電視', '汽車', '飛機', '火車', '鯨魚', '老虎', '大象',
        '蝴蝶', '彩虹', '星星', '花朵', '樹木', '海洋', '山脈', '城市', '農場', '公園',
        '電影院', '學校', '醫院', '超市', '餐廳', '遊樂園', '動物園', '博物館', '圖書館', '體育館'
    ];
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

// 結束回合後自動開始新回合
function endRound() {
    clearInterval(timer);
    
    // 取得所有現有玩家
    let players_array = [];
    players.map().once((player, id) => {
        if (player) players_array.push({...player, id});
    });
    
    // 如果仍有足夠的玩家，自動開始新回合
    if (players_array.length >= 3) {
        setTimeout(() => {
            startNewGame(players_array);
        }, 3000); // 等待3秒後開始新回合
    } else {
        currentGame.put({
            active: false,
            guesser: null,
            word: '',
            hints: [],
            status: 'waiting'
        });
        
        // 重置介面
        wordDisplay.style.display = 'none';
        hintSection.style.display = 'none';
        guessSection.style.display = 'none';
        timerDisplay.textContent = ROUND_TIME;
        timerDisplay.className = '';
        
        addMessage('系統', '玩家數量不足，等待更多玩家加入...');
    }
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