"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ActionCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  isComingSoon?: boolean;
  children?: React.ReactNode;
}

export function ActionCard({ href, icon, title, description, isComingSoon = false, children }: ActionCardProps) {
  const cardContent = (
    <div className={cn("flex flex-col h-full", isComingSoon ? "opacity-50" : "")}>
      <CardHeader className="flex flex-row items-center gap-4 pb-4">
        <div className="bg-primary/10 p-3 rounded-lg text-primary">
          {icon}
        </div>
        <div className="flex-1">
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        {isComingSoon && <Badge variant="outline">Em Breve</Badge>}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        <CardDescription className="mb-4">{description}</CardDescription>
        <div>{children}</div>
      </CardContent>
    </div>
  );

  if (isComingSoon || !href) {
    return (
      <Card className="hover:shadow-md transition-shadow cursor-not-allowed">
        {cardContent}
      </Card>
    );
  }

  return (
    <Link href={href} passHref>
      <Card className="hover:shadow-lg hover:border-primary/50 transition-all h-full">
        {cardContent}
      </Card>
    </Link>
  );
}