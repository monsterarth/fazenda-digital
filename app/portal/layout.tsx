import { GuestProvider } from "@/context/GuestProvider";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GuestProvider>
        {children}
    </GuestProvider>
  );
}