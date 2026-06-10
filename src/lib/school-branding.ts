import { prisma } from "@/lib/db/client";
import type { Session } from "@/lib/session";

export interface SchoolBranding {
  schoolId: string;
  name: string;
  brandName: string | null;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  accentColor: string | null;
}

/** Fetch school branding for the logged-in user. Returns null for private/no-school users. */
export async function getSchoolBranding(session: Session): Promise<SchoolBranding | null> {
  if (!session.schoolId) return null;
  const school = await prisma.school.findUnique({
    where: { id: session.schoolId },
    select: {
      id: true,
      name: true,
      brandName: true,
      logoUrl: true,
      logoDarkUrl: true,
      faviconUrl: true,
      accentColor: true,
    },
  });
  if (!school) return null;
  return {
    schoolId: school.id,
    name: school.name,
    brandName: school.brandName,
    logoUrl: school.logoUrl,
    logoDarkUrl: school.logoDarkUrl,
    faviconUrl: school.faviconUrl,
    accentColor: school.accentColor,
  };
}
