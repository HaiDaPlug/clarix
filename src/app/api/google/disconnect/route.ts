import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  source: z.enum(["ga4", "gsc"]),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { type: "validation", message: "Invalid disconnect payload." } },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return NextResponse.json(
      { error: { type: "auth", message: "You must be signed in." } },
      { status: 401 },
    );
  }

  const { error } = await supabase
    .from("connected_sources")
    .delete()
    .eq("user_id", session.user.id)
    .eq("source", parsed.data.source);

  if (error) {
    return NextResponse.json(
      {
        error: {
          type: "database",
          message: "Could not disconnect this source.",
        },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
