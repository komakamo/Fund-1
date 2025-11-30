const INITIAL_FUNDS = {
    A: { id: 'A', name: '安定型', expectedReturn: 3, fluctuation: { min: 1, max: 5 }, description: '儲かる確率は高いけど伸び幅は小さい。', color: 'blue' },
    B: { id: 'B', name: 'バランス型', expectedReturn: 6, fluctuation: { min: 0, max: 15 }, description: '安定と成長のバランス。', color: 'indigo' },
    C: { id: 'C', name: 'ギャンブル型', expectedReturn: 12, fluctuation: { min: -30, max: 40 }, description: '当たればデカいけど死ぬときは死ぬ。', color: 'amber' },
    D: { id: 'D', name: 'インデックス型', expectedReturn: 5, fluctuation: { min: -10, max: 12 }, description: '市場全体に連動する。低コストで分散投資。', color: 'teal', unlocked: false }
};

const ACHIEVEMENTS = {
    '2_million_club': {
        id: '2_million_club',
        name: '駆け出しファンドマネージャー',
        description: '初めて資産が200万円に到達する',
        condition: (history, allocations, turn) => history.some(h => h.balance >= 2000000)
    },
    'insane_gambler': {
        id: 'insane_gambler',
        name: '狂気の投資家',
        description: 'ファンドCに100%の状態で10ターン経過',
        condition: (history, allocations, turn) => {
            if (allocations.C !== 100) return false;
            const validHistory = history.filter(h => h.allocations);
            if (validHistory.length < 9) return false;
            const last9 = validHistory.slice(-9);
            return last9.every(h => h.allocations.C === 100);
        }
    },
    'perfect_game': {
        id: 'perfect_game',
        name: '神タイミング',
        description: '10ターン以上プレイし、資産が一度も前のターンを下回らない',
        condition: (history, allocations, turn) => {
            if (turn < 10) return false;
            // Check if every turn's balance is greater than or equal to the previous turn's balance
            for (let i = 1; i < history.length; i++) {
                if (history[i].balance < history[i-1].balance) {
                    return false;
                }
            }
            return turn >= 10;
        }
    }
};

const UNLOCKABLES = {
    'fund_d': {
        id: 'fund_d',
        name: '新しいファンドD',
        description: '資産200万円達成で解禁',
        condition: (finalBalance) => finalBalance >= 2000000
    }
};


function calculateNextTurn(balance, allocations, funds, turn) {
    let turnProfit = 0;
    let turnLog = [];
    const fundDetails = {};

    Object.keys(allocations).forEach(key => {
        const fund = funds[key];
        if (!fund) return;

        const investedAmount = balance * (allocations[key] / 100);

        if (investedAmount === 0) {
            fundDetails[key] = { name: fund.name, profit: 0, returnRate: 0.0 };
            return;
        }

        let fluctuation;
        if (key === 'A') {
            const range = fund.fluctuation.max - fund.fluctuation.min;
            const value = Math.random() * range + fund.fluctuation.min;
            fluctuation = Math.random() < 0.8 ? value : -value; // 80% chance of being positive
        } else if (key === 'B') {
            fluctuation = (Math.random() * fund.fluctuation.max * 2) - fund.fluctuation.max;
        } else { // C
            fluctuation = Math.random() * (fund.fluctuation.max - fund.fluctuation.min) + fund.fluctuation.min;
        }

        const rateOfReturn = (fund.expectedReturn + fluctuation) / 100;

        const profit = investedAmount * rateOfReturn;
        turnProfit += profit;

        fundDetails[key] = {
            name: fund.name,
            profit: Math.floor(profit),
            returnRate: parseFloat((rateOfReturn * 100).toFixed(1))
        };
    });

    const balanceAfterFunds = Math.floor(balance + turnProfit);
    let newBalance = balanceAfterFunds;

    let randomEvent = null;
    let newFunds = JSON.parse(JSON.stringify(funds));

    if (Math.random() < 0.3) { // 30% chance of an event
        const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
        randomEvent = event;
        const eventResult = event.effect(newFunds, newBalance, allocations);
        newFunds = eventResult.funds;
        newBalance = Math.floor(eventResult.balance);
        if (eventResult.log) {
            turnLog.push({ type: 'event', text: eventResult.log, turn: turn });
        }
    }

    const lastDiff = Math.floor(newBalance - balance);
    const preEventDiff = Math.floor(balanceAfterFunds - balance);

    return {
        newBalance,
        lastDiff,
        preEventDiff,
        turnLog,
        randomEvent,
        newFunds,
        fundDetails
    }
}

