-- CreateTable
CREATE TABLE `exports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('APPOINTMENTS') NOT NULL,
    `status` ENUM('PENDING', 'DONE', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `params` JSON NOT NULL,
    `fileName` VARCHAR(191) NULL,
    `fileContent` LONGTEXT NULL,
    `error` VARCHAR(191) NULL,
    `requestedById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `exports` ADD CONSTRAINT `exports_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `staff`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
