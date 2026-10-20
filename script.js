// --- CONSTANTES ---
const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SALDO_INICIAL = 500; // En centavos ($5.00)
const SALDO_TUXTTER = 100000000; // $1,000,000.00

// --- ESTADO GLOBAL ---
let state = {
    playerName: "Jugador",
    balance: SALDO_INICIAL,
    currentBet: 100, // $1.00
    deck: [],
    playerHand: [],
    dealerHand: [],
    gameActive: false,
    wins: 0,
    losses: 0,
    pushes: 0
};

// --- DOM ELEMENTS ---
const elNameModal = document.getElementById('name-modal');
const elInputName = document.getElementById('input-name');
const elBtnStart = document.getElementById('btn-start');
const elPlayerNameDisplay = document.getElementById('player-name-display');
const elSeatPlayer = document.getElementById('seat-player');
const elBalanceDisplay = document.getElementById('balance-display');
const elDealerHand = document.getElementById('dealer-hand');
const elPlayerHand = document.getElementById('player-hand');
const elDealerScore = document.getElementById('dealer-score');
const elPlayerScore = document.getElementById('player-score');
const elBetControls = document.getElementById('bet-controls');
const elActionControls = document.getElementById('action-controls');
const elCurrentBet = document.getElementById('current-bet');
const elBtnNextRound = document.getElementById('btn-next-round');
const elResultMessage = document.getElementById('result-message');

// --- LÓGICA DEL JUEGO ---

function createDeck() {
    let deck = [];
    for (let suit of SUITS) {
        for (let value of VALUES) {
            deck.push({ suit, value });
        }
    }
    return deck.sort(() => Math.random() - 0.5); // Barajar (Fisher-Yates ideal, pero esto sirve)
}

function getCardValue(card) {
    if (card.value === 'A') return 11;
    if (['J', 'Q', 'K'].includes(card.value)) return 10;
    return parseInt(card.value);
}

function calculateScore(hand) {
    let score = 0;
    let aces = 0;
    for (let card of hand) {
        score += getCardValue(card);
        if (card.value === 'A') aces++;
    }
    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }
    return score;
}

function updateBalanceUI() {
    let cents = state.balance;
    let dollars = Math.floor(cents / 100);
    let remainder = cents % 100;
    elBalanceDisplay.innerText = `$${dollars}.${remainder.toString().padStart(2, '0')}`;
}

function createCardElement(card, isHidden = false) {
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('card', 'new-card');
    
    if (isHidden) {
        cardDiv.classList.add('hidden-card');
    } else {
        const isRed = card.suit === '♥' || card.suit === '♦';
        cardDiv.classList.add(isRed ? 'red' : 'black');
        
        cardDiv.innerHTML = `
            <div class="corner top">
                <span>${card.value}</span>
                <span>${card.suit}</span>
            </div>
            <div class="center">${card.suit}</div>
            <div class="corner bottom">
                <span>${card.value}</span>
                <span>${card.suit}</span>
            </div>
        `;
    }
    
    // Quitar clase de animación después
    setTimeout(() => cardDiv.classList.remove('new-card'), 500);
    return cardDiv;
}

function dealCardTo(hand, container, isHidden = false) {
    const card = state.deck.pop();
    hand.push(card);
    const cardEl = createCardElement(card, isHidden);
    container.appendChild(cardEl);
}

function startRound() {
    if (state.balance < state.currentBet) {
        alert("No tienes saldo suficiente.");
        return;
    }

    state.balance -= state.currentBet;
    updateBalanceUI();

    state.deck = createDeck();
    state.playerHand = [];
    state.dealerHand = [];
    elPlayerHand.innerHTML = '';
    elDealerHand.innerHTML = '';
    elResultMessage.classList.add('hidden');
    elBtnNextRound.classList.add('hidden');
    elBetControls.classList.add('hidden');
    elActionControls.classList.remove('hidden');
    
    // Repartir inicial
    dealCardTo(state.playerHand, elPlayerHand);
    dealCardTo(state.dealerHand, elDealerHand);
    dealCardTo(state.playerHand, elPlayerHand);
    dealCardTo(state.dealerHand, elDealerHand, true); // Carta oculta del crupier

    updateScores();
    state.gameActive = true;

    // Verificar Blackjack natural
    if (calculateScore(state.playerHand) === 21) {
        stand(); // Se planta automáticamente
    }
}

function updateScores() {
    elPlayerScore.innerText = `Total: ${calculateScore(state.playerHand)}`;
    if (state.gameActive) {
        elDealerScore.innerText = `Crupier: ${getCardValue(state.dealerHand[0])} + ?`;
    } else {
        elDealerScore.innerText = `Crupier: ${calculateScore(state.dealerHand)}`;
    }
}

function hit() {
    if (!state.gameActive) return;
    dealCardTo(state.playerHand, elPlayerHand);
    updateScores();
    
    if (calculateScore(state.playerHand) > 21) {
        stand();
    }
}

function stand() {
    if (!state.gameActive) return;
    state.gameActive = false;
    
    // Revelar carta oculta del crupier
    elDealerHand.innerHTML = '';
    for (let card of state.dealerHand) {
        elDealerHand.appendChild(createCardElement(card, false));
    }
    updateScores();

    // Turno del crupier
    setTimeout(() => {
        dealerPlay();
    }, 500);
}

