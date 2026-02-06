import { PrismaClient } from "./generated/client";
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new PrismaPg({ connectionString: process.env.DB_URL! })
const prisma = new PrismaClient({ adapter: pool })

export default prisma;
