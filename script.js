const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SALDO_INICIAL = 500;
const SALDO_TUXTTER = 100000000;

let state = {
    players: [],
    dealer: { hand: [] },
    currentPlayerIndex: 0,
    deck: [],
    phase: 'INIT',
    stats: { wins: 0, losses: 0, pushes: 0, blackjacks: 0 },
    focusIndex: 0,
    activeButtons: []
};

// DOM
const elModal = document.getElementById('name-modal');
const elStepPlayers = document.getElementById('step-players');
const elStepName = document.getElementById('step-name');
const elPlayerRoleText = document.getElementById('player-role-text');
const elInputName = document.getElementById('input-name');
const elBtnStart = document.getElementById('btn-start');
const elPlayersContainer = document.getElementById('players-container');
const elDealerHand = document.getElementById('dealer-hand');
const elDealerScore = document.getElementById('dealer-score');
const elPlayerSeatsList = document.getElementById('player-seats-list');
const elBalanceDisplay = document.getElementById('balance-display');
const elBetControls = document.getElementById('bet-controls');
const elActionControls = document.getElementById('action-controls');
const elCurrentBet = document.getElementById('current-bet');
const elBtnNextRound = document.getElementById('btn-next-round');
const elResultMessage = document.getElementById('result-message');

let selectedPlayerCount = 1;

// LÓGICA
function createDeck() {
    let deck = [];
    for (let suit of SUITS) for (let value of VALUES) deck.push({ suit, value });
    return deck.sort(() => Math.random() - 0.5);
}

function getCardValue(card) {
    if (card.value === 'A') return 11;
    if (['J', 'Q', 'K'].includes(card.value)) return 10;
    return parseInt(card.value);
}

function calculateScore(hand) {
    let score = 0, aces = 0;
    for (let card of hand) {
        score += getCardValue(card);
        if (card.value === 'A') aces++;
    }
    while (score > 21 && aces > 0) { score -= 10; aces--; }
    return score;
}

function createCardElement(card, isHidden = false) {
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('card', 'dealing');
    if (isHidden) {
        cardDiv.classList.add('hidden-card');
    } else {
        const isRed = card.suit === '♥' || card.suit === '♦';
        cardDiv.classList.add(isRed ? 'red' : 'black');
        cardDiv.innerHTML = `
            <div class="corner top"><span>${card.value}</span><span>${card.suit}</span></div>
            <div class="center">${card.suit}</div>
            <div class="corner bottom"><span>${card.value}</span><span>${card.suit}</span></div>
        `;
    }
    setTimeout(() => cardDiv.classList.remove('dealing'), 400);
    return cardDiv;
}

function renderPlayerUI() {
    elPlayersContainer.innerHTML = '';
    elPlayerSeatsList.innerHTML = '';

    state.players.forEach((p, i) => {
        let box = document.createElement('div');
        box.className = `player-box ${i === state.currentPlayerIndex && state.phase === 'PLAYING' ? 'active-turn' : ''}`;
        box.innerHTML = `
            <h3>${p.name} <span class="score-badge">${calculateScore(p.hand) || 0}</span></h3>
            <div class="hand" id="hand-p${i}"></div>
        `;
        elPlayersContainer.appendChild(box);

        let handContainer = box.querySelector('.hand');
        p.hand.forEach(c => handContainer.appendChild(createCardElement(c)));

        let seat = document.createElement('div');
        seat.className = `seat ${i === state.currentPlayerIndex && state.phase === 'PLAYING' ? 'active' : ''}`;
        let isTuxtter = p.name.toLowerCase() === 'tuxtter';
        let saldoStr = isTuxtter ? '$1.0M' : `$${Math.floor(p.balance/100)}.${(p.balance%100).toString().padStart(2,'0')}`;
        seat.innerText = `● ${p.name} (${saldoStr})`;
        elPlayerSeatsList.appendChild(seat);
    });
}

