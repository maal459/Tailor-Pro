-- CreateTable
CREATE TABLE `ExpenseCategory` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(36) NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ExpenseCategory_tenantId_name_key`(`tenantId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Expense` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(36) NULL,
    `title` VARCHAR(150) NOT NULL,
    `categoryId` VARCHAR(191) NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `expenseDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paymentMethodId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Expense_tenantId_expenseDate_idx`(`tenantId`, `expenseDate`),
    INDEX `Expense_tenantId_title_idx`(`tenantId`, `title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Employee` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(36) NULL,
    `fullName` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(30) NULL,
    `position` VARCHAR(120) NULL,
    `monthlySalary` DECIMAL(12, 2) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Employee_tenantId_fullName_idx`(`tenantId`, `fullName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Salary` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(36) NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `paymentDate` DATETIME(3) NOT NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Salary_tenantId_paymentDate_idx`(`tenantId`, `paymentDate`),
    INDEX `Salary_tenantId_employeeId_idx`(`tenantId`, `employeeId`),
    INDEX `Salary_tenantId_month_year_idx`(`tenantId`, `month`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Supplier` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(36) NULL,
    `supplierName` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(30) NULL,
    `email` VARCHAR(190) NULL,
    `address` VARCHAR(255) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Supplier_tenantId_supplierName_idx`(`tenantId`, `supplierName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductCategory` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(36) NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProductCategory_tenantId_name_key`(`tenantId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(36) NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NULL,
    `name` VARCHAR(150) NOT NULL,
    `sku` VARCHAR(80) NOT NULL,
    `costPrice` DECIMAL(12, 2) NOT NULL,
    `sellingPrice` DECIMAL(12, 2) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `minimumStock` INTEGER NOT NULL DEFAULT 5,
    `imageUrl` VARCHAR(255) NULL,
    `unit` VARCHAR(30) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Product_sku_key`(`sku`),
    INDEX `Product_tenantId_name_idx`(`tenantId`, `name`),
    INDEX `Product_tenantId_quantity_idx`(`tenantId`, `quantity`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Purchase` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(36) NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `invoiceNo` VARCHAR(80) NULL,
    `purchaseDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `total` DECIMAL(12, 2) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Purchase_tenantId_purchaseDate_idx`(`tenantId`, `purchaseDate`),
    INDEX `Purchase_tenantId_supplierId_idx`(`tenantId`, `supplierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseItem` (
    `id` VARCHAR(191) NOT NULL,
    `purchaseId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitCost` DECIMAL(12, 2) NOT NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL,

    INDEX `PurchaseItem_purchaseId_idx`(`purchaseId`),
    INDEX `PurchaseItem_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `ExpenseCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_paymentMethodId_fkey` FOREIGN KEY (`paymentMethodId`) REFERENCES `PaymentMethod`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Salary` ADD CONSTRAINT `Salary_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `ProductCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseItem` ADD CONSTRAINT `PurchaseItem_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `Purchase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseItem` ADD CONSTRAINT `PurchaseItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
