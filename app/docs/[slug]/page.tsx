import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Doc } from "@/lib/docs";
import DocDetailClient from "./DocDetailClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getDoc(slug: string): Promise<Doc | null> {
  const { data } = await supabase
    .from("docs")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return (data as Doc | null) ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getDoc(slug);
  if (!doc) return { title: "Doc not found" };
  return {
    title: doc.title,
    description: doc.summary ?? undefined,
  };
}

export default async function DocDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = await getDoc(slug);
  if (!doc) notFound();
  return <DocDetailClient doc={doc} />;
}
