CREATE TABLE `asset_identifiers` (
	`tenant` text NOT NULL,
	`id` text NOT NULL,
	`asset_id` text NOT NULL,
	`identifier_type` text NOT NULL,
	`visible_code` text NOT NULL,
	`electronic_code` text,
	`placement` text NOT NULL,
	`attached_at` text NOT NULL,
	`status` text NOT NULL,
	`retired_at` text,
	`note` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`tenant`, `id`)
);
--> statement-breakpoint
CREATE INDEX `asset_identifiers_asset` ON `asset_identifiers` (`tenant`,`asset_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `asset_identifiers_visible_code` ON `asset_identifiers` (`tenant`,`visible_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `asset_identifiers_electronic_code` ON `asset_identifiers` (`tenant`,`electronic_code`);