function updateBalanceUI() {
    let p = state.players[state.currentPlayerIndex];
    if (!p) return;
    let dollars = Math.floor(p.balance / 100);
    let remainder = p.balance % 100;
    elBalanceDisplay.innerText = `$${dollars}.${remainder.toString().padStart(2, '0')}`;
}

// JUEGO
function startRound() {
    state.deck = createDeck();
    state.dealer.hand = [];
    elDealerHand.innerHTML = '';
    elDealerScore.innerText = '?';
    elResultMessage.className = 'hidden';
    elBtnNextRound.classList.add('hidden');
    
    state.players.forEach(p => { p.hand = []; });
    
    let dealSequence = [];
    for(let i=0; i<2; i++) {
        state.players.forEach((p, idx) => dealSequence.push({type: 'player', idx}));
        dealSequence.push({type: 'dealer'});
    }

    let delay = 0;
    dealSequence.forEach(action => {
        setTimeout(() => {
            if (action.type === 'player') {
                let p = state.players[action.idx];
                if (p.activo) {
                    let c = state.deck.pop();
                    p.hand.push(c);
                    let handBox = document.getElementById(`hand-p${action.idx}`);
                    if(handBox) handBox.appendChild(createCardElement(c));
                }
            } else {
                let c = state.deck.pop();
                state.dealer.hand.push(c);
                // 2da carta oculta
                let isHidden = state.dealer.hand.length === 2;
                elDealerHand.appendChild(createCardElement(c, isHidden));
            }
        }, delay);
        delay += 300;
    });

    setTimeout(() => {
        renderPlayerUI();
        state.phase = 'PLAYING';
        state.currentPlayerIndex = 0;
        checkBlackjackAndTurns();
    }, delay + 200);
}

function checkBlackjackAndTurns() {
    let foundActive = false;
    for(let i = state.currentPlayerIndex; i < state.players.length; i++) {
        let p = state.players[i];
        if (p.balance < 0 || !p.activo) continue;
        
        let score = calculateScore(p.hand);
        if (score === 21) {
            p.activo = false;
            continue;
        }
        state.currentPlayerIndex = i;
        foundActive = true;
        break;
    }

    if (!foundActive) {
        dealerTurn();
    } else {
        renderPlayerUI();
        updateBalanceUI();
        elActionControls.classList.remove('hidden');
        elBetControls.classList.add('hidden');
        setupKeyboardNav();
    }
}

function playerHit() {
    let p = state.players[state.currentPlayerIndex];
    p.hand.push(state.deck.pop());
    
    let handBox = document.getElementById(`hand-p${state.currentPlayerIndex}`);
    if(handBox) handBox.appendChild(createCardElement(p.hand[p.hand.length - 1]));
    
    setTimeout(() => {
        renderPlayerUI();
        if (calculateScore(p.hand) >= 21) {
            p.activo = false;
            nextPlayer();
        }
    }, 400);
}

function playerStand() {
    state.players[state.currentPlayerIndex].activo = false;
    nextPlayer();
}

function playerDouble() {
    let p = state.players[state.currentPlayerIndex];
    if (p.balance < p.bet) { alert("No tienes saldo para doblar."); return; }
    p.balance -= p.bet;
    p.bet *= 2;
    updateBalanceUI();

    p.hand.push(state.deck.pop());
    let handBox = document.getElementById(`hand-p${state.currentPlayerIndex}`);
    if(handBox) handBox.appendChild(createCardElement(p.hand[p.hand.length - 1]));
    
    setTimeout(() => {
        renderPlayerUI();
        p.activo = false;
        nextPlayer();
    }, 400);
}

function nextPlayer() {
    elActionControls.classList.add('hidden');
    state.currentPlayerIndex++;
    checkBlackjackAndTurns();
}

function dealerTurn() {
    state.phase = 'DEALER';
    elActionControls.classList.add('hidden');
    
    elDealerHand.innerHTML = '';
    state.dealer.hand.forEach(c => elDealerHand.appendChild(createCardElement(c, false)));
    
    let playDealer = () => {
        let score = calculateScore(state.dealer.hand);
        if (score < 17) {
            state.dealer.hand.push(state.deck.pop());
            elDealerHand.appendChild(createCardElement(state.dealer.hand[state.dealer.hand.length-1]));
            setTimeout(playDealer, 600);
        } else {
            resolveRound();
        }
    };
    setTimeout(playDealer, 600);
}

