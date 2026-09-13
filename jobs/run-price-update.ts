import 'dotenv/config'
import { runPriceUpdateAndExit } from './price-update'

const limit = process.argv[2] ? Number(process.argv[2]) : undefined
const simulate = (process.argv[3] as 'none' | 'random' | 'drop' | 'rise' | undefined) ?? 'random'

runPriceUpdateAndExit({ limit, triggeredBy: 'cli', simulateChange: simulate })