function double() {
    if (!state.gameActive || state.balance < state.currentBet) return;
    
    state.balance -= state.currentBet;
    state.currentBet *= 2;
    updateBalanceUI();
    
    dealCardTo(state.playerHand, elPlayerHand);
    updateScores();
    
    setTimeout(stand, 500);
}

function dealerPlay() {
    const dealerScore = calculateScore(state.dealerHand);
    if (dealerScore < 17) {
        dealCardTo(state.dealerHand, elDealerHand);
        updateScores();
        setTimeout(dealerPlay, 800);
    } else {
        resolveGame();
    }
}

function resolveGame() {
    const pScore = calculateScore(state.playerHand);
    const dScore = calculateScore(state.dealerHand);
    let msg = "";
    let color = "";

    if (pScore > 21) {
        msg = "PIERDES (Te pasaste)";
        color = "#f44336";
        state.losses++;
    } else if (dScore > 21) {
        msg = "¡GANAS! (Crupier se pasó)";
        color = "#4caf50";
        state.balance += state.currentBet * 2;
        state.wins++;
    } else if (pScore > dScore) {
        msg = "¡GANAS!";
        color = "#4caf50";
        state.balance += state.currentBet * 2;
        state.wins++;
    } else if (dScore > pScore) {
        msg = "PIERDES";
        color = "#f44336";
        state.losses++;
    } else {
        msg = "EMPATE";
        color = "#ffeb3b";
        state.balance += state.currentBet; // Recupera apuesta
        state.pushes++;
    }

    updateBalanceUI();
    updateStatsUI();

    elResultMessage.innerText = msg;
    elResultMessage.style.color = color;
    elResultMessage.classList.remove('hidden');
    
    elActionControls.classList.add('hidden');
    elBtnNextRound.classList.remove('hidden');

    if (state.balance < 25) {
        setTimeout(() => {
            alert("Te quedaste sin saldo. Reiniciando a $5.00.");
            state.balance = SALDO_INICIAL;
            updateBalanceUI();
            showBetControls();
        }, 2000);
    }
}

function updateStatsUI() {
    document.getElementById('stat-wins').innerText = state.wins;
    document.getElementById('stat-losses').innerText = state.losses;
    document.getElementById('stat-pushes').innerText = state.pushes;
}

function showBetControls() {
    elBetControls.classList.remove('hidden');
    elActionControls.classList.add('hidden');
    elBtnNextRound.classList.add('hidden');
    elResultMessage.classList.add('hidden');
    elDealerHand.innerHTML = '';
    elPlayerHand.innerHTML = '';
    elDealerScore.innerText = "Crupier: ?";
    elPlayerScore.innerText = "Total: 0";
    
    // Ajustar apuesta si es mayor al saldo
    if (state.currentBet > state.balance) {
        state.currentBet = Math.max(25, Math.floor(state.balance / 25) * 25);
    }
    updateBetUI();
}

function updateBetUI() {
    let dollars = Math.floor(state.currentBet / 100);
    let cents = state.currentBet % 100;
    elCurrentBet.innerText = `$${dollars}.${cents.toString().padStart(2, '0')}`;
}

// --- EVENT LISTENERS ---

elBtnStart.addEventListener('click', () => {
    let name = elInputName.value.trim();
    if (!name) name = "Jugador";
    
    state.playerName = name;
    elPlayerNameDisplay.innerText = name;
    elSeatPlayer.innerText = `● ${name}`;
    
    // EL SECRETO DE TUXTTER
    if (name.toLowerCase() === 'tuxtter') {
        state.balance = SALDO_TUXTTER;
        alert("¡Bienvenido TUXTTER! Tienes $1,000,000 de saldo inicial.");
    } else {
        state.balance = SALDO_INICIAL;
    }
    
    updateBalanceUI();
    elNameModal.classList.add('hidden');
    showBetControls();
});

document.getElementById('btn-bet-minus').addEventListener('click', () => {
    if (state.currentBet > 25) {
        state.currentBet -= 25;
        updateBetUI();
    }
});

document.getElementById('btn-bet-plus').addEventListener('click', () => {
    if (state.currentBet + 25 <= state.balance) {
        state.currentBet += 25;
        updateBetUI();
    }
});

document.getElementById('btn-bet-max').addEventListener('click', () => {
    state.currentBet = Math.floor(state.balance / 25) * 25;
    if (state.currentBet < 25) state.currentBet = 25;
    updateBetUI();
});

document.getElementById('btn-deal').addEventListener('click', startRound);
elBtnNextRound.addEventListener('click', showBetControls);

document.getElementById('btn-hit').addEventListener('click', hit);
document.getElementById('btn-stand').addEventListener('click', stand);
document.getElementById('btn-double').addEventListener('click', double);

// Atajos de teclado
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'h') document.getElementById('btn-hit').click();
    if (e.key.toLowerCase() === 's') document.getElementById('btn-stand').click();
    if (e.key.toLowerCase() === 'd') document.getElementById('btn-double').click();
});