function resolveRound() {
    state.phase = 'RESOLVE';
    let dScore = calculateScore(state.dealer.hand);
    elDealerScore.innerText = dScore;
    
    let isWin = false, isLose = false;

    state.players.forEach((p) => {
        if(!p.activo && p.hand.length === 0) return;
        
        let pScore = calculateScore(p.hand);
        let isPlayerBJ = p.hand.length === 2 && pScore === 21;
        let isDealerBJ = state.dealer.hand.length === 2 && dScore === 21;
        
        let payout = 0;

        if (pScore > 21) {
            state.stats.losses++;
        } else if (isPlayerBJ && !isDealerBJ) {
            payout = Math.floor(p.bet * 2.5);
            state.stats.blackjacks++;
            state.stats.wins++;
            isWin = true;
        } else if (isDealerBJ && !isPlayerBJ) {
            state.stats.losses++;
        } else if (dScore > 21 || pScore > dScore) {
            payout = p.bet * 2;
            state.stats.wins++;
            isWin = true;
        } else if (pScore === dScore) {
            payout = p.bet;
            state.stats.pushes++;
        } else {
            state.stats.losses++;
            isLose = true;
        }
        p.balance += payout;
    });

    renderPlayerUI();
    updateStatsUI();
    updateBalanceUI();

    elResultMessage.className = '';
    if (isWin && !isLose) {
        elResultMessage.innerText = "¡GANASTE!";
        elResultMessage.classList.add('anim-win');
    } else if (isLose && !isWin) {
        elResultMessage.innerText = "PERDISTE";
        elResultMessage.classList.add('anim-lose');
    } else {
        elResultMessage.innerText = "EMPATE / MIXTO";
        elResultMessage.classList.add('anim-push');
    }

    elBtnNextRound.classList.remove('hidden');
    setupKeyboardNav();
}

function updateStatsUI() {
    document.getElementById('stat-wins').innerText = state.stats.wins;
    document.getElementById('stat-losses').innerText = state.stats.losses;
    document.getElementById('stat-pushes').innerText = state.stats.pushes;
    document.getElementById('stat-blackjacks').innerText = state.stats.blackjacks;
}

// APUESTAS
let currentBet = 100;
function updateBetUI() {
    elCurrentBet.innerText = `$${Math.floor(currentBet / 100)}.${(currentBet % 100).toString().padStart(2, '0')}`;
}
function changeBet(amount) {
    let p = state.players[0];
    let newBet = currentBet + amount;
    if (newBet < 25) newBet = 25;
    if (newBet > p.balance) newBet = Math.floor(p.balance / 25) * 25;
    currentBet = newBet;
    updateBetUI();
}

function dealInitialHands() {
    state.players.forEach(p => {
        p.bet = currentBet;
        p.balance -= currentBet;
        p.activo = true;
        p.hand = [];
    });
    elBetControls.classList.add('hidden');
    elActionControls.classList.remove('hidden');
    startRound();
}

// CONTROLES Y TECLADO
function setupKeyboardNav() {
    state.focusIndex = 0;
    state.activeButtons = Array.from(document.querySelectorAll('button')).filter(btn => !btn.classList.contains('hidden') && btn.offsetParent !== null && !btn.classList.contains('btn-p-count'));
    updateFocus();
}
function updateFocus() {
    state.activeButtons.forEach(b => b.classList.remove('focused'));
    if (state.activeButtons[state.focusIndex]) state.activeButtons[state.focusIndex].classList.add('focused');
}

