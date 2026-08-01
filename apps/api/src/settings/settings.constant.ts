// Flat top-level route, same "one string, one place" convention every
// other module follows.
export const SETTINGS_ROUTE = 'settings';

// The one `Setting.key` this module writes today — tenant branding
// (company name/address/logo) used on quotation letterheads. A plain
// string constant, not an enum: `Setting` is a generic key-value store
// (schema.prisma's own comment), so there's no fixed "SettingKey" domain
// type to enumerate — this is just the one key this module's own service
// happens to read/write.
export const BRANDING_SETTING_KEY = 'branding';
