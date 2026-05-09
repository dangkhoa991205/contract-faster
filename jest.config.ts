import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|geist|next/dist/client|next/dist/shared/lib|next/src/client|next/src/shared/lib|next-auth|@auth)/).*',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
}

export default createJestConfig(config)
