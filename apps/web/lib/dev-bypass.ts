export const DEV_SUPERADMIN_BYPASS_COOKIE = "terroiros_dev_superadmin";

export function isDevSuperadminBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_SUPERADMIN_BYPASS === "true"
  );
}

export function expectedDevSuperadminBypassToken(): string {
  const configured = process.env.DEV_SUPERADMIN_BYPASS_TOKEN?.trim();
  return configured || "dev-superadmin";
}

export function isValidDevSuperadminBypassCookie(
  value: string | undefined
): boolean {
  if (!value) {
    return false;
  }
  return value === expectedDevSuperadminBypassToken();
}
