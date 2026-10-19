-- CreateTable
CREATE TABLE `OnlineOrder` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(36) NOT NULL,
    `orderNumber` VARCHAR(40) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `customerName` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `email` VARCHAR(190) NULL,
    `address` VARCHAR(255) NULL,
    `notes` TEXT NULL,
    `status` ENUM('NEW', 'CONFIRMED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'NEW',
    `total` DECIMAL(12, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `OnlineOrder_orderNumber_key`(`orderNumber`),
    INDEX `OnlineOrder_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
    INDEX `OnlineOrder_tenantId_status_idx`(`tenantId`, `status`),
    INDEX `OnlineOrder_tenantId_phone_idx`(`tenantId`, `phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OnlineOrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(36) NOT NULL,
    `onlineOrderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `productName` VARCHAR(150) NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL,

    INDEX `OnlineOrderItem_tenantId_onlineOrderId_idx`(`tenantId`, `onlineOrderId`),
    INDEX `OnlineOrderItem_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OnlineOrder` ADD CONSTRAINT `OnlineOrder_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OnlineOrder` ADD CONSTRAINT `OnlineOrder_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OnlineOrderItem` ADD CONSTRAINT `OnlineOrderItem_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OnlineOrderItem` ADD CONSTRAINT `OnlineOrderItem_onlineOrderId_fkey` FOREIGN KEY (`onlineOrderId`) REFERENCES `OnlineOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OnlineOrderItem` ADD CONSTRAINT `OnlineOrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

