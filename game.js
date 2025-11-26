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

    const newBalance = Math.floor(balance + turnProfit);
    const lastDiff = Math.floor(turnProfit);

    // Events are removed for now.
    const randomEvent = null;
    const newFunds = JSON.parse(JSON.stringify(funds));


    return {
        newBalance,
        lastDiff,
        turnLog,
        randomEvent,
        newFunds
    }
}

const CRAFTING_RECIPES = [
    { id: 'unlock_A', name: 'Unlock Advanced Fund A', description: 'Unlocks a new, more advanced version of Fund A.', cost: 1200000 },
    { id: 'unlock_B', name: 'Unlock Advanced Fund B', description: 'Unlocks a new, more advanced version of Fund B.', cost: 1500000 },
    { id: 'analyst_report', name: 'Purchase Analyst Report', description: 'Get a tip for the next turn.', cost: 50000 },
];

export { INITIAL_FUNDS, calculateNextTurn, CRAFTING_RECIPES };
