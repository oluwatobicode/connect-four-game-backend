-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "roomCode" SET DEFAULT upper(substring(gen_random_uuid()::text from 1 for 6));