document.addEventListener('keydown', (e) => {
    if (state.phase === 'INIT' || state.phase === 'BETTING') {
        if (e.key === 'ArrowUp') { changeBet(100); e.preventDefault(); }
        if (e.key === 'ArrowDown') { changeBet(-100); e.preventDefault(); }
        if (e.key === '+') changeBet(25);
        if (e.key === '-') changeBet(-25);
    }

    if (e.key === 'ArrowRight') {
        if(state.activeButtons.length > 0){
            state.focusIndex = (state.focusIndex + 1) % state.activeButtons.length;
            updateFocus();
        }
    } else if (e.key === 'ArrowLeft') {
        if(state.activeButtons.length > 0){
            state.focusIndex = (state.focusIndex - 1 + state.activeButtons.length) % state.activeButtons.length;
            updateFocus();
        }
    } else if (e.key === 'Enter') {
        if (state.activeButtons[state.focusIndex]) state.activeButtons[state.focusIndex].click();
    }

    if (state.phase === 'PLAYING') {
        if (e.key.toLowerCase() === 'h') document.getElementById('btn-hit').click();
        if (e.key.toLowerCase() === 's') document.getElementById('btn-stand').click();
        if (e.key.toLowerCase() === 'd') document.getElementById('btn-double').click();
    }
});

// INICIALIZACIÓN (2 PASOS)
document.querySelectorAll('.btn-p-count').forEach(btn => {
    btn.addEventListener('click', (e) => {
        selectedPlayerCount = parseInt(e.target.dataset.count);
        elStepPlayers.classList.add('hidden');
        elStepName.classList.remove('hidden');
        elPlayerRoleText.innerText = `Jugarás contra ${selectedPlayerCount - 1} Bot(s).`;
        elInputName.focus();
    });
});

elBtnStart.addEventListener('click', () => {
    let name = elInputName.value.trim() || "Jugador";
    
    state.players = [];
    for (let i = 0; i < selectedPlayerCount; i++) {
        let pName = i === 0 ? name : `Bot ${i}`;
        let bal = 500;
        
        if (i === 0 && pName.toLowerCase() === 'tuxtter') {
            bal = SALDO_TUXTTER;
            alert("¡Modo TUXTTER activado! $1,000,000 iniciales.");
        }
        
        state.players.push({ name: pName, balance: bal, hand: [], bet: 100, activo: true });
    }
    
    state.phase = 'BETTING';
    updateBalanceUI();
    renderPlayerUI();
    elModal.classList.add('hidden');
    elBetControls.classList.remove('hidden');
    elActionControls.classList.add('hidden');
    setupKeyboardNav();
});

document.getElementById('btn-bet-minus').addEventListener('click', () => changeBet(-25));
document.getElementById('btn-bet-plus').addEventListener('click', () => changeBet(25));
document.getElementById('btn-bet-plus1').addEventListener('click', () => changeBet(100));
document.getElementById('btn-bet-max').addEventListener('click', () => {
    let p = state.players[0];
    currentBet = Math.floor(p.balance / 25) * 25;
    if (currentBet < 25) currentBet = 25;
    updateBetUI();
});
document.getElementById('btn-deal').addEventListener('click', dealInitialHands);

document.getElementById('btn-hit').addEventListener('click', playerHit);
document.getElementById('btn-stand').addEventListener('click', playerStand);
document.getElementById('btn-double').addEventListener('click', playerDouble);

elBtnNextRound.addEventListener('click', () => {
    state.phase = 'BETTING';
    elResultMessage.className = 'hidden';
    elBtnNextRound.classList.add('hidden');
    elBetControls.classList.remove('hidden');
    elActionControls.classList.add('hidden');
    
    state.dealer.hand = [];
    elDealerHand.innerHTML = '';
    elDealerScore.innerText = '?';
    state.players.forEach(p => { p.hand = []; });
    renderPlayerUI();
    
    if (state.players.every(p => p.balance < 25)) {
        alert("Todos se quedaron sin saldo. Reiniciando a $5.00.");
        state.players.forEach(p => p.balance = p.name.toLowerCase() === 'tuxtter' ? SALDO_TUXTTER : SALDO_INICIAL);
    }
    
    updateBalanceUI();
    setupKeyboardNav();
});