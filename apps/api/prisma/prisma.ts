import { config } from "dotenv";
import { PrismaClient } from "./generated/client";
import { PrismaPg } from '@prisma/adapter-pg'

config();
const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter: pool })

export default prisma;
