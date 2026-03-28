-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "boardState" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "currentTurn" TEXT NOT NULL DEFAULT 'player1',
ADD COLUMN     "totalMoves" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "roomCode" SET DEFAULT upper(substring(gen_random_uuid()::text from 1 for 6));
