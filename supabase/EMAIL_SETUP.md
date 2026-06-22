# Supabase email branding (Assetcues)

Configure in **Supabase Dashboard** → your project → **Authentication** → **Email Templates**.

Also set **Authentication** → **URL Configuration**:
- **Site URL:** your Vercel frontend (e.g. `https://your-app.vercel.app`)
- **Redirect URLs:** add `https://your-app.vercel.app/auth/callback` and `https://your-app.vercel.app/reset-password`

---

## 1. Sender name (optional — custom SMTP)

Default emails come from Supabase (`noreply@mail.app.supabase.io`).

For **Assetcues** as sender name and your domain:

1. **Project Settings** → **Authentication** → **SMTP Settings**
2. Enable custom SMTP (e.g. Gmail workspace, SendGrid, AWS SES, Resend)
3. Set:
   - **Sender email:** `support@assetcues.com` (your domain)
   - **Sender name:** `Assetcues Support`

---

## 2. Confirm signup template

**Subject:**
```
Confirm your Assetcues Support account
```

**Body (HTML):**
```html
<h2>Welcome to Assetcues Support</h2>
<p>Hi,</p>
<p>Thanks for signing up for the Assetcues SLA Support Console. Please confirm your email to activate your account.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm my account</a></p>
<p>If you did not create this account, you can ignore this email.</p>
<p>— Assetcues Solution Pvt. Ltd.<br/>Support Team</p>
```

---

## 3. Reset password template

**Subject:**
```
Reset your Assetcues Support password
```

**Body (HTML):**
```html
<h2>Password reset</h2>
<p>We received a request to reset the password for your Assetcues Support account.</p>
<p><a href="{{ .ConfirmationURL }}">Reset password</a></p>
<p>This link expires soon. If you did not request a reset, ignore this email.</p>
<p>— Assetcues Support</p>
```

---

## 4. Magic link / Invite (if used)

**Subject:** `Sign in to Assetcues Support`  
Use the same footer and replace the button text with “Sign in to Assetcues”.

---

## Template variables (Supabase)

| Variable | Use |
|----------|-----|
| `{{ .ConfirmationURL }}` | Confirm email / reset link |
| `{{ .SiteURL }}` | Your app base URL |
| `{{ .Email }}` | User email |
| `{{ .Token }}` | OTP code (if using OTP emails) |

---

## Notes

- Google OAuth is **removed** from the app; sign up uses email + password only.
- New users can register from the **Sign up** tab on the login page (email confirmation required).
- After changing templates, send a test from **Authentication** → **Users** → invite or reset password.
