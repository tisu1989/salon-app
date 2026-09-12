-- AlterTable
ALTER TABLE `notification_logs` ADD COLUMN `attempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `lastAttemptAt` DATETIME(3) NULL;
