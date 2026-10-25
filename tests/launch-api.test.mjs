import test from "node:test";
import assert from "node:assert/strict";
import { launchParams, requestLaunch, minimumGraduationThreshold } from "../app/lib/launch-api.ts";
const form = () => {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    coinName: "Example & Coin",
    ticker: "test",
    totalSupply: "1000000000",
    graduationThreshold: "10.123456789012345678",
    purchase: "0",
    description: "A coin + a company",
  }))
    f.set(k, v);
  return f;
};
test("maps fields, preserves decimal precision, encodes text, and omits a zero first buy", () => {
  const q = launchParams(form(), 2, 1, [40, 20, 20, 20], "BNB");
  assert.equal(q.get("name"), "Example & Coin");
  assert.equal(
    new URLSearchParams(q.toString()).get("description"),
    "A coin + a company",
  );
  assert.equal(q.get("symbol"), "TEST");
  assert.equal(q.get("buyFeeBps"), "200");
  assert.equal(q.get("holdersBps"), "2000");
  assert.equal(q.get("quoteToken"), "native");
  assert.equal(q.get("graduationThreshold"), "10.123456789012345678");
  assert.equal(q.has("firstBuyAmount"), false);
});
test("maps ERC20 address, sender, and positive first buy", () => {
  const f = form();
  const address = "0x" + "1".repeat(40);
  f.set("quoteToken", address);
  f.set("from", address);
  f.set("purchase", "1.5");
  const q = launchParams(f, 1, 1, [40, 20, 20, 20], "ERC20");
  assert.equal(q.get("quoteToken"), address);
  assert.equal(q.get("from"), address);
  assert.equal(q.get("firstBuyAmount"), "1.5");
});
test("rejects invalid allocation, missing amounts, invalid token and sender", () => {
  assert.throws(
    () => launchParams(form(), 1, 1, [40, 20, 20, 10], "BNB"),
    /100%/,
  );
  const f = form();
  f.set("graduationThreshold", "0");
  assert.throws(
    () => launchParams(f, 1, 1, [40, 20, 20, 20], "BNB"),
    /positive/,
  );
  assert.throws(
    () => launchParams(form(), 1, 1, [40, 20, 20, 20], "ERC20"),
    /contract address/,
  );
  const g = form();
  g.set("from", "bad");
  assert.throws(
    () => launchParams(g, 1, 1, [40, 20, 20, 20], "BNB"),
    /wallet address/,
  );
});
test("surfaces backend errors and rejects malformed success responses", async () => {
  const original = global.fetch;
  try {
    global.fetch = async () =>
      Response.json({ message: "Token not allowed" }, { status: 400 });
    await assert.rejects(
      () => requestLaunch(new URLSearchParams()),
      /Token not allowed/,
    );
    global.fetch = async () => Response.json({ chainId: 97 });
    await assert.rejects(
      () => requestLaunch(new URLSearchParams()),
      /incomplete/,
    );
  } finally {
    global.fetch = original;
  }
});

test("sends the supplied total supply and rejects invalid amounts", () => {
  const f = form();
  f.set("totalSupply", "123.456");
  assert.equal(launchParams(f, 1, 1, [40, 20, 20, 20], "BNB").get("totalSupply"), "123.456");
  for (const invalid of ["", "0", "-1", "1e9", "1.0000000000000000001"]) {
    f.set("totalSupply", invalid);
    assert.throws(() => launchParams(f, 1, 1, [40, 20, 20, 20], "BNB"), /Total supply/);
  }
});
test("minimum follows on-chain price and curve allocation with exact precision", () => {
  assert.equal(minimumGraduationThreshold("1000000000", 10000000000000n), "8000");
  assert.equal(minimumGraduationThreshold("1000000", 10000000000000n), "8");
  assert.equal(minimumGraduationThreshold("1000000", 20000000000000n), "16");
  assert.equal(minimumGraduationThreshold("1.123456789012345678", 1000000000000000000n), "0.898765431209876542");
  assert.equal(minimumGraduationThreshold("", 1n), null);
  assert.equal(minimumGraduationThreshold("0", 1n), null);
});

test("allows the one billion cap and rejects even one smallest unit above it", () => {
  const f = form();
  assert.equal(launchParams(f, 1, 1, [40, 20, 20, 20], "BNB").get("totalSupply"), "1000000000");
  for (const supply of ["1000000001", "1000000000.000000000000000001"]) {
    f.set("totalSupply", supply);
    assert.throws(() => launchParams(f, 1, 1, [40, 20, 20, 20], "BNB"), /cannot exceed 1 billion/);
  }
});
