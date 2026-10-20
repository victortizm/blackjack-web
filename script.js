const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SALDO_INICIAL = 500;
const SALDO_TUXTTER = 100000000;
const BOT_NAMES = ['Gemini', 'ChatGPT', 'Claude'];

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

let selectedMode = 'bots';
let currentBet = 100;

// DOM
const elModal = document.getElementById('name-modal');
const elStepMode = document.getElementById('step-mode');
const elStepConfig = document.getElementById('step-config');
const elConfigTitle = document.getElementById('config-title');
const elLblCount = document.getElementById('lbl-count');
const elInputPlayers = document.getElementById('input-players');
const elNamesContainer = document.getElementById('names-container');
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

// Botones de Apuesta
const btnMinus1 = document.getElementById('btn-bet-minus1');
const btnMinus025 = document.getElementById('btn-bet-minus');
const btnPlus025 = document.getElementById('btn-bet-plus');
const btnPlus1 = document.getElementById('btn-bet-plus1');
const btnMax = document.getElementById('btn-bet-max');

// LÓGICA DE CARTAS
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

// RENDERIZADO
function renderPlayerUI() {
    elPlayersContainer.innerHTML = '';
    elPlayerSeatsList.innerHTML = '';

    state.players.forEach((p, i) => {
        let box = document.createElement('div');
        box.className = `player-box ${i === state.currentPlayerIndex && state.phase === 'PLAYING' ? 'active-turn' : ''}`;
        
        let chipHTML = '';
        if (p.bet > 0) {
            chipHTML = `<div class="chip-container"><div class="chip" style="animation: dropChip 0.3s ease-out;">$${p.bet/100}</div></div>`;
        }

        box.innerHTML = `
            <h3>${p.name} <span class="score-badge">${calculateScore(p.hand) || 0}</span></h3>
            <div class="hand" id="hand-p${i}"></div>
            ${chipHTML}
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
    let p = state.players[state.currentPlayerIndex] || state.players[0];
    if (!p) return;
    let dollars = Math.floor(p.balance / 100);
    let remainder = p.balance % 100;
    elBalanceDisplay.innerText = `$${dollars}.${remainder.toString().padStart(2, '0')}`;
}

// FLUJO DEL JUEGO
function startRound() {
    state.deck = createDeck();
    state.dealer.hand = [];
    elDealerHand.innerHTML = '';
    elDealerScore.innerText = '?';
    elResultMessage.className = 'hidden';
    elBtnNextRound.classList.add('hidden');
    
    state.players.forEach(p => { p.hand = []; });
    renderPlayerUI();
    
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
                elDealerHand.appendChild(createCardElement(c, state.dealer.hand.length === 2));
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
        
        if (calculateScore(p.hand) === 21) {
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

// RESOLUCIÓN Y MENSAJES
function resolveRound() {
    state.phase = 'RESOLVE';
    let dScore = calculateScore(state.dealer.hand);
    elDealerScore.innerText = dScore;
    
    let roundWins = 0;
    let roundLosses = 0;
    let roundPushes = 0;
    let totalActive = 0;
    let singlePlayerResult = "";

    state.players.forEach((p) => {
        if(!p.activo && p.hand.length === 0) return;
        totalActive++;
        
        let pScore = calculateScore(p.hand);
        let isPlayerBJ = p.hand.length === 2 && pScore === 21;
        let isDealerBJ = state.dealer.hand.length === 2 && dScore === 21;
        
        let payout = 0;
        let betAmount = p.bet;
        p.bet = 0;

        if (pScore > 21) {
            state.stats.losses++; roundLosses++;
            if (totalActive === 1) singlePlayerResult = "PIERDE";
        } else if (isPlayerBJ && !isDealerBJ) {
            payout = Math.floor(betAmount * 2.5);
            state.stats.blackjacks++; state.stats.wins++; roundWins++;
            if (totalActive === 1) singlePlayerResult = "¡BLACKJACK!";
        } else if (isDealerBJ && !isPlayerBJ) {
            state.stats.losses++; roundLosses++;
            if (totalActive === 1) singlePlayerResult = "PIERDE";
        } else if (dScore > 21 || pScore > dScore) {
            payout = betAmount * 2;
            state.stats.wins++; roundWins++;
            if (totalActive === 1) singlePlayerResult = "GANA";
        } else if (pScore === dScore) {
            payout = betAmount;
            state.stats.pushes++; roundPushes++;
            if (totalActive === 1) singlePlayerResult = "EMPATA";
        } else {
            state.stats.losses++; roundLosses++;
            if (totalActive === 1) singlePlayerResult = "PIERDE";
        }
        p.balance += payout;
    });

    renderPlayerUI();
    updateStatsUI();
    updateBalanceUI();

    // MENSAJE INTELIGENTE
    elResultMessage.className = '';
    
    if (totalActive === 1) {
        elResultMessage.innerText = `${state.players[0].name} ${singlePlayerResult}`;
        if (singlePlayerResult.includes("GANA") || singlePlayerResult.includes("BLACKJACK")) {
            elResultMessage.classList.add('anim-win');
        } else if (singlePlayerResult === "PIERDE") {
            elResultMessage.classList.add('anim-lose');
        } else {
            elResultMessage.classList.add('anim-push');
        }
    } else {
        if (roundWins === totalActive) {
            elResultMessage.innerText = "¡TODOS GANARON!";
            elResultMessage.classList.add('anim-win');
        } else if (roundLosses === totalActive) {
            elResultMessage.innerText = "LA CASA GANA";
            elResultMessage.classList.add('anim-lose');
        } else if (roundPushes === totalActive) {
            elResultMessage.innerText = "EMPATE GENERAL";
            elResultMessage.classList.add('anim-push');
        } else {
            elResultMessage.innerText = "RESULTADOS MIXTOS";
            elResultMessage.classList.add('anim-push');
        }
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

// CONTROL DE APUESTAS
function updateBetUI() {
    let p = state.players[0];
    let maxBet = Math.floor(p.balance / 25) * 25;
    
    elCurrentBet.value = (currentBet / 100).toFixed(2);

    btnMinus025.disabled = currentBet <= 25;
    btnMinus1.disabled = currentBet - 100 < 25;
    btnPlus025.disabled = currentBet + 25 > maxBet;
    btnPlus1.disabled = currentBet + 100 > maxBet;
    btnMax.disabled = currentBet >= maxBet;
}

function changeBet(amount) {
    let p = state.players[0];
    let maxBet = Math.floor(p.balance / 25) * 25;
    let newBet = currentBet + amount;
    
    if (newBet < 25) newBet = 25;
    if (newBet > maxBet) newBet = maxBet;
    
    currentBet = newBet;
    updateBetUI();
}

// INPUT MANUAL
elCurrentBet.addEventListener('change', (e) => {
    let val = parseFloat(e.target.value);
    let p = state.players[0];
    let maxBet = Math.floor(p.balance / 25) / 100;

    if (isNaN(val)) val = 1.00;
    if (val < 0.25) val = 0.25;
    if (val > maxBet) val = maxBet;

    val = Math.round(val * 4) / 4;

    currentBet = Math.round(val * 100);
    updateBetUI();
});

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

// NAVEGACIÓN Y EVENTOS
function setupKeyboardNav() {
    state.focusIndex = 0;
    state.activeButtons = Array.from(document.querySelectorAll('button')).filter(btn => !btn.classList.contains('hidden') && !btn.disabled && btn.offsetParent !== null);
    updateFocus();
}
function updateFocus() {
    state.activeButtons.forEach(b => b.classList.remove('focused'));
    if (state.activeButtons[state.focusIndex]) state.activeButtons[state.focusIndex].classList.add('focused');
}

document.addEventListener('keydown', (e) => {
    if (document.activeElement === elCurrentBet) return;

    if (state.phase === 'BETTING') {
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

document.querySelectorAll('.btn-mode').forEach(btn => {
    btn.addEventListener('click', (e) => {
        selectedMode = e.target.dataset.mode;
        elStepMode.classList.add('hidden');
        elStepConfig.classList.remove('hidden');
        updateConfigUI();
    });
});

elInputPlayers.addEventListener('change', updateConfigUI);

function updateConfigUI() {
    let count = parseInt(elInputPlayers.value);
    elNamesContainer.innerHTML = '';

    if (selectedMode === 'local') {
        elConfigTitle.innerText = "Nombres Locales";
        elLblCount.innerText = "Número de jugadores:";
        for (let i = 0; i < count; i++) {
            elNamesContainer.innerHTML += `
                <div class="input-group">
                    <label>Nombre Jugador ${i+1}:</label>
                    <input type="text" class="input-local-name" placeholder="Jugador ${i+1}" maxlength="10">
                </div>
            `;
        }
    } else {
        elConfigTitle.innerText = "Contra la Máquina";
        elLblCount.innerText = "Número de jugadores (Tú + Bots):";
        elNamesContainer.innerHTML += `
            <div class="input-group">
                <label>Tu nombre:</label>
                <input type="text" id="input-main-name" placeholder="Tu nombre" maxlength="10">
            </div>
            <p style="font-size: 12px; color: #888; margin-top:10px;">Los bots serán: Gemini, ChatGPT y Claude.</p>
        `;
    }
}

elBtnStart.addEventListener('click', () => {
    let count = parseInt(elInputPlayers.value);
    state.players = [];

    if (selectedMode === 'local') {
        let inputs = document.querySelectorAll('.input-local-name');
        inputs.forEach((input, i) => {
            let name = input.value.trim() || `Jugador ${i+1}`;
            let bal = name.toLowerCase() === 'tuxtter' ? SALDO_TUXTTER : SALDO_INICIAL;
            if (name.toLowerCase() === 'tuxtter') alert(`¡Modo TUXTTER activado para ${name}!`);
            state.players.push({ name: name, balance: bal, hand: [], bet: 100, activo: true });
        });
    } else {
        let mainName = document.getElementById('input-main-name').value.trim() || "Tú";
        let bal = mainName.toLowerCase() === 'tuxtter' ? SALDO_TUXTTER : SALDO_INICIAL;
        if (mainName.toLowerCase() === 'tuxtter') alert("¡Modo TUXTTER activado! $1,000,000 iniciales.");
        
        state.players.push({ name: mainName, balance: bal, hand: [], bet: 100, activo: true });

        for (let i = 1; i < count; i++) {
            state.players.push({ name: BOT_NAMES[i-1], balance: SALDO_INICIAL, hand: [], bet: 100, activo: true });
        }
    }
    
    state.phase = 'BETTING';
    currentBet = 100;
    updateBalanceUI();
    renderPlayerUI();
    elModal.classList.add('hidden');
    elBetControls.classList.remove('hidden');
    elActionControls.classList.add('hidden');
    updateBetUI();
    setupKeyboardNav();
});

btnMinus025.addEventListener('click', () => changeBet(-25));
btnPlus025.addEventListener('click', () => changeBet(25));
btnMinus1.addEventListener('click', () => changeBet(-100));
btnPlus1.addEventListener('click', () => changeBet(100));
btnMax.addEventListener('click', () => {
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
    state.players.forEach(p => { p.hand = []; p.bet = 0; });
    renderPlayerUI();
    
    if (state.players[0].balance < 25) {
        alert("Te quedaste sin saldo. Reiniciando a $5.00.");
        state.players[0].balance = state.players[0].name.toLowerCase() === 'tuxtter' ? SALDO_TUXTTER : SALDO_INICIAL;
    }
    
    updateBalanceUI();
    updateBetUI();
    setupKeyboardNav();
});