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
        delete (window as any).__CLIENT_CONFIGS__;
        jest.clearAllMocks();
    });

    it("returns null if __CLIENT_CONFIGS__ is not set", () => {
        setPath("/login");
        expect(getDisplayName()).toBeNull();
    });

    it("does not treat auth routes as clientId - falls back to default", () => {
        (window as any).__CLIENT_CONFIGS__ = {
            default: { displayName: "default"},
            login: { displayName: "should not be used"}
        };

        setPath("/login");
        expect(getDisplayName()).toBe("default");
    });

    it("treats first path segment as clientId when it is not an auth route", () => {
        (window as any).__CLIENT_CONFIGS__ = {
            default: { displayName: "default"},
            nexus: { displayName: "nexus"}
        };

        setPath("/nexus/login");
        expect(getDisplayName()).toBe("nexus")
    })

    it("returns null if __CLIENT_CONFIGS__ exists but has no displayname", () => {
        (window as any).__CLIENT_CONFIGS__ = {
            default: {}
        };

        setPath("/login");
        expect(getDisplayName()).toBeNull();
    });
    
    it("returns null if error occurs and silently fails", () => {
        
        Object.defineProperty(window, "__CLIENT_CONFIGS__", {
            configurable: true,
            get() {
                throw new Error("error");
            }
        });

        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        setPath("/login")
        expect(getDisplayName()).toBeNull();
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
        delete (window as any).__CLIENT_CONFIGS__;
    })

});
