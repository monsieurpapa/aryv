import { afterEach, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { configRouter } from "./config.js";

function app() {
  const a = express();
  a.use("/api/config", configRouter);
  return a;
}

describe("GET /api/config", () => {
  const original = process.env.WHATSAPP_PHONE;
  afterEach(() => {
    if (original === undefined) delete process.env.WHATSAPP_PHONE;
    else process.env.WHATSAPP_PHONE = original;
  });

  it("renvoie le numéro WhatsApp configuré", async () => {
    process.env.WHATSAPP_PHONE = "+243991234567";
    const res = await request(app()).get("/api/config");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ whatsappPhone: "+243991234567" });
  });

  it("renvoie null si WHATSAPP_PHONE n'est pas configuré", async () => {
    delete process.env.WHATSAPP_PHONE;
    const res = await request(app()).get("/api/config");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ whatsappPhone: null });
  });
});
