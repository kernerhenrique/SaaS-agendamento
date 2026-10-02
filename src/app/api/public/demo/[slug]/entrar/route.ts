import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { handleApiError, rateLimitedResponse } from "@/server/http";
import { issueTokens } from "@/server/modules/auth/auth.service";
import { setAuthCookies } from "@/server/modules/auth/cookies";
import { getDemoOwner } from "@/server/modules/demo/demo.service";

const DEMO_LOGIN_RATE_LIMIT = { limit: 30, windowMs: 5 * 60 * 1000 };

/**
 * Botão "Ver o painel da demonstração" (formulário na página pública da demo):
 * entra sem senha como o dono visitante — só de negócio `isDemo` ativo; para
 * qualquer outro slug responde 404, como se não existisse. Redireciona ao painel.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const rateLimit = checkRateLimit(`demo-login:${getClientIp(request.headers)}`, DEMO_LOGIN_RATE_LIMIT);
  if (!rateLimit.allowed) return rateLimitedResponse(rateLimit.retryAfterSeconds);
  try {
    const { slug } = await params;
    const owner = await getDemoOwner(slug);
    if (!owner) return NextResponse.json({ error: "Demonstração não encontrada" }, { status: 404 });

    // 303: o navegador segue com GET para o painel depois do POST do formulário.
    const response = NextResponse.redirect(new URL("/admin", request.url), 303);
    setAuthCookies(response, await issueTokens(owner));
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
