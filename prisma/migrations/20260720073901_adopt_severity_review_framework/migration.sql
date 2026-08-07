/*
  Warnings:

  - You are about to drop the column `stake` on the `AiFlag` table. All the data in the column will be lost.
  - Added the required column `layer` to the `AiFlag` table without a default value. This is not possible if the table is not empty.
  - Added the required column `severity` to the `AiFlag` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FlagSeverity" AS ENUM ('CRITICAL', 'MAJOR', 'MINOR', 'SUGGESTION');

-- CreateEnum
CREATE TYPE "ReviewLayer" AS ENUM ('STUDENT_UNDERSTANDING', 'DEVELOPMENTAL_ASSESSMENT', 'GOAL_QUALITY', 'INTERVENTION_ALIGNMENT', 'OVERALL_CONSISTENCY');

-- CreateEnum
CREATE TYPE "LayerStatus" AS ENUM ('PASS', 'NEEDS_REVIEW', 'FAIL');

-- CreateEnum
CREATE TYPE "IepReadiness" AS ENUM ('READY', 'NEEDS_REVISION', 'HIGH_RISK_OF_OMISSION');

-- AlterTable
ALTER TABLE "AiFlag" DROP COLUMN "stake",
ADD COLUMN     "layer" "ReviewLayer" NOT NULL,
ADD COLUMN     "severity" "FlagSeverity" NOT NULL;

-- AlterTable
ALTER TABLE "Iep" ADD COLUMN     "overallReadiness" "IepReadiness";

-- DropEnum
DROP TYPE "FlagStake";

-- CreateTable
CREATE TABLE "ReviewLayerFinding" (
    "id" TEXT NOT NULL,
    "iepId" TEXT NOT NULL,
    "layer" "ReviewLayer" NOT NULL,
    "status" "LayerStatus" NOT NULL,
    "severity" "FlagSeverity",
    "evidenceNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewLayerFinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewLayerFinding_iepId_idx" ON "ReviewLayerFinding"("iepId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewLayerFinding_iepId_layer_key" ON "ReviewLayerFinding"("iepId", "layer");

-- CreateIndex
CREATE INDEX "AiFlag_iepId_layer_idx" ON "AiFlag"("iepId", "layer");

-- AddForeignKey
ALTER TABLE "ReviewLayerFinding" ADD CONSTRAINT "ReviewLayerFinding_iepId_fkey" FOREIGN KEY ("iepId") REFERENCES "Iep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
