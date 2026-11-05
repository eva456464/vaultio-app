"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { InstructionField } from "@/db/schema";
import { getAppContext } from "../context";
import { dismissUnsupported, editRule, InstructionsTooLongError, MAX_RULES_TEXT, removeRule, reviseInstructions, type InstructionResult } from "../instructions";

type Failure = { error: "tooLong" | "failed" | "empty"; max?: number };

async function requireAdminSite() {
  const context = await getAppContext();
  if (!context?.site || context.member?.role !== "admin") throw new Error("Only workspace admins can change settings");
  return context.site;
}

const fieldSchema = z.enum(["writing", "images"]);
const refresh = () => revalidatePath("/[locale]/dashboard", "layout");

function failure(error: unknown): Failure {
  if (error instanceof InstructionsTooLongError) return { error: "tooLong", max: MAX_RULES_TEXT };
  console.error("[instructions]", error);
  return { error: "failed" };
}

/** Settings → Writing / Visuals "Add": the request is reviewed and turned into rules (and setting changes). */
export async function addInstruction(field: InstructionField, text: string): Promise<{ ok: true; result: InstructionResult } | Failure> {
  const site = await requireAdminSite();
  const value = text.trim().slice(0, 2000);
  if (!value) return { error: "empty" };
  try {
    const result = await reviseInstructions(site, fieldSchema.parse(field), value, "edit");
    refresh();
    return { ok: true, result };
  } catch (error) {
    return failure(error);
  }
}

export async function editInstructionRule(field: InstructionField, index: number, text: string): Promise<{ ok: true } | Failure> {
  const site = await requireAdminSite();
  try {
    await editRule(site, fieldSchema.parse(field), z.number().int().min(0).parse(index), text);
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function removeInstructionRule(field: InstructionField, index: number): Promise<{ ok: true } | Failure> {
  const site = await requireAdminSite();
  try {
    await removeRule(site, fieldSchema.parse(field), z.number().int().min(0).parse(index));
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function dismissInstructionUnsupported(index: number) {
  const site = await requireAdminSite();
  await dismissUnsupported(site, z.number().int().min(0).parse(index));
  refresh();
}
