-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Blank" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "id_account" INTEGER NOT NULL DEFAULT 1,
    "token" TEXT NOT NULL DEFAULT 'zero',
    CONSTRAINT "Blank_id_account_fkey" FOREIGN KEY ("id_account") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Blank" ("id", "id_account", "name") SELECT "id", "id_account", "name" FROM "Blank";
DROP TABLE "Blank";
ALTER TABLE "new_Blank" RENAME TO "Blank";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
