import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { createTraceId, createValidationEnvelope } from "../../shared/pvcu";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;

const pvcuValidation = t.middleware(async opts => {
  const traceId = typeof opts.ctx.req.headers["x-trace-id"] === "string" ? opts.ctx.req.headers["x-trace-id"] : createTraceId();
  const setEnvelope = (status: "PASSED" | "FAILED", codes: string[]) => {
    if (typeof opts.ctx.res.setHeader === "function") {
      opts.ctx.res.setHeader("X-Validation-Envelope", JSON.stringify(createValidationEnvelope(traceId, status, codes)));
    }
  };
  try {
    const result = await opts.next();
    setEnvelope(result.ok ? "PASSED" : "FAILED", result.ok ? [] : ["PVC-4xx"]);
    return result;
  } catch (error) {
    setEnvelope("FAILED", ["PVC-4xx"]);
    throw error;
  }
});

export const publicProcedure = t.procedure.use(pvcuValidation);

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireUser);

export const adminProcedure = publicProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
