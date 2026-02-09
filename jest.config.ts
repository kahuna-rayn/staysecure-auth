import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/(src|test)/**/*.test.ts?(x)"],
  clearMocks: true,
  passWithNoTests: true
};

export default config;