const EVENTS = [
    {
        name: "世界的金融緩和",
        description: "世界的金融緩和で市場全体が活気づき、全ファンドの価値が5〜10%上昇しました。",
        effect: (funds, balance, allocations) => {
            const newFunds = JSON.parse(JSON.stringify(funds));
            let totalBoost = 0;
            Object.keys(newFunds).forEach(key => {
                const investedAmount = balance * (allocations[key] / 100);
                const boostPercent = (Math.random() * 5 + 5) / 100; // 5-10%
                totalBoost += investedAmount * boostPercent;
            });
            return { funds: newFunds, balance: balance + totalBoost, log: "世界的金融緩和により、市場全体が活気づいた！" };
        }
    },
    {
        name: "ITバブル崩壊",
        description: "ITバブルが崩壊し、ハイテク中心のファンドCに投資した資産が20%減少しました。",
        effect: (funds, balance, allocations) => {
            const newFunds = JSON.parse(JSON.stringify(funds));
            const investedInC = balance * (allocations.C / 100);
            const loss = investedInC * 0.20; // 20% loss on the amount invested in C
            return { funds: newFunds, balance: balance - loss, log: "ITバブル崩壊によりファンドCが打撃を受けた！" };
        }
    },
    {
        name: "円安急進",
        description: "円安が急進し、海外資産比率が高いファンドBとCに投資した資産が15%増加しました。",
        effect: (funds, balance, allocations) => {
            const newFunds = JSON.parse(JSON.stringify(funds));
            const investedInB = balance * (allocations.B / 100);
            const investedInC = balance * (allocations.C / 100);
            const gain = (investedInB + investedInC) * 0.15; // 15% gain on B and C
            return { funds: newFunds, balance: balance + gain, log: "円安により海外資産ファンドが急騰！" };
        }
    },
    {
        name: "ファンドC担当者交代",
        description: "ファンドCの運用担当者が交代し、よりハイリスク・ハイリターンな運用方針になりました。",
        effect: (funds, balance, allocations) => {
            const newFunds = JSON.parse(JSON.stringify(funds));
            newFunds.C.fluctuation.min = -50;
            newFunds.C.fluctuation.max = 60;
            newFunds.C.description = "担当者交代で超ハイリスクに。天国か地獄か。";
            return { funds: newFunds, balance: balance, log: "ファンドCの担当者が交代し、ハイリスク・ハイリターンに！" };
        }
    }
];

function analyzeInvestmentStyle(history) {
    if (!history || history.length <= 1) {
        return "プレイデータが不足しているため、分析できません。";
    }

    // Skip the initial state (turn 0) and filter out entries without allocations
    const gameHistory = history.slice(1).filter(h => h.allocations);

    if (gameHistory.length === 0) {
        return "プレイデータが不足しているため、分析できません。";
    }

    const avgAllocations = { A: 0, B: 0, C: 0, D: 0 };
    const numTurns = gameHistory.length;

    for (const record of gameHistory) {
        avgAllocations.A += record.allocations.A || 0;
        avgAllocations.B += record.allocations.B || 0;
        avgAllocations.C += record.allocations.C || 0;
        avgAllocations.D += record.allocations.D || 0;
    }

    avgAllocations.A /= numTurns;
    avgAllocations.B /= numTurns;
    avgAllocations.C /= numTurns;
    avgAllocations.D /= numTurns;

    let analysis = '';
    if (avgAllocations.C >= 60) {
        analysis = "あなたのプレイは“ハイリスク・ハイリターン型”でした。実際の投資でこれをやると、大きなリターンを得られる可能性がある一方、資産を大きく失うリスクも伴います。";
    } else if (avgAllocations.D >= 50) {
        analysis = "インデックス型ファンドを多めにしたので、ボラティリティ（資産の上下の激しさ）が比較的低くなりました。市場全体に分散投資する堅実な戦略です。";
    } else if (avgAllocations.A >= 60) {
        analysis = "安定型ファンドを中心に、非常に堅実なポートフォリオを組みましたね。リスクを抑え、着実に資産を増やすことを目指すスタイルです。";
    } else {
        analysis = "様々なファンドにバランス良く投資する“バランス型”のプレイスタイルでした。リスクを分散しつつ、安定的な成長を目指す、多くの投資家が実践するスタイルです。";
    }

    return analysis;
}

export { INITIAL_FUNDS, calculateNextTurn, EVENTS, ACHIEVEMENTS, UNLOCKABLES, analyzeInvestmentStyle };
