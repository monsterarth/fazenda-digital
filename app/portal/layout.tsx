import GuestPortalClientLayout from "./portal-client-layout";

export default function GuestPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <GuestPortalClientLayout>{children}</GuestPortalClientLayout>;
}