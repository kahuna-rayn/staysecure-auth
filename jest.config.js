/** @type {import('jest').Config} */
export default {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  testEnvironmentOptions: {
    url: "https://app.test.com/",
  },
  testMatch: ["<rootDir>/(src|tests)/**/*.test.ts?(x)"],
  clearMocks: true,
  passWithNoTests: true,  
  /**
  coverageThreshold: { // initial baseline threshold
    global: {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70
    }
  } */
};
