-- AlterTable
ALTER TABLE "public"."Table" ADD COLUMN     "displayNumber" INTEGER,
ADD COLUMN     "posX" DOUBLE PRECISION,
ADD COLUMN     "posY" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "public"."Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);
