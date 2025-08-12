/*
  Warnings:

  - You are about to drop the column `notesToCouple` on the `Guest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Guest" DROP COLUMN "notesToCouple",
ADD COLUMN     "dietaryRestrictions" TEXT;

-- CreateTable
CREATE TABLE "public"."Nickname" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nickname_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Nickname_nickname_guestId_key" ON "public"."Nickname"("nickname", "guestId");

-- AddForeignKey
ALTER TABLE "public"."Nickname" ADD CONSTRAINT "Nickname_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "public"."Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
