-- AlterTable
ALTER TABLE "completed_games" ADD COLUMN "player_x" TEXT;
ALTER TABLE "completed_games" ADD COLUMN "player_o" TEXT;

-- CreateIndex
CREATE INDEX "completed_games_player_x_idx" ON "completed_games"("player_x");

-- CreateIndex
CREATE INDEX "completed_games_player_o_idx" ON "completed_games"("player_o");
