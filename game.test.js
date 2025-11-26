import { jest } from '@jest/globals';
import { INITIAL_FUNDS, calculateNextTurn } from './game.js';

describe('Global Capital Flow Game', () => {

    let balance;
    let allocations;
    let funds;
    let turn;

    beforeEach(() => {
        balance = 1000000;
        allocations = { A: 34, B: 33, C: 33 };
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
        expect(Object.keys(result.fundDetails).length).toBe(3);
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
        const allocations = { A: 0, B: 0, C: 100 };

        // --- Phase 1: Calculate the expected balance *before* the event ---
        const preEventMock = jest.spyOn(Math, 'random').mockReturnValue(0.5);
        const preEventResult = calculateNextTurn(balance, allocations, funds, turn);
        const balanceAfterTurn = preEventResult.newBalance;
        preEventMock.mockRestore();

        // --- Phase 2: Run the final calculation with a mock that triggers the event ---
        const finalMock = jest.spyOn(Math, 'random')
            .mockReturnValueOnce(0.5) // Fund A sign
            .mockReturnValueOnce(0.5) // Fund A value
            .mockReturnValueOnce(0.5) // Fund B
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
});
