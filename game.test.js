import { jest } from '@jest/globals';
import { INITIAL_FUNDS, calculateNextTurn, EVENTS, ACHIEVEMENTS, UNLOCKABLES, analyzeInvestmentStyle } from './game.js';

describe('Global Capital Flow Game', () => {

    let balance;
    let allocations;
    let funds;
    let turn;

    beforeEach(() => {
        balance = 1000000;
        allocations = { A: 34, B: 33, C: 33, D: 0 };
        funds = JSON.parse(JSON.stringify(INITIAL_FUNDS));
        turn = 1;
    });

    test('should calculate next turn without errors and with fundDetails', () => {
        const result = calculateNextTurn(balance, allocations, funds, turn);
        expect(result).toBeDefined();
        expect(typeof result.newBalance).toBe('number');
        expect(typeof result.lastDiff).toBe('number');
        expect(result.turnLog).toBeInstanceOf(Array);
        expect(result.newFunds).toBeDefined();
        expect(result.fundDetails).toBeDefined();
        expect(Object.keys(result.fundDetails).length).toBe(4);
    });

    test('should generate a positive profit when conditions are favorable', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.9); // High random value for high returns

        const result = calculateNextTurn(balance, allocations, funds, turn);

        expect(result.newBalance).toBeGreaterThan(balance);
        expect(result.lastDiff).toBeGreaterThan(0);

        jest.spyOn(Math, 'random').mockRestore();
    });

    test('should generate a loss when conditions are unfavorable', () => {
        jest.spyOn(Math, 'random')
            .mockReturnValueOnce(0.1) // Fund A sign
            .mockReturnValueOnce(0.1) // Fund A value
            .mockReturnValueOnce(0.1) // Fund B
            .mockReturnValueOnce(0.1) // Fund C
            .mockReturnValueOnce(0.9) // Event trigger check

        const result = calculateNextTurn(balance, allocations, funds, turn);

        expect(result.newBalance).toBeLessThan(balance);
        expect(result.lastDiff).toBeLessThan(0);
        expect(result.randomEvent).toBeNull();

        jest.spyOn(Math, 'random').mockRestore();
    });

    test('should correctly calculate profit for Fund A (Stable)', () => {
        allocations = { A: 100, B: 0, C: 0 };
        jest.spyOn(Math, 'random')
            .mockReturnValueOnce(0.8) // for fluctuation calculation
            .mockReturnValueOnce(0.7); // for positive/negative sign (should be positive)

        const result = calculateNextTurn(balance, allocations, funds, turn);
        const fundA = funds.A;
        const range = fundA.fluctuation.max - fundA.fluctuation.min;
        const value = 0.8 * range + fundA.fluctuation.min;
        const expectedFluctuation = value; // since second mock is < 0.8
        const expectedReturn = (fundA.expectedReturn + expectedFluctuation) / 100;
        const expectedProfit = balance * expectedReturn;

        expect(result.lastDiff).toBeCloseTo(expectedProfit, 0);

        jest.spyOn(Math, 'random').mockRestore();
    });

    test('should correctly calculate profit for Fund B (Balanced)', () => {
        allocations = { A: 0, B: 100, C: 0 };
        jest.spyOn(Math, 'random').mockReturnValue(0.7);

        const result = calculateNextTurn(balance, allocations, funds, turn);
        const fundB = funds.B;
        const expectedFluctuation = (0.7 * fundB.fluctuation.max * 2) - fundB.fluctuation.max;
        const expectedReturn = (fundB.expectedReturn + expectedFluctuation) / 100;
        const expectedProfit = balance * expectedReturn;

        expect(result.lastDiff).toBeCloseTo(expectedProfit, 0);

        jest.spyOn(Math, 'random').mockRestore();
    });

    test('should correctly calculate profit for Fund C (Gambling)', () => {
        allocations = { A: 0, B: 0, C: 100 };
        jest.spyOn(Math, 'random').mockReturnValue(0.9);

        const result = calculateNextTurn(balance, allocations, funds, turn);
        const fundC = funds.C;
        const expectedFluctuation = fundC.fluctuation.min + (fundC.fluctuation.max - fundC.fluctuation.min) * 0.9;
        const expectedReturn = (fundC.expectedReturn + expectedFluctuation) / 100;
        const expectedProfit = balance * expectedReturn;

        expect(result.lastDiff).toBeCloseTo(expectedProfit, 0);

        jest.spyOn(Math, 'random').mockRestore();
    });

    test('should trigger and apply a random event', () => {
        const allocations = { A: 0, B: 0, C: 100, D: 0 };

        // --- Phase 1: Calculate the expected balance *before* the event ---
        const preEventMock = jest.spyOn(Math, 'random').mockReturnValue(0.5);
        const preEventResult = calculateNextTurn(balance, allocations, funds, turn);
        const balanceAfterTurn = preEventResult.newBalance;
        preEventMock.mockRestore();

        // --- Phase 2: Run the final calculation with a mock that triggers the event ---
        const finalMock = jest.spyOn(Math, 'random')
            .mockReturnValueOnce(0.5) // Fund C
            .mockReturnValueOnce(0.1) // Event trigger
            .mockReturnValueOnce(0.25) // Event selection
            .mockReturnValue(0.5);    // Event effect (e.g. for financial緩和)

        const finalResult = calculateNextTurn(balance, allocations, funds, turn);

        const investedInC = balanceAfterTurn;
        const expectedLoss = investedInC * 0.20;
        const expectedFinalBalance = balanceAfterTurn - expectedLoss;

        expect(finalResult.randomEvent).not.toBeNull();
        expect(finalResult.randomEvent.name).toBe("ITバブル崩壊");
        expect(finalResult.newBalance).toBe(Math.floor(expectedFinalBalance));
        expect(finalResult.turnLog.some(log => log.type === 'event')).toBe(true);

        finalMock.mockRestore();
    });

    test('should return correct fundDetails object', () => {
        allocations = { A: 50, B: 50, C: 0 };
        jest.spyOn(Math, 'random')
            .mockReturnValueOnce(0.5) // Fund A value
            .mockReturnValueOnce(0.7) // Fund A sign (<0.8 -> positive)
            .mockReturnValueOnce(0.8) // Fund B value
            .mockReturnValue(0.9);    // No event

        const result = calculateNextTurn(balance, allocations, funds, turn);

        const fundA = funds.A;
        const investedA = balance * 0.5;
        const rangeA = fundA.fluctuation.max - fundA.fluctuation.min;
        const valueA = 0.5 * rangeA + fundA.fluctuation.min;
        const expectedFluctuationA = valueA;
        const expectedReturnRateA = (fundA.expectedReturn + expectedFluctuationA);
        const expectedProfitA = investedA * (expectedReturnRateA / 100);

        const fundB = funds.B;
        const investedB = balance * 0.5;
        const expectedFluctuationB = (0.8 * fundB.fluctuation.max * 2) - fundB.fluctuation.max;
        const expectedReturnRateB = (fundB.expectedReturn + expectedFluctuationB);
        const expectedProfitB = investedB * (expectedReturnRateB / 100);


        expect(result.fundDetails).toBeDefined();
        expect(result.fundDetails.A.name).toBe('安定型');
        expect(result.fundDetails.A.profit).toBe(Math.floor(expectedProfitA));
        expect(result.fundDetails.A.returnRate).toBeCloseTo(expectedReturnRateA);

        expect(result.fundDetails.B.name).toBe('バランス型');
        expect(result.fundDetails.B.profit).toBe(Math.floor(expectedProfitB));
        expect(result.fundDetails.B.returnRate).toBeCloseTo(expectedReturnRateB);

        expect(result.fundDetails.C.profit).toBe(0);

        jest.spyOn(Math, 'random').mockRestore();
    });

    test('Event "Fund C Manager Change" should increase risk (lower min fluctuation)', () => {
        const event = EVENTS.find(e => e.name === "ファンドC担当者交代");
        expect(event).toBeDefined();

        const funds = JSON.parse(JSON.stringify(INITIAL_FUNDS));
        const balance = 1000000;
        const allocations = { A: 0, B: 0, C: 100, D: 0 };

        const result = event.effect(funds, balance, allocations);
        const newFunds = result.funds;

        // The event description says "High Risk", so the downside should be worse (lower min).
        // Original min is -30.
        // The bug sets it to -20 (safer).
        // We expect it to be more negative than -30.
        expect(newFunds.C.fluctuation.min).toBeLessThan(funds.C.fluctuation.min);
    });

    // --- Achievements and Unlocks Tests ---

    describe('Achievements and Unlocks', () => {
        test('should unlock "駆け出しファンドマネージャー" achievement when balance reaches 2,000,000', () => {
            const history = [
                { turn: 0, balance: 1000000 },
                { turn: 1, balance: 1500000 },
                { turn: 2, balance: 2100000 }
            ];
            const achievement = ACHIEVEMENTS['2_million_club'];
            expect(achievement.condition(history, {}, 3)).toBe(true);
        });

        test('should not unlock "駆け出しファンドマネージャー" if balance is below 2,000,000', () => {
            const history = [ { turn: 0, balance: 1000000 }, { turn: 1, balance: 1999999 }];
            const achievement = ACHIEVEMENTS['2_million_club'];
            expect(achievement.condition(history, {}, 2)).toBe(false);
        });

        test('should unlock "狂気の投資家" achievement for staying 100% in Fund C for 10 turns', () => {
            const allocations = { A: 0, B: 0, C: 100 };
            const achievement = ACHIEVEMENTS['insane_gambler'];
            const history = [];
            for (let i = 1; i <= 10; i++) {
                history.push({ turn: i, balance: 1000000, allocations: { A: 0, B: 0, C: 100 } });
            }
            expect(achievement.condition(history, allocations, 12)).toBe(true);
        });

        test('should not unlock "狂気の投資家" achievement when only 9 consecutive turns meet the condition', () => {
            const allocations = { A: 0, B: 0, C: 100 };
            const achievement = ACHIEVEMENTS['insane_gambler'];
            const history = [];
            for (let i = 1; i <= 9; i++) {
                history.push({ turn: i, balance: 1000000, allocations: { A: 0, B: 0, C: 100 } });
            }
            expect(achievement.condition(history, allocations, 11)).toBe(false);
        });

        test('should unlock "神タイミング" achievement after 10 turns without losses', () => {
            const history = [
                { turn: 0, balance: 1000000 },
                { turn: 1, balance: 1100000 },
                { turn: 2, balance: 1200000 },
                { turn: 3, balance: 1300000 },
                { turn: 4, balance: 1400000 },
                { turn: 5, balance: 1500000 },
                { turn: 6, balance: 1600000 },
                { turn: 7, balance: 1700000 },
                { turn: 8, balance: 1800000 },
                { turn: 9, balance: 1900000 },
                { turn: 10, balance: 2000000 },
            ];
            const achievement = ACHIEVEMENTS['perfect_game'];
            expect(achievement.condition(history, {}, 10)).toBe(true);
        });

        test('should unlock "神タイミング" in endless mode when conditions are met', () => {
            const endlessHistory = [
                { turn: 0, balance: 1000000 },
                { turn: 1, balance: 1050000 },
                { turn: 2, balance: 1100000 },
                { turn: 3, balance: 1150000 },
                { turn: 4, balance: 1200000 },
                { turn: 5, balance: 1250000 },
                { turn: 6, balance: 1300000 },
                { turn: 7, balance: 1350000 },
                { turn: 8, balance: 1400000 },
                { turn: 9, balance: 1450000 },
                { turn: 10, balance: 1500000 },
                { turn: 11, balance: 1550000 },
            ];
            const achievement = ACHIEVEMENTS['perfect_game'];
            expect(achievement.condition(endlessHistory, {}, 11, null)).toBe(true);
        });

         test('should not unlock "神タイミング" if there was a loss', () => {
            const historyWithLoss = [
                { turn: 0, balance: 1000000 },
                { turn: 1, balance: 1100000 },
                { turn: 2, balance: 1050000 }, // Loss here
                { turn: 3, balance: 1200000 },
            ];
             const achievement = ACHIEVEMENTS['perfect_game'];
            expect(achievement.condition(historyWithLoss, {}, 11)).toBe(false);
        });

        test('should unlock Fund D when final balance is 2,000,000 or more', () => {
            const unlockable = UNLOCKABLES['fund_d'];
            expect(unlockable.condition(2000000)).toBe(true);
            expect(unlockable.condition(2500000)).toBe(true);
        });

        test('should not unlock Fund D when final balance is less than 2,000,000', () => {
            const unlockable = UNLOCKABLES['fund_d'];
            expect(unlockable.condition(1999999)).toBe(false);
        });
    });

    // --- Investment Style Analysis Tests ---

    describe('Investment Style Analysis', () => {
        test('should identify "High-Risk, High-Return" style', () => {
            const history = [
                { turn: 0, balance: 1000000 },
                { turn: 1, balance: 1100000, allocations: { A: 10, B: 10, C: 80 } },
                { turn: 2, balance: 1200000, allocations: { A: 10, B: 20, C: 70 } },
            ];
            const analysis = analyzeInvestmentStyle(history);
            expect(analysis).toContain('ハイリスク・ハイリターン型');
        });

        test('should identify "Low-Volatility" style with Fund D', () => {
            const history = [
                { turn: 0, balance: 1000000 },
                { turn: 1, balance: 1050000, allocations: { A: 10, B: 10, C: 20, D: 60 } },
                { turn: 2, balance: 1100000, allocations: { A: 10, B: 10, C: 10, D: 70 } },
            ];
            const analysis = analyzeInvestmentStyle(history);
            expect(analysis).toContain('インデックス型ファンドを多め');
        });

        test('should identify "Steady" style', () => {
            const history = [
                { turn: 0, balance: 1000000 },
                { turn: 1, balance: 1020000, allocations: { A: 70, B: 20, C: 10 } },
                { turn: 2, balance: 1040000, allocations: { A: 80, B: 10, C: 10 } },
            ];
            const analysis = analyzeInvestmentStyle(history);
            expect(analysis).toContain('安定型ファンドを中心に');
        });

        test('should identify "Balanced" style for mixed allocations', () => {
            const history = [
                { turn: 0, balance: 1000000 },
                { turn: 1, balance: 1050000, allocations: { A: 34, B: 33, C: 33 } },
                { turn: 2, balance: 1100000, allocations: { A: 40, B: 40, C: 20 } },
            ];
            const analysis = analyzeInvestmentStyle(history);
            expect(analysis).toContain('バランス型');
        });

        test('should return a default message for insufficient data', () => {
            const history = [{ turn: 0, balance: 1000000 }];
            const analysis = analyzeInvestmentStyle(history);
            expect(analysis).toContain('データが不足');
        });

         test('should handle history with missing allocations', () => {
            const history = [
                { turn: 0, balance: 1000000 },
                { turn: 1, balance: 1100000, allocations: { A: 10, B: 10, C: 80 } },
                { turn: 2, balance: 1200000 }, // Missing allocations
            ];
            const analysis = analyzeInvestmentStyle(history);
             // It should analyze based on the valid entry
            expect(analysis).toContain('ハイリスク・ハイリターン型');
        });
    });
});
