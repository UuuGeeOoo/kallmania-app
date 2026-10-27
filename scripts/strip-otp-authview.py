#!/usr/bin/env python3
"""Task 13: strip the OTP stages out of auth-view.tsx (register + forgot flows)."""
import re, sys

P = "/home/z/my-project/src/components/kallmania/auth-view.tsx"
s = open(P, encoding="utf-8").read()
orig = s

def cut(s, start_anchor, end_anchor, replacement, keep_end=True):
    """Replace text from start_anchor (inclusive) to end_anchor (exclusive) with replacement."""
    i = s.index(start_anchor)
    j = s.index(end_anchor, i)
    return s[:i] + replacement + (s[j:] if keep_end else "")

# 1) doRegister is already rewritten; skip to the FORGOT block
forg_anchor = "  // ── FORGOT — step 1:"
s = s  # register part already applied by the earlier MultiEdit

# 2) FORGOT block: from the step-1 banner to the masked/heading line → simplified two-step
new_forgot = '''  // ── FORGOT — step 1: identify the account ──────────────
  const forgotEmailSubmit = async () => {
    resetTransient();
    setLoading(true);
    try {
      const res = await api<{ success: boolean; message: string }>("/api/auth", {
        method: "POST",
        body: JSON.stringify({ action: "forgotPassword", email: form.email }),
      });
      setSuccess(res.message);
      setForgotStage("password");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // ── FORGOT — step 2: set the new password ────────────────
  const doReset = async () => {
    resetTransient();
    setLoading(true);
    try {
      const res = await api<{ success: boolean; message: string }>("/api/auth", {
        method: "POST",
        body: JSON.stringify({ action: "resetPassword", email: form.email, newPassword }),
      });
      setSuccess(res.message);
      setForgotStage("done");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

'''
masked_anchor = "  const masked = challenge?.maskedEmail || form.email;"
s = cut(s, forg_anchor, masked_anchor, new_forgot)

# 3) heading: drop masked + otp branches
new_heading = '''  const heading =
    mode === "login"
      ? { title: "Login", sub: "See your growth and get consulting support!" }
      : mode === "register"
        ? regStage === "form"
          ? { title: "Create your account", sub: "Choose where you fall in under Kallmania — SBTS Group Global. An administrator will confirm your login and position." }
          : { title: "Account created", sub: "Your account is set up and waiting for administrator confirmation." }
        : forgotStage === "email"
          ? { title: "Forgot password", sub: "Enter your account email to choose a new password." }
          : forgotStage === "password"
            ? { title: "Set a new password", sub: `Choose a new password for ${form.email}.` }
            : { title: "Password updated", sub: "You can now sign in with your new password." };

'''
busy_anchor = "  const busy = loading;"
s = cut(s, masked_anchor, busy_anchor, new_heading)

# 4) remove REGISTER — OTP verification JSX block
s = cut(s, "            {/* ══ REGISTER — OTP verification ══ */}", "            {/* ══ REGISTER — verified ══ */}", "")

# 5) register done panel copy (no email verification anymore)
s = s.replace(
    '                  "Your email has been verified and administrators have been notified.",',
    '                  "Your details have been submitted and administrators have been notified.",'
)

# 6) remove FORGOT — OTP JSX block
s = cut(s, "            {/* ══ FORGOT — OTP ══ */}", "            {/* ══ FORGOT — new password ══ */}", "")

# 7) forgot email stage button: Continue (no code is sent)
s = s.replace(
    '''              <Button onClick={forgotEmailSubmit} disabled={busy} className="k-btn-primary h-11 w-full rounded-full text-sm font-semibold">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
                Send reset code
              </Button>''',
    '''              <Button onClick={forgotEmailSubmit} disabled={busy} className="k-btn-primary h-11 w-full rounded-full text-sm font-semibold">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Continue
              </Button>'''
)

# 8) forgot back-link: only on the email stage now (no otp stage)
s = s.replace(
    '{mode === "forgot" && (forgotStage === "email" || forgotStage === "otp") && (',
    '{mode === "forgot" && forgotStage === "email" && ('
)

open(P, "w", encoding="utf-8").write(s)
print("OK, changed:", s != orig, "| lines:", len(s.splitlines()))
