import { describe,it,expect,vi,afterEach } from "vitest";
import { secondsRemaining,clock,api } from "./memory";
afterEach(()=>vi.unstubAllGlobals());
describe("deadline timer",()=>{
  it("recovers elapsed time after reload/backgrounding",()=>{
    const deadline="2026-01-01T10:15:00Z";
    expect(secondsRemaining(deadline,Date.parse("2026-01-01T10:00:00Z"))).toBe(900);
    expect(secondsRemaining(deadline,Date.parse("2026-01-01T10:12:35Z"))).toBe(145);
    expect(secondsRemaining(deadline,Date.parse("2026-01-01T11:00:00Z"))).toBe(0);
    expect(clock(145)).toBe("02:25");
  });
});
it("surfaces API errors without treating an unsaved capture as saved",async()=>{
 vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:false,json:async()=>({detail:"Source does not match the session"})}));
 await expect(api("/vocabulary",{text:"yield"})).rejects.toThrow("Source does not match");
});
