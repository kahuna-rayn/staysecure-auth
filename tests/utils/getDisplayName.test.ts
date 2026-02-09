import { getDisplayName } from '../../src/utils/getDisplayName'

jest.mock("../../src/utils/debugLog", () => ({
    debugLog: jest.fn()
}));

const setPath = (pathname: string) => {
    window.history.pushState({}, "", pathname);
}

describe('getDisplayName', () => {
    beforeEach(() => {
        // Reset global config before each test
        (window as any).__CLIENT_CONFIGS__ = undefined;
        jest.clearAllMocks();
    });

    it("returns null if __CLIENT_CONFIGS__ is not set", () => {
        setPath("/forgot-password");
        expect(getDisplayName()).toBeNull();
    });

});
