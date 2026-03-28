/*
  Warnings:

  - A unique constraint covering the columns `[roomCode]` on the table `Game` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "roomCode" TEXT NOT NULL DEFAULT upper(substring(gen_random_uuid()::text from 1 for 6));

-- CreateIndex
CREATE UNIQUE INDEX "Game_roomCode_key" ON "Game"("roomCode");
