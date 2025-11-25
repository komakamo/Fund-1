const INITIAL_REGIONS = {
    USA: { id: 'USA', name: '米国', interest: 5.0, risk: 2, growth: 2.5, description: '世界の基軸通貨。高金利だがインフレ懸念あり。', color: 'blue' },
    JPN: { id: 'JPN', name: '日本', interest: 0.1, risk: 1, growth: 1.0, description: '安全資産。超低金利で調達通貨になりやすい。', color: 'red' },
    EU:  { id: 'EU',  name: '欧州', interest: 3.5, risk: 3, growth: 1.5, description: '安定しているが、加盟国間の格差がリスク。', color: 'indigo' },
    EM:  { id: 'EM',  name: '新興国', interest: 8.0, risk: 8, growth: 5.0, description: '高金利・高成長だが、政治不安や暴落リスク高。', color: 'amber' }
};

const EVENTS = [
    {
        title: "米FRBが利上げを発表",
        desc: "インフレ抑制のため米国が金利を引き上げました。ドル高が予想されます。",
        effect: { USA: { interest: 1.0, growth: -0.2 }, EM: { risk: 2 } },
        type: "positive",
        icon: "TrendingUp"
    },
    {
        title: "地政学的リスクの上昇",
        desc: "紛争懸念により投資家心理が悪化。「有事の円買い」が発生しそうです。",
        effect: { JPN: { growth: 0.1 }, USA: { risk: 1 }, EU: { risk: 2 }, EM: { risk: 4 } },
        type: "negative",
        icon: "AlertTriangle"
    },
    {
        title: "新興国で技術革新ブーム",
        desc: "新興国の成長率が大幅に予想を上回りました。リスクマネーが流入します。",
        effect: { EM: { growth: 2.0, risk: -1 } },
        type: "positive",
        icon: "Activity"
    },
    {
        title: "日銀が金融緩和を維持",
        desc: "日本は低金利を維持。円キャリートレード（円で借りて他国へ投資）が活発化。",
        effect: { JPN: { interest: 0 }, USA: { growth: 0.1 }, EM: { growth: 0.2 } },
        type: "neutral",
        icon: "Landmark"
    },
    {
        title: "欧州で債務懸念",
        desc: "一部の国で財政不安。ユーロからの資本逃避が起きる可能性があります。",
        effect: { EU: { interest: 0.5, risk: 3, growth: -0.5 } },
        type: "negative",
        icon: "ShieldAlert"
    },
    {
        title: "世界的な原油価格の高騰",
        desc: "エネルギーコスト増により、先進国の成長が鈍化する懸念があります。",
        effect: { USA: { growth: -0.3 }, EU: { growth: -0.4 }, JPN: { growth: -0.2 } },
        type: "negative",
        icon: "TrendingDown"
    }
];

function calculateNextTurn(balance, allocations, regions, turn) {
    let turnProfit = 0;
    let turnLog = [];

    Object.keys(regions).forEach(key => {
        const region = regions[key];
        const investedAmount = balance * (allocations[key] / 100);

        let rateOfReturn = (region.interest + region.growth) / 100;

        const roll = Math.random() * 10;
        if (roll < region.risk) {
            const damage = (Math.random() * 0.15 + 0.05);
            rateOfReturn -= damage;
            turnLog.push({ type: 'risk', text: `${region.name}市場でショック発生！資産価値が${(damage * 100).toFixed(1)}%下落。`, turn: turn });
        }

        const profit = investedAmount * rateOfReturn;
        turnProfit += profit;
    });

    const newBalance = Math.floor(balance + turnProfit);
    const lastDiff = Math.floor(turnProfit);

    const randomEvent = EVENTS[Math.floor(Math.random() * EVENTS.length)];

    const newRegions = JSON.parse(JSON.stringify(regions));

    Object.keys(newRegions).forEach(k => {
        newRegions[k].interest = Math.max(0, newRegions[k].interest + (Math.random() - 0.5) * 0.5);
        newRegions[k].growth = newRegions[k].growth + (Math.random() - 0.5) * 0.5;

        if(newRegions[k].risk > INITIAL_REGIONS[k].risk) newRegions[k].risk -= 0.2;
        if(newRegions[k].risk < INITIAL_REGIONS[k].risk) newRegions[k].risk += 0.2;
    });

    if (randomEvent.effect) {
        Object.keys(randomEvent.effect).forEach(regionId => {
            const effects = randomEvent.effect[regionId];
            if (newRegions[regionId]) {
                if (effects.interest) newRegions[regionId].interest += effects.interest;
                if (effects.growth) newRegions[regionId].growth += effects.growth;
                if (effects.risk) newRegions[regionId].risk += effects.risk;

                newRegions[regionId].risk = Math.max(0, Math.min(10, newRegions[regionId].risk));
                newRegions[regionId].interest = Math.max(-1, newRegions[regionId].interest);
            }
        });
    }

    return {
        newBalance,
        lastDiff,
        turnLog,
        randomEvent,
        newRegions
    }

}

export { INITIAL_REGIONS, EVENTS, calculateNextTurn };
