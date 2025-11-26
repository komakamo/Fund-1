const INITIAL_FUNDS = {
    A: { id: 'A', name: '安定型', expectedReturn: 3, fluctuation: { min: 1, max: 5 }, description: '儲かる確率は高いけど伸び幅は小さい。', color: 'blue' },
    B: { id: 'B', name: 'バランス型', expectedReturn: 6, fluctuation: { min: 0, max: 15 }, description: '安定と成長のバランス。', color: 'indigo' },
    C: { id: 'C', name: 'ギャンブル型', expectedReturn: 12, fluctuation: { min: -30, max: 40 }, description: '当たればデカいけど死ぬときは死ぬ。', color: 'amber' }
};

function calculateNextTurn(balance, allocations, funds, turn) {
    let turnProfit = 0;
    let turnLog = [];

    Object.keys(funds).forEach(key => {
        const fund = funds[key];
        const investedAmount = balance * (allocations[key] / 100);

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
    });

    let newBalance = Math.floor(balance + turnProfit);
    const lastDiff = Math.floor(turnProfit);

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

    return {
        newBalance,
        lastDiff,
        turnLog,
        randomEvent,
        newFunds
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
            newFunds.C.fluctuation.min = -20;
            newFunds.C.fluctuation.max = 60;
            newFunds.C.description = "担当者交代で超ハイリスクに。天国か地獄か。";
            return { funds: newFunds, balance: balance, log: "ファンドCの担当者が交代し、ハイリスク・ハイリターンに！" };
        }
    }
];

export { INITIAL_FUNDS, calculateNextTurn, EVENTS };
