import { jest } from '@jest/globals';
import { INITIAL_REGIONS, EVENTS, calculateNextTurn } from './game.js';

describe('Global Capital Flow Game', () => {

    let balance;
    let allocations;
    let regions;
    let turn;

    beforeEach(() => {
        balance = 1000000;
        allocations = { USA: 25, JPN: 25, EU: 25, EM: 25 };
        regions = JSON.parse(JSON.stringify(INITIAL_REGIONS));
        turn = 1;
    });

    test('should calculate next turn without errors', () => {
        const result = calculateNextTurn(balance, allocations, regions, turn);
        expect(result).toBeDefined();
        expect(typeof result.newBalance).toBe('number');
        expect(typeof result.lastDiff).toBe('number');
        expect(result.turnLog).toBeInstanceOf(Array);
        expect(result.randomEvent).toBeDefined();
        expect(result.newRegions).toBeDefined();
    });

    test('should generate a positive profit when conditions are favorable', () => {
        const favorableRegions = JSON.parse(JSON.stringify(INITIAL_REGIONS));
        favorableRegions.USA.growth = 5;
        favorableRegions.EM.growth = 10;

        jest.spyOn(Math, 'random').mockReturnValue(0.9); // Prevents risk events and gives positive adjustments

        const result = calculateNextTurn(balance, allocations, favorableRegions, turn);

        expect(result.newBalance).toBeGreaterThan(balance);
        expect(result.lastDiff).toBeGreaterThan(0);

        jest.spyOn(Math, 'random').mockRestore();
    });

    test('should generate a loss when conditions are unfavorable', () => {
        const unfavorableRegions = JSON.parse(JSON.stringify(INITIAL_REGIONS));
        unfavorableRegions.USA.growth = -5;
        unfavorableRegions.EU.interest = -2;

        jest.spyOn(Math, 'random').mockReturnValue(0.1); // Ensures low random adjustments, contributing to a loss

        const result = calculateNextTurn(balance, allocations, unfavorableRegions, turn);

        expect(result.newBalance).toBeLessThan(balance);
        expect(result.lastDiff).toBeLessThan(0);

        jest.spyOn(Math, 'random').mockRestore();
    });

    test('should trigger a risk event when random roll is below risk factor', () => {
        const highRiskRegions = JSON.parse(JSON.stringify(INITIAL_REGIONS));
        highRiskRegions.EM.risk = 10;

        jest.spyOn(Math, 'random').mockReturnValue(0.1);

        const result = calculateNextTurn(balance, allocations, highRiskRegions, turn);

        expect(result.turnLog.some(log => log.type === 'risk')).toBe(true);

        jest.spyOn(Math, 'random').mockRestore();
    });

    test('should not trigger a risk event when random roll is above risk factor', () => {
        const lowRiskRegions = JSON.parse(JSON.stringify(INITIAL_REGIONS));
        lowRiskRegions.USA.risk = 1;

        jest.spyOn(Math, 'random').mockReturnValue(0.9);

        const result = calculateNextTurn(balance, allocations, lowRiskRegions, turn);

        expect(result.turnLog.every(log => log.type !== 'risk')).toBe(true);

        jest.spyOn(Math, 'random').mockRestore();
    });

    test('should apply random event effects to regions', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0); // Selects the first event and ensures predictable outcomes

        const result = calculateNextTurn(balance, allocations, regions, turn);

        const firstEvent = EVENTS[0];
        const affectedRegionId = Object.keys(firstEvent.effect)[0];
        const initialRegionState = INITIAL_REGIONS[affectedRegionId];
        const newRegionState = result.newRegions[affectedRegionId];
        const effect = firstEvent.effect[affectedRegionId];

        const randomAdjustment = (0 - 0.5) * 0.5;
        const expectedInterest = initialRegionState.interest + (effect.interest || 0) + randomAdjustment;
        const expectedGrowth = initialRegionState.growth + (effect.growth || 0) + randomAdjustment;
        const expectedRisk = initialRegionState.risk + (effect.risk || 0);

        expect(newRegionState.interest).toBeCloseTo(expectedInterest, 1);
        expect(newRegionState.growth).toBeCloseTo(expectedGrowth, 1);
        expect(newRegionState.risk).toBeCloseTo(expectedRisk, 1);

        jest.spyOn(Math, 'random').mockRestore();
    });

    test('should clamp region attributes within defined limits', () => {
        // Test risk clamping (upper bound)
        const highRiskRegions = JSON.parse(JSON.stringify(INITIAL_REGIONS));
        highRiskRegions.EM.risk = 9; // Set initial risk high
        jest.spyOn(Math, 'random').mockReturnValue(0.2); // Selects event index 1 (Geopolitical Risk)
        const result_upper = calculateNextTurn(balance, allocations, highRiskRegions, turn);
        expect(result_upper.newRegions.EM.risk).toBe(10); // Risk should be clamped to 10
        jest.spyOn(Math, 'random').mockRestore();

        // Test risk clamping (lower bound)
        const lowRiskRegions = JSON.parse(JSON.stringify(INITIAL_REGIONS));
        lowRiskRegions.EM.risk = 0.5; // Set initial risk low
        jest.spyOn(Math, 'random').mockReturnValue(0.4); // Selects event index 2 (Tech Boom)
        const result_lower = calculateNextTurn(balance, allocations, lowRiskRegions, turn);
        expect(result_lower.newRegions.EM.risk).toBe(0); // Risk should be clamped to 0
        jest.spyOn(Math, 'random').mockRestore();
    });
});
