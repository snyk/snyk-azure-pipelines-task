module.exports = {
    "roots": [
        "<rootDir>/src"
    ],
    "transform": {
        "^.+\\.tsx?$": "ts-jest"
    },
    "testPathIgnorePatterns": [
        "/node_modules/",
        "src/__tests__/_test-mock-config-*"
    ]
}
